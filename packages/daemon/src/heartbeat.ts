import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import {
  type Member,
  readConfig,
  listTasks,
  MEMBERS_JSON,
} from '@agentcorp/shared';
import type { Daemon } from './daemon.js';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // Refresh HEARTBEAT.md every 5 minutes
const STALE_ASSIGNED_MS = 10 * 60 * 1000;
const STALE_IN_PROGRESS_MS = 2 * 60 * 60 * 1000;

/**
 * Periodically regenerates HEARTBEAT.md for each agent with fresh task data.
 * OpenClaw's native heartbeat handles the actual wake-up and prompt —
 * we just keep the file current so agents have accurate task info.
 */
export class HeartbeatManager {
  private daemon: Daemon;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(daemon: Daemon) {
    this.daemon = daemon;
  }

  start(): void {
    // Write initial HEARTBEAT.md files immediately
    this.refresh();

    // Then refresh every 5 minutes
    this.interval = setInterval(() => {
      this.refresh();
    }, REFRESH_INTERVAL_MS);

    console.log('[heartbeat] HEARTBEAT.md refresh started (every 5m)');
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
  }

  /** Refresh HEARTBEAT.md for all active agents with current task data. */
  private refresh(): void {
    try {
      const members = readConfig<Member[]>(join(this.daemon.corpRoot, MEMBERS_JSON));
      const allTasks = listTasks(this.daemon.corpRoot);
      const agents = members.filter((m) => m.type === 'agent' && m.agentDir);
      const now = new Date();

      for (const agent of agents) {
        const myTasks = allTasks.filter((t) => t.task.assignedTo === agent.id);
        const unassigned = allTasks.filter(
          (t) => !t.task.assignedTo && t.task.status === 'pending',
        );

        const content = this.buildHeartbeatMd(agent, myTasks, unassigned, now);

        try {
          const agentDir = join(this.daemon.corpRoot, agent.agentDir!);
          writeFileSync(join(agentDir, 'HEARTBEAT.md'), content, 'utf-8');
        } catch {
          // Agent dir might not exist
        }
      }
    } catch (err) {
      console.error('[heartbeat] Refresh failed:', err);
    }
  }

  private buildHeartbeatMd(
    agent: Member,
    myTasks: { task: { id: string; title: string; status: string; priority: string; updatedAt: string }; body: string }[],
    unassigned: { task: { id: string; title: string; status: string; priority: string }; body: string }[],
    now: Date,
  ): string {
    const timestamp = now.toISOString();
    const corpRoot = this.daemon.corpRoot.replace(/\\/g, '/');
    const lines: string[] = [`# Heartbeat — ${timestamp}`, ''];

    // My tasks
    lines.push('## Your Tasks', '');
    if (myTasks.length === 0) {
      lines.push('No tasks assigned to you.', '');
    } else {
      for (const t of myTasks) {
        let note = '';
        const updatedAt = new Date(t.task.updatedAt);
        const age = now.getTime() - updatedAt.getTime();
        if (t.task.status === 'assigned' && age > STALE_ASSIGNED_MS) {
          note = ' ⚠️ STALE — start working on this!';
        } else if (t.task.status === 'in_progress' && age > STALE_IN_PROGRESS_MS) {
          note = ' ⚠️ STALE — update or complete this!';
        }
        lines.push(`- [${t.task.id}] ${t.task.title} (${t.task.priority.toUpperCase()}, ${t.task.status})${note}`);
        lines.push(`  File: ${corpRoot}/tasks/${t.task.id}.md`);
      }
      lines.push('');
    }

    // Unassigned tasks
    if (unassigned.length > 0) {
      lines.push('### Unassigned (available to claim)', '');
      for (const t of unassigned) {
        lines.push(`- [${t.task.id}] ${t.task.title} (${t.task.priority.toUpperCase()}, pending)`);
      }
      lines.push('');
    }

    // Instructions
    lines.push('## What to do', '');
    lines.push('1. Work on your highest-priority assigned task.');
    lines.push(`2. To update a task: edit the YAML frontmatter in ${corpRoot}/tasks/<id>.md`);
    lines.push('3. Change status: assigned → in_progress → completed');
    lines.push('4. Append progress notes to the ## Progress Notes section.');
    lines.push('5. If blocked, set status to blocked and explain in progress notes.');
    lines.push('6. If nothing to do, reply HEARTBEAT_OK.');
    lines.push('');

    return lines.join('\n');
  }
}
