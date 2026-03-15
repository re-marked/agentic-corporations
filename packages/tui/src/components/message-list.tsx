import React from 'react';
import { Box, Text } from 'ink';
import type { ChannelMessage, Member } from '@agentcorp/shared';

interface Props {
  messages: ChannelMessage[];
  members: Member[];
}

const RAINBOW = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'] as const;

function RainbowText({ children }: { children: string }) {
  return (
    <Text bold>
      {children.split('').map((char, i) => (
        <Text key={i} color={RAINBOW[i % RAINBOW.length]}>{char}</Text>
      ))}
    </Text>
  );
}

/** Split message content into plain text and @mention segments. */
function renderContent(content: string, members: Map<string, Member>) {
  const parts: React.ReactNode[] = [];
  const mentionRegex = /@"([^"]+)"|@(\S+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Text before the mention
    if (match.index > lastIndex) {
      parts.push(<Text key={`t${lastIndex}`} wrap="wrap">{content.slice(lastIndex, match.index)}</Text>);
    }

    const mentionName = match[1] ?? match[2]!;
    const mentionedMember = [...members.values()].find(
      (m) => m.displayName.toLowerCase() === mentionName.toLowerCase(),
    );
    const isCeo = mentionedMember?.rank === 'master';

    if (isCeo) {
      parts.push(<RainbowText key={`m${match.index}`}>@{mentionName}</RainbowText>);
    } else {
      parts.push(<Text key={`m${match.index}`} bold color="yellow">@{mentionName}</Text>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    parts.push(<Text key={`t${lastIndex}`} wrap="wrap">{content.slice(lastIndex)}</Text>);
  }

  return parts.length > 0 ? parts : <Text wrap="wrap">{content}</Text>;
}

export function MessageList({ messages, members }: Props) {
  const memberMap = new Map(members.map((m) => [m.id, m]));

  return (
    <Box flexDirection="column" flexGrow={1}>
      {messages.map((msg) => {
        const sender = memberMap.get(msg.senderId);
        const name = sender?.displayName ?? 'system';
        const time = new Date(msg.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const isAgent = sender?.type === 'agent';
        const isCeo = sender?.rank === 'master';

        return (
          <Box key={msg.id} flexDirection="column" marginBottom={1}>
            <Box gap={1}>
              {isCeo ? (
                <RainbowText>{name}</RainbowText>
              ) : (
                <Text bold color={isAgent ? 'cyan' : 'green'}>
                  {name}
                </Text>
              )}
              <Text dimColor>{time}</Text>
            </Box>
            <Text wrap="wrap">{renderContent(msg.content, memberMap)}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
