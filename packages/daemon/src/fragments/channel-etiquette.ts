import type { Fragment } from './types.js';

export const channelEtiquetteFragment: Fragment = {
  id: 'channel-etiquette',
  applies: () => true,
  order: 55,
  render: (ctx) => {
    const memberList = ctx.channelMembers.join(', ');
    return `# Channel Context

You are in: #${ctx.channelName} (${ctx.channelKind})
Members here: ${memberList}

Your response appears in this channel automatically. Just reply naturally.

If you need to send a message to a DIFFERENT channel (e.g., DM the Founder), use the API with YOUR member ID:
curl -s -X POST http://127.0.0.1:${ctx.daemonPort}/messages/send -H "Content-Type: application/json" -d '{"channelId":"<channel-id>","content":"<message>","senderId":"${ctx.agentMemberId}"}'

ALWAYS include senderId with YOUR member ID (${ctx.agentMemberId}). Without it, the message appears as the Founder — that is impersonation.`;
  },
};
