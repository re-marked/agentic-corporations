export type ChannelKind = 'broadcast' | 'team' | 'direct' | 'system';
export type ChannelScope = 'corp' | 'project' | 'team';
/** Controls how messages dispatch in this channel. */
export type ChannelMode = 'open' | 'mention' | 'announce';

export interface Channel {
  id: string;
  name: string;
  kind: ChannelKind;
  scope: ChannelScope;
  scopeId: string;
  teamId: string | null;
  memberIds: string[];
  createdBy: string;
  path: string;
  createdAt: string;
  /** Dispatch mode — open (DMs), mention (@mentioned only), announce (no dispatch). */
  mode?: ChannelMode;
}
