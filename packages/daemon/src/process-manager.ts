import { execa, type ResultPromise } from 'execa';
import { join } from 'node:path';
import {
  type Member,
  type GlobalConfig,
  readConfig,
  writeConfig,
  MEMBERS_JSON,
} from '@agentcorp/shared';

export type AgentProcessStatus = 'starting' | 'ready' | 'stopped' | 'crashed';

export interface AgentProcess {
  memberId: string;
  displayName: string;
  port: number;
  status: AgentProcessStatus;
  gatewayToken: string;
  process: ResultPromise | null;
}

export class ProcessManager {
  private agents = new Map<string, AgentProcess>();
  private nextPort: number;
  private portMax: number;
  private corpRoot: string;
  private openclawBinary: string;

  constructor(corpRoot: string, globalConfig: GlobalConfig) {
    this.corpRoot = corpRoot;
    this.nextPort = globalConfig.daemon.portRange[0];
    this.portMax = globalConfig.daemon.portRange[1];
    this.openclawBinary = 'openclaw';
  }

  private allocatePort(): number {
    const usedPorts = new Set([...this.agents.values()].map((a) => a.port));
    let port = this.nextPort;
    while (usedPorts.has(port) && port <= this.portMax) {
      port++;
    }
    if (port > this.portMax) {
      throw new Error(`No available ports in range ${this.nextPort}-${this.portMax}`);
    }
    this.nextPort = port + 1;
    return port;
  }

  async spawnAgent(memberId: string, gatewayToken?: string): Promise<AgentProcess> {
    if (this.agents.has(memberId)) {
      const existing = this.agents.get(memberId)!;
      if (existing.status === 'ready' || existing.status === 'starting') {
        return existing;
      }
    }

    // Read member info
    const members = readConfig<Member[]>(join(this.corpRoot, MEMBERS_JSON));
    const member = members.find((m) => m.id === memberId);
    if (!member) throw new Error(`Member ${memberId} not found`);
    if (member.type !== 'agent') throw new Error(`Member ${memberId} is not an agent`);
    if (!member.agentDir) throw new Error(`Member ${memberId} has no agentDir`);

    const agentAbsDir = join(this.corpRoot, member.agentDir);
    const openclawStateDir = join(agentAbsDir, '.openclaw');
    const port = this.allocatePort();

    // Read gateway token from openclaw config if not provided
    if (!gatewayToken) {
      const openclawConfig = readConfig<{ gateway: { auth: { token: string } } }>(
        join(openclawStateDir, 'openclaw.json'),
      );
      gatewayToken = openclawConfig.gateway.auth.token;
    }

    const agentProc: AgentProcess = {
      memberId,
      displayName: member.displayName,
      port,
      status: 'starting',
      gatewayToken,
      process: null,
    };

    this.agents.set(memberId, agentProc);

    // Spawn OpenClaw gateway
    const proc = execa(this.openclawBinary, [
      'gateway', 'run',
      '--port', String(port),
      '--bind', 'loopback',
      '--allow-unconfigured',
    ], {
      env: {
        ...process.env,
        OPENCLAW_STATE_DIR: openclawStateDir,
      },
      stdio: 'pipe',
      reject: false,
    });

    agentProc.process = proc;

    // Update member port in members.json
    this.updateMemberPort(memberId, port);

    // Health check
    this.waitForReady(agentProc).catch(() => {
      agentProc.status = 'crashed';
    });

    // Handle process exit
    proc.then((result) => {
      if (agentProc.status !== 'stopped') {
        agentProc.status = 'crashed';
        console.error(`[daemon] Agent ${member.displayName} exited with code ${result.exitCode}`);
      }
      agentProc.process = null;
      this.updateMemberPort(memberId, null);
    }).catch(() => {
      agentProc.status = 'crashed';
      agentProc.process = null;
    });

    return agentProc;
  }

  private async waitForReady(agent: AgentProcess): Promise<void> {
    const maxAttempts = 30;
    const interval = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const resp = await fetch(`http://127.0.0.1:${agent.port}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${agent.gatewayToken}`,
          },
          body: JSON.stringify({
            model: 'openclaw:main',
            messages: [],
          }),
          signal: AbortSignal.timeout(2000),
        });
        // Any response means the server is up (even 400 for empty messages)
        if (resp.status < 500) {
          agent.status = 'ready';
          console.log(`[daemon] Agent ${agent.displayName} ready on port ${agent.port}`);
          return;
        }
      } catch {
        // Not ready yet
      }
      await new Promise((r) => setTimeout(r, interval));
    }

    throw new Error(`Agent ${agent.displayName} failed to start within ${maxAttempts}s`);
  }

  async stopAgent(memberId: string): Promise<void> {
    const agent = this.agents.get(memberId);
    if (!agent) return;

    agent.status = 'stopped';
    if (agent.process) {
      agent.process.kill('SIGTERM');
      // Wait up to 5s for graceful shutdown
      const timeout = setTimeout(() => {
        if (agent.process) agent.process.kill('SIGKILL');
      }, 5000);
      try {
        await agent.process;
      } catch {
        // Expected
      }
      clearTimeout(timeout);
    }

    this.agents.delete(memberId);
    this.updateMemberPort(memberId, null);
  }

  getAgent(memberId: string): AgentProcess | undefined {
    return this.agents.get(memberId);
  }

  listAgents(): AgentProcess[] {
    return [...this.agents.values()];
  }

  async stopAll(): Promise<void> {
    const ids = [...this.agents.keys()];
    await Promise.all(ids.map((id) => this.stopAgent(id)));
  }

  private updateMemberPort(memberId: string, port: number | null): void {
    try {
      const membersPath = join(this.corpRoot, MEMBERS_JSON);
      const members = readConfig<Member[]>(membersPath);
      const member = members.find((m) => m.id === memberId);
      if (member) {
        member.port = port;
        member.status = port ? 'active' : 'idle';
        writeConfig(membersPath, members);
      }
    } catch {
      // Non-fatal
    }
  }
}
