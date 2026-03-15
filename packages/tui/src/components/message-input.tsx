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

export function MessageInput({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState('');
  const [hueOffset, setHueOffset] = useState(0);

  // Animate rainbow prompt while user is typing
  useEffect(() => {
    if (disabled || !value) {
      return;
    }
    const timer = setInterval(() => {
      setHueOffset((prev) => (prev + 30) % 360);
    }, 150);
    return () => clearInterval(timer);
  }, [disabled, !!value]);

  const handleSubmit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const promptColor = value
    ? hslToHex(hueOffset, 80, 65)
    : 'green';

  return (
    <Box borderStyle="single" borderColor={disabled ? 'gray' : value ? hslToHex(hueOffset, 60, 50) : 'white'} paddingX={1}>
      <Text bold color={promptColor}>&gt; </Text>
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
  );
}
