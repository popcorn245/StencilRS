import { Component, Prop, h, Event, EventEmitter, State, Watch } from '@stencil/core';
import { marked, Renderer } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

export type MessageRole = 'user' | 'assistant' | 'member';
export type MessageLayout = 'bubble' | 'prose';
export type StreamingMode = 'inline' | 'dots';

export interface IntentChip {
  label: string;
  type: 'task' | 'event' | 'note' | 'research' | 'quest' | 'unknown';
}

// Configure marked with highlight.js once at module load
const renderer = new Renderer();
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const validLang = lang && hljs.getLanguage(lang) ? lang : null;
  const highlighted = validLang
    ? hljs.highlight(text, { language: validLang }).value
    : hljs.highlightAuto(text).value;
  const langClass = lang ? ` language-${lang}` : '';
  return `<pre class="mb-code-block"><code class="hljs${langClass}">${highlighted}</code></pre>`;
};
marked.use({ renderer });

@Component({
  tag: 'pop-message-bubble',
  encapsulation: { type: 'scoped' },
  styleUrl: 'message-bubble.css',
})
export class PopMessageBubble {
  /** Role determines layout: user = right bubble, assistant = left prose/bubble, member = Discord-style */
  @Prop() role: MessageRole = 'member';

  /** Markdown content (plain text for member role) */
  @Prop() content: string = '';

  /** Passed back in edit/delete events */
  @Prop() messageId: string = '';

  /** bubble = rounded chat bubbles, prose = full-width document blocks */
  @Prop() layout: MessageLayout = 'bubble';

  /** Whether the message is still streaming in */
  @Prop() streaming: boolean = false;

  /** inline = content builds token by token; dots = animated ellipsis while waiting */
  @Prop() streamingMode: StreamingMode = 'inline';

  /** Avatar image URL */
  @Prop() avatarUrl: string = '';

  /** Fallback initials when no avatarUrl */
  @Prop() avatarInitials: string = '';

  /** Display name shown in header */
  @Prop() userName: string = '';

  /** Unix ms timestamp */
  @Prop() timestamp: number = 0;

  /** Align bubble to the right (current user's own messages) */
  @Prop() isOwn: boolean = false;

  /** Admin can delete any message */
  @Prop() isAdmin: boolean = false;

  /** Show copy-to-clipboard button on AI messages */
  @Prop() showCopyButton: boolean = false;

  /** When true, thread action is hidden (already inside a thread) */
  @Prop() isThread: boolean = false;

  /** Thread reply count (member role) */
  @Prop() threadCount: number = 0;

  /** Last reply preview text */
  @Prop() threadPreview: string = '';

  /** Last reply author avatar */
  @Prop() threadAvatarUrl: string = '';

  /** Last reply timestamp */
  @Prop() threadLastAt: number = 0;

  /** JSON string of IntentChip[] shown on assistant messages after streaming */
  @Prop() intents: string = '[]';

  @State() parsedIntents: IntentChip[] = [];
  @State() editing: boolean = false;
  @State() editText: string = '';
  @State() copied: boolean = false;

  @Event() popThreadOpened: EventEmitter<any>;
  @Event() popMessageEdited: EventEmitter<{ id: string; text: string }>;
  @Event() popMessageDeleted: EventEmitter<string>;
  @Event() popCopied: EventEmitter<void>;

  componentWillLoad() {
    this.parseIntents();
  }

  @Watch('intents')
  parseIntents() {
    try { this.parsedIntents = JSON.parse(this.intents); } catch { this.parsedIntents = []; }
  }

  private renderMarkdown(text: string): string {
    if (!text) return '';
    const raw = marked.parse(text) as string;
    if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
      return DOMPurify.sanitize(raw);
    }
    return raw;
  }

  private formatRelativeTime(ts: number): string {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${time}`;
    if (isYesterday) return `Yesterday at ${time}`;
    return date.toLocaleDateString();
  }


  private handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(this.content);
      this.copied = true;
      this.popCopied.emit();
      setTimeout(() => { this.copied = false; }, 2000);
    } catch { /* clipboard may be unavailable */ }
  };

  private handleTTS = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(this.content);
    window.speechSynthesis.speak(utt);
  };

  private handleSaveEdit = () => {
    if (!this.editText.trim()) return;
    this.popMessageEdited.emit({ id: this.messageId, text: this.editText });
    this.editing = false;
  };

  private handleDelete = () => {
    if (confirm('Delete this message?')) {
      this.popMessageDeleted.emit(this.messageId);
    }
  };

  private intentColor(type: string): string {
    const map: Record<string, string> = {
      task: '#3b82f6', event: '#22c55e', note: '#f59e0b',
      research: '#a855f7', quest: '#ec4899', unknown: '#6b7280',
    };
    return map[type] ?? map['unknown'];
  }

  private intentIcon(type: string): string {
    const icons: Record<string, string> = {
      task: '✓', event: '📅', note: '📝', research: '🔬', quest: '🗺️', unknown: '?',
    };
    return icons[type] ?? '?';
  }

  private renderAvatar() {
    return (
      <div class="mb-avatar">
        {this.avatarUrl
          ? <img src={this.avatarUrl} alt="" class="mb-avatar-img" />
          : <div class="mb-avatar-fallback">{(this.avatarInitials || '?').slice(0, 2).toUpperCase()}</div>
        }
      </div>
    );
  }

  private renderBubbleContent() {
    if (this.streaming && this.streamingMode === 'dots') {
      return <div class="mb-dots"><span /><span /><span /></div>;
    }
    if (this.role === 'member') {
      return <div class="mb-text">{this.content}</div>;
    }
    return (
      <div
        class={{ 'mb-markdown': true, 'mb-streaming': this.streaming }}
        innerHTML={this.renderMarkdown(this.content || (this.streaming ? '…' : ''))}
      />
    );
  }

  render() {
    const isAI = this.role === 'assistant';
    const isUser = this.role === 'user';
    const isMember = this.role === 'member';
    const showOwnRight = isUser || (isMember && this.isOwn);

    return (
      <div class={{
        'mb-root': true,
        [`mb-role--${this.role}`]: true,
        [`mb-layout--${this.layout}`]: true,
        'mb-own': showOwnRight,
        'mb-editing': this.editing,
      }}>

        {/* Avatar — left side for AI and other members */}
        {(isAI || (isMember && !this.isOwn)) && this.renderAvatar()}

        <div class="mb-body">
          {/* Header */}
          {(isMember || isAI) && (this.userName || this.timestamp > 0) && (
            <div class="mb-header">
              {this.userName && <span class="mb-name">{this.userName}</span>}
              {this.timestamp > 0 && <span class="mb-time">{this.formatRelativeTime(this.timestamp)}</span>}
            </div>
          )}

          {/* Bubble */}
          <div class="mb-bubble-wrap">
            <div class="mb-bubble">
              {this.editing ? (
                <div class="mb-edit">
                  <textarea
                    class="mb-edit-textarea"
                    value={this.editText}
                    onInput={(e: any) => this.editText = e.target.value}
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSaveEdit(); }
                      if (e.key === 'Escape') { this.editing = false; }
                    }}
                  />
                  <div class="mb-edit-controls">
                    <span class="mb-edit-hint">esc to cancel · enter to save</span>
                    <div class="mb-edit-btns">
                      <button class="mb-btn-save" onClick={this.handleSaveEdit}>Save</button>
                      <button class="mb-btn-cancel" onClick={() => { this.editing = false; }}>Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                this.renderBubbleContent()
              )}

              {/* Inline streaming cursor */}
              {this.streaming && this.streamingMode === 'inline' && !this.editing && (
                <span class="mb-cursor" aria-hidden="true" />
              )}
            </div>

            {/* AI utility buttons: copy + TTS */}
            {isAI && !this.streaming && !this.editing && (
              <div class="mb-ai-actions">
                {this.showCopyButton && (
                  <button
                    class={{ 'mb-action-btn': true, 'mb-copied': this.copied }}
                    title={this.copied ? 'Copied!' : 'Copy'}
                    onClick={this.handleCopy}
                  >
                    {this.copied
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                    }
                  </button>
                )}
                <button class="mb-action-btn" title="Read aloud" onClick={this.handleTTS}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 010 14.14" />
                    <path d="M15.54 8.46a5 5 0 010 7.07" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Intent chips */}
          {isAI && !this.streaming && this.parsedIntents.length > 0 && (
            <div class="mb-intents" role="list" aria-label="Detected intents">
              {this.parsedIntents.map((chip, i) => (
                <span
                  key={i}
                  class="mb-chip"
                  role="listitem"
                  style={{ '--chip-color': this.intentColor(chip.type) } as any}
                  title={chip.type}
                >
                  <span class="mb-chip-icon" aria-hidden="true">{this.intentIcon(chip.type)}</span>
                  {chip.label}
                </span>
              ))}
            </div>
          )}

          {/* Thread summary (member role) */}
          {isMember && !this.isThread && this.threadCount > 0 && !this.editing && (
            <pop-thread-summary
              messageId={this.messageId}
              threadCount={this.threadCount}
              threadPreview={this.threadPreview}
              threadAvatarUrl={this.threadAvatarUrl}
              threadLastAt={this.threadLastAt}
              onPopThreadOpened={(e: CustomEvent) => this.popThreadOpened.emit(e.detail)}
            />
          )}
        </div>

        {/* Avatar — right side for user / own member */}
        {showOwnRight && this.renderAvatar()}

        {/* Hover actions (member role only) */}
        {isMember && !this.editing && (
          <pop-message-actions
            messageId={this.messageId}
            isOwn={this.isOwn}
            isAdmin={this.isAdmin}
            isThread={this.isThread}
            threadCount={this.threadCount}
            onPopThreadOpened={(e: CustomEvent) => this.popThreadOpened.emit(e.detail)}
            onPopEditRequested={() => { this.editing = true; this.editText = this.content; }}
            onPopDeleteRequested={() => this.handleDelete()}
          />
        )}
      </div>
    );
  }
}
