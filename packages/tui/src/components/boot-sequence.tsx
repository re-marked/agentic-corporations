import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

const LOGO = [
  '   ▄████▄   ▄█        ▄████▄   █    ██ ▓█████▄ ▓█████ ',
  '  ▒██▀ ▀█  ██▒       ▒██▀ ▀█   ██  ▓██▒▒██▀ ██▌▓█   ▀ ',
  '  ▒▓█    ▄▓██░       ▒▓█    ▄ ▓██  ▒██░░██   █▌▒███   ',
  '  ▒▓▓▄ ▄██▒██░       ▒▓▓▄ ▄██▒▓▓█  ░██░░▓█▄   ▌▒▓█  ▄ ',
  '  ▒ ▓███▀ ░██████▒   ▒ ▓███▀ ░▒▒█████▓ ░▒████▓ ░▒████▒',
  '  ░ ░▒ ▒  ░ ▒░▓  ░   ░ ░▒ ▒  ░░▒▓▒ ▒ ▒  ▒▒▓  ▒ ░░ ▒░ ░',
  '                     C O R P',
];

const PHASES = [
  { text: 'igniting core', icon: '◉' },
  { text: 'loading identity', icon: '◉' },
  { text: 'spawning agents', icon: '◉' },
  { text: 'connecting synapses', icon: '◉' },
  { text: 'corp online', icon: '●' },
];

// Particle field — random dots that float up
function useParticles(width: number, height: number, active: boolean) {
  const [particles, setParticles] = useState<{ x: number; y: number; char: string; color: string }[]>([]);

  useEffect(() => {
    if (!active) return;
    const chars = ['·', '∙', '°', '⋅', '⁘'];
    const colors = ['#3A3A3A', '#4A4A4A', '#5A5A5A', '#6BAED6', '#E07B56'];

    const interval = setInterval(() => {
      setParticles(prev => {
        // Move existing particles up, remove off-screen
        const moved = prev
          .map(p => ({ ...p, y: p.y - 1 }))
          .filter(p => p.y >= 0);

        // Spawn new particles at bottom
        if (Math.random() > 0.4) {
          moved.push({
            x: Math.floor(Math.random() * width),
            y: height - 1,
            char: chars[Math.floor(Math.random() * chars.length)]!,
            color: colors[Math.floor(Math.random() * colors.length)]!,
          });
        }

        return moved.slice(-30); // Cap particle count
      });
    }, 120);

    return () => clearInterval(interval);
  }, [width, height, active]);

  return particles;
}

interface Props {
  onComplete: () => void;
}

export function BootSequence({ onComplete }: Props) {
  const [phase, setPhase] = useState(-1); // -1 = logo reveal
  const [logoChars, setLogoChars] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const cols = process.stdout.columns ?? 80;
  const rows = process.stdout.rows ?? 24;

  const particles = useParticles(cols, Math.min(rows, 20), phase >= 0);

  // Phase -1: Logo character reveal
  useEffect(() => {
    if (phase !== -1) return;
    const totalChars = LOGO.join('').length;
    let count = 0;
    const timer = setInterval(() => {
      count += 3;
      setLogoChars(count);
      if (count >= totalChars) {
        clearInterval(timer);
        setTimeout(() => setPhase(0), 400);
      }
    }, 15);
    return () => clearInterval(timer);
  }, [phase]);

  // Phases 0-3: progress steps
  useEffect(() => {
    if (phase < 0 || phase >= PHASES.length - 1) return;
    const duration = [600, 500, 700, 400][phase] ?? 500;
    const timer = setTimeout(() => setPhase(p => p + 1), duration);
    return () => clearTimeout(timer);
  }, [phase]);

  // Progress bar animation
  useEffect(() => {
    if (phase < 0) return;
    const target = phase >= PHASES.length - 1 ? 30 : Math.floor((phase + 1) / PHASES.length * 30);
    const timer = setInterval(() => {
      setBarWidth(prev => {
        if (prev >= target) { clearInterval(timer); return prev; }
        return prev + 1;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [phase]);

  // Final phase: complete
  useEffect(() => {
    if (phase !== PHASES.length - 1) return;
    // Fill bar to full then complete
    const fillTimer = setInterval(() => {
      setBarWidth(prev => {
        if (prev >= 30) { clearInterval(fillTimer); return prev; }
        return prev + 1;
      });
    }, 30);
    const doneTimer = setTimeout(onComplete, 1200);
    return () => { clearInterval(fillTimer); clearTimeout(doneTimer); };
  }, [phase]);

  // Pulse animation for the active phase icon
  useEffect(() => {
    const timer = setInterval(() => setPulse(p => (p + 1) % 4), 200);
    return () => clearInterval(timer);
  }, []);

  // Render the logo with character reveal
  const renderLogo = () => {
    let charsSoFar = 0;
    return LOGO.map((line, i) => {
      const lineStart = charsSoFar;
      charsSoFar += line.length;
      const visible = Math.max(0, Math.min(line.length, logoChars - lineStart));

      if (i === LOGO.length - 1) {
        // "C O R P" line — special color
        return (
          <Text key={i} color="#6BAED6">{line.slice(0, visible)}</Text>
        );
      }

      return (
        <Text key={i} color="#E07B56">{line.slice(0, visible)}</Text>
      );
    });
  };

  // Render particle field behind everything
  const renderParticles = () => {
    if (particles.length === 0) return null;
    // Build a sparse grid
    const grid = new Map<string, { char: string; color: string }>();
    for (const p of particles) {
      grid.set(`${p.x},${p.y}`, { char: p.char, color: p.color });
    }
    // Only render rows that have particles
    const renderedRows: React.ReactNode[] = [];
    const usedRows = new Set(particles.map(p => p.y));
    for (const y of [...usedRows].sort((a, b) => a - b)) {
      let line = '';
      const spans: React.ReactNode[] = [];
      for (let x = 0; x < Math.min(cols, 60); x++) {
        const p = grid.get(`${x},${y}`);
        if (p) {
          if (line) { spans.push(<Text key={`s${x}`} color="#2A2A2A">{line}</Text>); line = ''; }
          spans.push(<Text key={`p${x}`} color={p.color}>{p.char}</Text>);
        } else {
          line += ' ';
        }
      }
      renderedRows.push(<Text key={`r${y}`}>{spans}</Text>);
    }
    return <>{renderedRows}</>;
  };

  const pulseChars = ['◯', '◎', '◉', '◎'];
  const progressFilled = '━'.repeat(barWidth);
  const progressEmpty = '─'.repeat(Math.max(0, 30 - barWidth));
  const allDone = phase >= PHASES.length - 1;

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      {/* Particle field */}
      <Box flexDirection="column" position="absolute" marginTop={0}>
        {renderParticles()}
      </Box>

      {/* Logo */}
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        {renderLogo()}
      </Box>

      {/* Progress bar */}
      {phase >= 0 && (
        <Box marginTop={1}>
          <Text color="#3A3A3A">[</Text>
          <Text color={allDone ? '#6CC490' : '#E07B56'}>{progressFilled}</Text>
          <Text color="#2A2A2A">{progressEmpty}</Text>
          <Text color="#3A3A3A">]</Text>
        </Box>
      )}

      {/* Phase steps */}
      {phase >= 0 && (
        <Box flexDirection="column" alignItems="center" marginTop={1}>
          {PHASES.map((p, i) => {
            const done = i < phase;
            const active = i === phase && !allDone;
            if (!done && !active) return null;
            return (
              <Box key={i} gap={1}>
                <Text color={done ? '#6CC490' : '#6BAED6'}>
                  {done ? '●' : pulseChars[pulse]!}
                </Text>
                <Text color={done ? '#9E9E9E' : '#E2E2E2'}>
                  {p.text}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

/** Parse --boot flag — now ignored, boot always shows */
export function getBootStyle(): 'default' | null {
  // Always show boot sequence
  return 'default';
}
