/** Premium dark palette — refined, breathable, alive. */
export const COLORS = {
  // Brand
  primary: '#C2785C',     // warm terracotta — accent, titles, active
  secondary: '#E8D5B7',   // cream — highlights, warm emphasis

  // Semantic
  success: '#7EC8A0',     // sage green — completed, healthy
  warning: '#E8C170',     // warm gold — assigned, idle, warnings
  danger: '#D46B6B',      // muted red — failed, crashed, errors
  info: '#8EAFC2',        // dusty blue — in_progress, working

  // Neutral
  text: '#E0DDD5',        // warm off-white — primary text
  subtle: '#9A958D',      // warm gray — timestamps, secondary
  muted: '#5C5751',       // dark warm gray — dim, offline, hints
  border: '#3D3A36',      // deep charcoal — borders
  borderActive: '#C2785C', // terracotta — focused borders

  // Agents
  user: '#7EC8A0',        // sage — user/founder messages
  agent: '#8EAFC2',       // dusty blue — agent messages
  ceo: 'rainbow' as const,
  system: '#5C5751',      // dark gray — system messages
} as const;

/** Status indicators — clean, minimal. */
export const STATUS = {
  active: { icon: '\u25CF', color: COLORS.success },   // ●
  working: { icon: '\u25CF', color: COLORS.info },      // ●
  idle: { icon: '\u25CB', color: COLORS.warning },      // ○
  suspended: { icon: '\u25CB', color: COLORS.muted },   // ○
  archived: { icon: '\u2013', color: COLORS.muted },    // –
  offline: { icon: '\u25CB', color: COLORS.muted },     // ○
} as const;

/** Task status indicators. */
export const TASK_STATUS = {
  pending: { icon: '\u25CB', color: COLORS.muted },     // ○
  assigned: { icon: '\u25CF', color: COLORS.warning },   // ●
  in_progress: { icon: '\u25CF', color: COLORS.info },   // ●
  blocked: { icon: '\u25CF', color: COLORS.danger },     // ●
  completed: { icon: '\u2713', color: COLORS.success },  // ✓
  failed: { icon: '\u2717', color: COLORS.danger },      // ✗
  cancelled: { icon: '\u2013', color: COLORS.muted },    // –
} as const;

/** Task priority colors. */
export const PRIORITY = {
  critical: '#D46B6B',
  high: '#C2785C',
  normal: '#E0DDD5',
  low: '#5C5751',
} as const;

/** Border style for all views. */
export const BORDER_STYLE = 'round' as const;
