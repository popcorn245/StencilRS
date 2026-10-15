import { Component, h, Prop, State, Watch } from '@stencil/core';
import { marked } from 'marked';

export type MessageRole = 'user' | 'assistant';

export interface IntentChip {
  label: string;
  type: 'task' | 'event' | 'note' | 'research' | 'quest' | 'unknown';
}

/**
 * @deprecated Use `pop-message-bubble` instead.
 * This component is superseded by pop-message-bubble which supports
 * all roles (user, assistant, member), layouts (bubble, prose), streaming,
 * copy, TTS, and thread actions in one unified component.
 */
@Component({
  tag: 'pop-research-message',
  encapsulation: { type: 'scoped' },
  styleUrl: 'research-message.css',
})
export class PopResearchMessage {
  /** Who sent the message */
  @Prop() role: MessageRole = 'user';

  /** Message text content (may stream in) */
  @Prop() content: string = '';

  /** Whether the message is still streaming */
  @Prop() streaming: boolean = false;

  /** Avatar URL for user messages */
  @Prop() avatarUrl: string = '';

  /** Avatar initials fallback */
  @Prop() avatarInitials: string = '';

  /** JSON string of IntentChip[] — shown on assistant messages after streaming */
  @Prop() intents: string = '[]';

  @State() parsedIntents: IntentChip[] = [];

  @Watch('intents')
  onIntentsChange(val: string) {
    try { this.parsedIntents = JSON.parse(val); } catch { this.parsedIntents = []; }
  }

  componentWillLoad() {
    try { this.parsedIntents = JSON.parse(this.intents); } catch { this.parsedIntents = []; }
  }

  private intentColor(type: IntentChip['type']): string {
    const map: Record<string, string> = {
      task:     '#3b82f6',
      event:    '#22c55e',
      note:     '#f59e0b',
      research: '#a855f7',
      quest:    '#ec4899',
      unknown:  '#6b7280',
    };
    return map[type] ?? map.unknown;
  }

  private intentIcon(type: IntentChip['type']): string {
    const map: Record<string, string> = {
      task:     '✓',
      event:    '📅',
      note:     '📝',
      research: '🔬',
      quest:    '🗺️',
      unknown:  '?',
    };
    return map[type] ?? '?';
  }

  render() {
    const isUser = this.role === 'user';

    return (
      <div class={{ 'rm-root': true, 'rm-role--user': isUser, 'rm-role--assistant': !isUser }}>
        {/* Avatar — only for user messages */}
        {isUser && (
          <div class="rm-avatar">
            {this.avatarUrl ? (
              <img src={this.avatarUrl} alt="" class="rm-avatar-img" />
            ) : (
              <div class="rm-avatar-fallback">{this.avatarInitials.slice(0, 2).toUpperCase()}</div>
            )}
          </div>
        )}

        <div class="rm-body">
          {/* Bubble */}
          <div 
            class={{ 'rm-bubble': true, 'rm-bubble--streaming': this.streaming }}
            innerHTML={marked.parse(this.content || (this.streaming ? '' : '…')) as string}
          >
          </div>
          {this.streaming && <span class="rm-cursor" aria-hidden="true" />}

          {/* Intent chips — shown after streaming completes on assistant messages */}
          {!isUser && !this.streaming && this.parsedIntents.length > 0 && (
            <div class="rm-intents" role="list" aria-label="Detected intents">
              {this.parsedIntents.map((chip, i) => (
                <span
                  key={i}
                  class="rm-chip"
                  role="listitem"
                  style={{ '--chip-color': this.intentColor(chip.type) } as any}
                  title={chip.type}
                >
                  <span class="rm-chip-icon" aria-hidden="true">{this.intentIcon(chip.type)}</span>
                  {chip.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
}
