import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { COLORS, BORDER_STYLE } from '../theme.js';
import { useCorp } from '../context/corp-context.js';

interface Commit {
  hash: string;
  message: string;
  date: string;
}

interface Props {
  onBack: () => void;
}

export function TimeMachine({ onBack }: Props) {
  const { daemonClient } = useCorp();
  const { stdout } = useStdout();
  const termHeight = stdout?.rows ?? 30;

  const [commits, setCommits] = useState<Commit[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [canForward, setCanForward] = useState(false);

  // Load git log
  const loadLog = async () => {
    setLoading(true);
    try {
      const log = await daemonClient.getGitLog(50);
      setCommits(log);
    } catch {
      setCommits([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLog();
  }, []);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setCursor((i) => Math.max(0, i - 1));
    }
    if (key.downArrow || input === 'j') {
      setCursor((i) => Math.min(commits.length - 1, i + 1));
    }

    // Enter — rewind to selected commit
    if (key.return && commits[cursor]) {
      const hash = commits[cursor]!.hash;
      setStatus('Rewinding...');
      daemonClient.rewindTo(hash).then(({ result }) => {
        setStatus(result);
        setCanForward(true);
        loadLog();
      }).catch(() => {
        setStatus('Rewind failed');
      });
    }

    // F — forward (undo rewind)
    if ((input === 'f' || input === 'F') && canForward) {
      setStatus('Forwarding...');
      daemonClient.forward().then(({ result }) => {
        setStatus(result);
        setCanForward(false);
        loadLog();
      }).catch(() => {
        setStatus('Forward failed');
      });
    }

    // R — refresh log
    if (input === 'r' || input === 'R') {
      loadLog();
    }
  });

  const visibleCount = Math.max(termHeight - 10, 5);
  let startIdx = 0;
  if (cursor >= visibleCount) {
    startIdx = cursor - visibleCount + 1;
  }
  const visibleCommits = commits.slice(startIdx, startIdx + visibleCount);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box
        borderStyle={BORDER_STYLE}
        borderColor={COLORS.primary}
        paddingX={1}
        justifyContent="space-between"
      >
        <Text color={COLORS.primary} bold>
          {'\u23F0'} Time Machine
        </Text>
        <Text color={COLORS.subtle}>
          {commits.length} snapshots
        </Text>
      </Box>

      {loading ? (
        <Box paddingX={2} paddingY={1}>
          <Spinner type="dots" />
          <Text color={COLORS.subtle}> Loading timeline...</Text>
        </Box>
      ) : commits.length === 0 ? (
        <Box paddingX={2} paddingY={1}>
          <Text color={COLORS.muted}>No snapshots yet.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          {visibleCommits.map((c, i) => {
            const actualIdx = startIdx + i;
            const selected = actualIdx === cursor;
            const hash = c.hash.substring(0, 7);
            const time = new Date(c.date).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const isRewind = c.message.startsWith('Revert');

            return (
              <Box key={c.hash} gap={1}>
                <Text color={selected ? COLORS.primary : COLORS.muted}>
                  {selected ? '\u25B8' : ' '}
                </Text>
                <Text color={selected ? COLORS.secondary : COLORS.muted}>
                  {hash}
                </Text>
                <Text color={COLORS.subtle}>{time}</Text>
                <Text
                  color={
                    selected
                      ? COLORS.text
                      : isRewind
                        ? COLORS.warning
                        : COLORS.subtle
                  }
                  bold={selected}
                  wrap="truncate"
                >
                  {c.message}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {status && (
        <Box paddingX={1}>
          <Text color={status.includes('Rewound') ? COLORS.warning : status.includes('Forwarded') ? COLORS.success : COLORS.info}>
            {status}
          </Text>
        </Box>
      )}

      <Box
        borderStyle={BORDER_STYLE}
        borderColor={COLORS.border}
        paddingX={1}
        justifyContent="space-between"
      >
        <Text color={COLORS.muted}>
          Enter:rewind{canForward ? '  F:forward' : ''}  R:refresh  Esc:back
        </Text>
        <Text color={COLORS.muted}>
          {cursor + 1}/{commits.length}
        </Text>
      </Box>
    </Box>
  );
}
