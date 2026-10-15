import { Component, h, Prop, State, Event, EventEmitter, Watch } from '@stencil/core';

export type IntentType = 'task' | 'event' | 'note' | 'research' | 'quest' | 'unknown';

export interface ParsedIntent {
  id: string;
  type: IntentType;
  label: string;
  /** Raw extracted fields from AI — may include title, date, description, etc. */
  data: Record<string, any>;
  /** Whether user accepted, rejected, or it's pending */
  state: 'pending' | 'accepted' | 'rejected';
}

@Component({
  tag: 'pop-intent-actions',
  encapsulation: { type: 'scoped' },
  styleUrl: 'intent-actions.css',
})
export class PopIntentActions {
  /** JSON string of ParsedIntent[] — recommended items (checked by default) */
  @Prop() intents: string = '[]';

  /** JSON string of ParsedIntent[] — other/supplemental items (unchecked by default) */
  @Prop({ attribute: 'other-intents' }) otherIntents: string = '[]';

  /** Goal statement from AI goal inference */
  @Prop() goal: string = '';

  /** Plan summary from AI */
  @Prop() summary: string = '';

  /** Emitted when user confirms selected intents — detail is accepted ParsedIntent[] */
  @Event({ composed: true, bubbles: true }) intentsConfirm: EventEmitter<ParsedIntent[]>;

  /** Emitted when user dismisses the sheet */
  @Event({ composed: true, bubbles: true }) intentsDismiss: EventEmitter<void>;

  @State() recommendedItems: ParsedIntent[] = [];
  @State() otherItems: ParsedIntent[] = [];
  @State() otherExpanded: boolean = false;

  @Watch('intents')
  onIntentsChange(val: string) {
    this.recommendedItems = this.parseList(val, 'accepted');
  }

  @Watch('otherIntents')
  onOtherIntentsChange(val: string) {
    this.otherItems = this.parseList(val, 'rejected');
  }

  componentWillLoad() {
    this.recommendedItems = this.parseList(this.intents, 'accepted');
    this.otherItems = this.parseList(this.otherIntents, 'rejected');
  }

  private parseList(raw: string, defaultState: 'accepted' | 'rejected'): ParsedIntent[] {
    try {
      const parsed = JSON.parse(raw) as ParsedIntent[];
      return parsed.map((i) => ({ ...i, state: defaultState }));
    } catch {
      return [];
    }
  }

  private toggle(id: string, list: 'recommended' | 'other') {
    if (list === 'recommended') {
      this.recommendedItems = this.recommendedItems.map((item) =>
        item.id === id
          ? { ...item, state: item.state === 'rejected' ? 'accepted' : 'rejected' }
          : item
      );
    } else {
      this.otherItems = this.otherItems.map((item) =>
        item.id === id
          ? { ...item, state: item.state === 'accepted' ? 'rejected' : 'accepted' }
          : item
      );
    }
  }

  private confirm() {
    const accepted = [
      ...this.recommendedItems.filter((i) => i.state === 'accepted'),
      ...this.otherItems.filter((i) => i.state === 'accepted'),
    ];
    this.intentsConfirm.emit(accepted);
  }

  private get acceptedCount(): number {
    return (
      this.recommendedItems.filter((i) => i.state === 'accepted').length +
      this.otherItems.filter((i) => i.state === 'accepted').length
    );
  }

  private intentIcon(type: IntentType): string {
    const map: Record<IntentType, string> = {
      task: '✓',
      event: '📅',
      note: '📝',
      research: '🔬',
      quest: '🗺️',
      unknown: '?',
    };
    return map[type] ?? '?';
  }

  private intentLabel(type: IntentType): string {
    const map: Record<IntentType, string> = {
      task: 'Task',
      event: 'Event',
      note: 'Note',
      research: 'Research',
      quest: 'Quest',
      unknown: 'Item',
    };
    return map[type] ?? 'Item';
  }

  private intentAccentColor(type: IntentType): string {
    const map: Record<IntentType, string> = {
      task: '#3b82f6',
      event: '#22c55e',
      note: '#f59e0b',
      research: '#a855f7',
      quest: '#ec4899',
      unknown: '#6b7280',
    };
    return map[type] ?? '#6b7280';
  }

  private renderItem(item: ParsedIntent, list: 'recommended' | 'other') {
    const isActive = item.state === 'accepted';
    return (
      <li
        key={item.id}
        class={{
          'ia-item': true,
          'ia-item--active': isActive,
          'ia-item--rejected': !isActive,
        }}
        style={{ '--intent-color': this.intentAccentColor(item.type as IntentType) } as any}
      >
        <button
          class="ia-checkbox"
          type="button"
          onClick={() => this.toggle(item.id, list)}
          aria-label={isActive ? 'Exclude this action' : 'Include this action'}
          aria-pressed={String(isActive)}
        >
          {isActive ? '✓' : ''}
        </button>
        <div class="ia-item-body">
          <div class="ia-item-type">
            <span class="ia-type-icon">{this.intentIcon(item.type as IntentType)}</span>
            <span class="ia-type-label">{this.intentLabel(item.type as IntentType)}</span>
          </div>
          <div class="ia-item-label">{item.label}</div>
        </div>
      </li>
    );
  }

  render() {
    const count = this.acceptedCount;
    const hasOther = this.otherItems.length > 0;
    const totalItems = this.recommendedItems.length + this.otherItems.length;

    if (totalItems === 0) {
      return (
        <div class="ia-root">
          <p class="ia-empty">No actions detected in this conversation.</p>
          <div class="ia-footer">
            <button class="ia-btn ia-btn--ghost" type="button" onClick={() => this.intentsDismiss.emit()}>
              Dismiss
            </button>
          </div>
        </div>
      );
    }

    return (
      <div class="ia-root">
        {/* Goal */}
        {this.goal && (
          <div class="ia-goal">
            <span class="ia-goal-icon">🎯</span>
            <span class="ia-goal-text">{this.goal}</span>
          </div>
        )}

        {/* Summary */}
        {this.summary && <p class="ia-summary">{this.summary}</p>}

        {/* Recommended items */}
        {this.recommendedItems.length > 0 && (
          <div class="ia-section">
            <div class="ia-section-header">
              <span class="ia-section-label">Recommended</span>
              <span class="ia-section-count">{this.recommendedItems.filter(i => i.state === 'accepted').length}</span>
            </div>
            <ul class="ia-list">
              {this.recommendedItems.map((item) => this.renderItem(item, 'recommended'))}
            </ul>
          </div>
        )}

        {/* Other items — collapsed */}
        {hasOther && (
          <details
            class="ia-other-section"
            open={this.otherExpanded}
            onToggle={(e: any) => { this.otherExpanded = e.target.open; }}
          >
            <summary class="ia-other-toggle">
              <span class="ia-other-chevron">{this.otherExpanded ? '▾' : '▸'}</span>
              Other actions ({this.otherItems.length})
            </summary>
            <ul class="ia-list ia-list--other">
              {this.otherItems.map((item) => this.renderItem(item, 'other'))}
            </ul>
          </details>
        )}

        {/* Footer */}
        <div class="ia-footer">
          <button
            class="ia-btn ia-btn--confirm"
            type="button"
            disabled={count === 0}
            onClick={() => this.confirm()}
          >
            Save {count > 0 ? `${count} ` : ''}action{count !== 1 ? 's' : ''}
          </button>
          <button class="ia-btn ia-btn--ghost" type="button" onClick={() => this.intentsDismiss.emit()}>
            Dismiss
          </button>
        </div>
      </div>
    );
  }
}
