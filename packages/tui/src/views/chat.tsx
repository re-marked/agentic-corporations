import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import type { Channel, Member } from '@agentcorp/shared';
import { MessageList } from '../components/message-list.js';
import { MessageInput } from '../components/message-input.js';
import { useMessages } from '../hooks/use-messages.js';
import type { DaemonClient } from '../lib/daemon-client.js';

const THINKING_TIMEOUT_MS = 30_000;

interface Props {
  channel: Channel;
  members: Member[];
  messagesPath: string;
  daemonClient: DaemonClient;
  onSwitchChannel?: () => void;
}

export function ChatView({ channel, members, messagesPath, daemonClient, onSwitchChannel }: Props) {
  const messages = useMessages(messagesPath);
  const [sending, setSending] = useState(false);
  const [thinkingSince, setThinkingSince] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const lastMsg = messages[messages.length - 1];
  const founder = members.find((m) => m.rank === 'owner');
  const lastIsFromUser = lastMsg && founder && lastMsg.senderId === founder.id;

  // Track when we start waiting for a response
  const prevLastMsgId = useRef<string | null>(null);
  useEffect(() => {
    if (lastMsg && lastMsg.id !== prevLastMsgId.current) {
      prevLastMsgId.current = lastMsg.id;
      if (lastIsFromUser) {
        setThinkingSince(Date.now());
        setTimedOut(false);
      } else {
        setThinkingSince(null);
        setTimedOut(false);
      }
    }
  }, [lastMsg?.id, lastIsFromUser]);

  // Timeout the spinner
  useEffect(() => {
    if (!thinkingSince) return;
    const timer = setTimeout(() => setTimedOut(true), THINKING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [thinkingSince]);

  const showSpinner = lastIsFromUser && thinkingSince && !timedOut && !sending;

  useInput((input, key) => {
    if (key.ctrl && input === 'k') {
      onSwitchChannel?.();
    }
  });

  const handleSend = useCallback(async (text: string) => {
    setSending(true);
    try {
      await daemonClient.sendMessage(channel.id, text);
    } catch (err) {
      // Message send failed
    }
    setSending(false);
  }, [channel.id, daemonClient]);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box borderStyle="single" borderColor="blue" paddingX={1}>
        <Text bold color="blue"># {channel.name}</Text>
        <Text dimColor>  Ctrl+K to switch</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        <MessageList messages={messages} members={members} />
        {showSpinner && (
          <Box gap={1} marginTop={1}>
            <Text color="cyan"><Spinner type="dots" /></Text>
            <Text dimColor>Thinking...</Text>
          </Box>
        )}
      </Box>
      <MessageInput
        onSend={handleSend}
        disabled={sending}
        placeholder="Type a message..."
      />
    </Box>
  );
}
