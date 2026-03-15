import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function AnimatedRainbow({ children, offset }: { children: string; offset: number }) {
  const chars = children.split('');
  const len = Math.max(chars.length, 1);
  return (
    <Text bold>
      {chars.map((char, i) => {
        const hue = ((i / len) * 300 + offset) % 360;
        return <Text key={i} color={hslToHex(hue, 80, 65)}>{char}</Text>;
      })}
    </Text>
  );
}

/** Check if text has any @mentions */
function hasMentions(text: string): boolean {
  return /@\S+/.test(text);
}

/** Render text with animated rainbow @mentions */
function renderPreview(text: string, hueOffset: number) {
  const parts: React.ReactNode[] = [];
  const mentionRegex = /@"([^"]+)"|@(\S+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Text key={`t${lastIndex}`}>{text.slice(lastIndex, match.index)}</Text>);
    }
    parts.push(
      <AnimatedRainbow key={`m${match.index}`} offset={hueOffset}>
        {match[0]}
      </AnimatedRainbow>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<Text key={`t${lastIndex}`}>{text.slice(lastIndex)}</Text>);
  }

  return parts;
}

export function MessageInput({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState('');
  const [hueOffset, setHueOffset] = useState(0);

  const showPreview = !disabled && hasMentions(value);

  // Animate rainbow when there's a mention in the input
  useEffect(() => {
    if (!showPreview) return;
    const timer = setInterval(() => {
      setHueOffset((prev) => (prev + 20) % 360);
    }, 100);
    return () => clearInterval(timer);
  }, [showPreview]);

  const handleSubmit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <Box flexDirection="column">
      {showPreview && (
        <Box paddingX={2} marginBottom={0}>
          <Text dimColor>{'  '}</Text>
          {renderPreview(value, hueOffset)}
        </Box>
      )}
      <Box borderStyle="single" borderColor={disabled ? 'gray' : 'white'} paddingX={1}>
        <Text bold color="green">&gt; </Text>
        {disabled ? (
          <Text dimColor>{placeholder ?? 'Waiting...'}</Text>
        ) : (
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder={placeholder ?? 'Type a message...'}
          />
        )}
      </Box>
    </Box>
  );
}
