import { EventEmitter } from 'events';

const PASTE_START = '\x1b[200~';
const PASTE_END = '\x1b[201~';

/**
 * Stdin filter that intercepts bracketed paste sequences.
 *
 * Bracketed paste mode: the terminal wraps pasted text with escape sequences:
 *   \x1b[200~  <pasted content>  \x1b[201~
 *
 * This filter strips those markers and emits a 'paste' event with the content.
 * Normal (non-paste) input is re-emitted as 'data' events.
 *
 * Designed as a drop-in replacement for process.stdin when passed to Ink's render().
 */
export class PasteFilterStdin extends EventEmitter {
  isTTY = true;
  private pasteBuffer: string | null = null;
  private destroyed = false;

  constructor() {
    super();
    process.stdin.on('data', this.handleData);
  }

  setRawMode(mode: boolean): this {
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(mode);
    }
    return this;
  }

  resume(): this {
    process.stdin.resume();
    return this;
  }

  pause(): this {
    process.stdin.pause();
    return this;
  }

  ref(): this { return this; }
  unref(): this { return this; }

  destroy(): void {
    this.destroyed = true;
    process.stdin.off('data', this.handleData);
  }

  private handleData = (chunk: Buffer): void => {
    if (this.destroyed) return;

    const data = chunk.toString('utf-8');

    // Fast path: no escape sequences and not mid-paste → pass through
    if (this.pasteBuffer === null && !data.includes('\x1b[')) {
      this.emit('data', chunk);
      return;
    }

    let remaining = data;

    while (remaining.length > 0) {
      if (this.pasteBuffer !== null) {
        // Currently buffering paste content — look for end marker
        const endIdx = remaining.indexOf(PASTE_END);
        if (endIdx !== -1) {
          this.pasteBuffer += remaining.slice(0, endIdx);
          this.emit('paste', this.pasteBuffer);
          this.pasteBuffer = null;
          remaining = remaining.slice(endIdx + PASTE_END.length);
        } else {
          // End marker not in this chunk — keep buffering
          this.pasteBuffer += remaining;
          remaining = '';
        }
      } else {
        // Normal mode — look for paste start marker
        const startIdx = remaining.indexOf(PASTE_START);
        if (startIdx !== -1) {
          // Pass through any normal input before the marker
          if (startIdx > 0) {
            this.emit('data', Buffer.from(remaining.slice(0, startIdx), 'utf-8'));
          }
          this.pasteBuffer = '';
          remaining = remaining.slice(startIdx + PASTE_START.length);
        } else {
          // No paste markers — pass everything through
          this.emit('data', Buffer.from(remaining, 'utf-8'));
          remaining = '';
        }
      }
    }
  };
}

// Module-level singleton
let instance: PasteFilterStdin | null = null;

export function getPasteFilter(): PasteFilterStdin {
  if (!instance) {
    instance = new PasteFilterStdin();
  }
  return instance;
}

export function enableBracketedPaste(): void {
  process.stdout.write('\x1b[?2004h');
}

export function disableBracketedPaste(): void {
  process.stdout.write('\x1b[?2004l');
}
