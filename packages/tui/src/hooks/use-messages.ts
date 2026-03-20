import { useState, useEffect, useRef } from 'react';
import { watch } from 'node:fs';
import { type ChannelMessage, tailMessages, readMessages } from '@claudecorp/shared';

/** Filter out messages not written by our system (external OpenClaw writes). */
function filterExternal(msgs: ChannelMessage[]): ChannelMessage[] {
  return msgs.filter((msg) => {
    if (msg.kind !== 'text') return true;                        // system/task events always show
    if (msg.senderId === 'system') return true;                   // system sender always show
    const meta = msg.metadata as Record<string, unknown> | null;
    if (meta?.source === 'router' || meta?.source === 'user') return true;  // our writes
    if (!meta) return true;                                       // legacy messages (before tagging)
    return false;                                                 // external write — hide
  });
}

export function useMessages(messagesPath: string, initialCount = 50) {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const lastIdRef = useRef<string | null>(null);

  // Initial load
  useEffect(() => {
    const initial = filterExternal(tailMessages(messagesPath, initialCount));
    setMessages(initial);
    if (initial.length > 0) {
      lastIdRef.current = initial[initial.length - 1]!.id;
    }
  }, [messagesPath]);

  // Watch for changes
  useEffect(() => {
    const watcher = watch(messagesPath, () => {
      try {
        const newMsgs = lastIdRef.current
          ? readMessages(messagesPath, { after: lastIdRef.current })
          : tailMessages(messagesPath, initialCount);

        if (newMsgs.length > 0) {
          lastIdRef.current = newMsgs[newMsgs.length - 1]!.id;
          const filtered = filterExternal(newMsgs);
          if (filtered.length > 0) {
            setMessages((prev) => [...prev, ...filtered]);
          }
        }
      } catch {
        // File might be mid-write
      }
    });

    return () => watcher.close();
  }, [messagesPath]);

  return messages;
}
