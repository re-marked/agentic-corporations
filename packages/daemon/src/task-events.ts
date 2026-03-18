import { join } from 'node:path';
import {
  type Channel,
  type ChannelMessage,
  readConfig,
  appendMessage,
  generateId,
  CHANNELS_JSON,
  MESSAGES_JSONL,
} from '@agentcorp/shared';

/** Write a task event message to the #tasks channel. */
export function writeTaskEvent(corpRoot: string, content: string): void {
  try {
    const channels = readConfig<Channel[]>(join(corpRoot, CHANNELS_JSON));
    const tasksChannel = channels.find((c) => c.name === 'tasks');
    if (!tasksChannel) return;

    const msg: ChannelMessage = {
      id: generateId(),
      channelId: tasksChannel.id,
      senderId: 'system',
      threadId: null,
      content: `[TASK] ${content}`,
      kind: 'task_event',
      mentions: [],
      metadata: null,
      depth: 0,
      originId: '',
      timestamp: new Date().toISOString(),
    };
    msg.originId = msg.id;
    appendMessage(join(corpRoot, tasksChannel.path, MESSAGES_JSONL), msg);
  } catch {
    // Non-fatal
  }
}
