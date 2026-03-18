import { join } from 'node:path';
import {
  type Channel,
  type Member,
  type ChannelMessage,
  readConfig,
  appendMessage,
  generateId,
  CHANNELS_JSON,
  MEMBERS_JSON,
  MESSAGES_JSONL,
} from '@agentcorp/shared';

/** Write a task event message to the #tasks channel (not dispatched — info only). */
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

/**
 * Notify an agent about a task assignment via @mention in #tasks.
 * This is a kind: 'text' message so the router dispatches to the agent.
 */
export function notifyTaskAssignment(
  corpRoot: string,
  assigneeId: string,
  taskTitle: string,
): void {
  try {
    const channels = readConfig<Channel[]>(join(corpRoot, CHANNELS_JSON));
    const members = readConfig<Member[]>(join(corpRoot, MEMBERS_JSON));

    const tasksChannel = channels.find((c) => c.name === 'tasks');
    if (!tasksChannel) return;

    const assignee = members.find((m) => m.id === assigneeId);
    if (!assignee) return;

    // Make sure the assignee is a member of #tasks channel
    if (!tasksChannel.memberIds.includes(assigneeId)) {
      tasksChannel.memberIds.push(assigneeId);
      readConfig; // Don't need to persist — router resolves from members.json
    }

    const msg: ChannelMessage = {
      id: generateId(),
      channelId: tasksChannel.id,
      senderId: 'system',
      threadId: null,
      content: `@${assignee.displayName} you have a new task: "${taskTitle}". Read your TASKS.md and start working.`,
      kind: 'text',
      mentions: [assigneeId],
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
