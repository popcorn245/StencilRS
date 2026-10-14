import { Component, h, Prop, State, Event, EventEmitter, Watch, Element } from '@stencil/core';
import type { MentionSource, MentionValue } from '../mention-input/mention-input';

interface QuestOption {
  id: string;
  emoji: string;
  title: string;
}

@Component({
  tag: 'pop-task-quick-add',
  encapsulation: { type: 'scoped' },
  styleUrl: 'task-quick-add.css',
})
export class PopTaskQuickAdd {
  @Element() el: HTMLElement;

  /** Controls visibility */
  @Prop({ mutable: true, reflect: true }) open: boolean = false;

  /** JSON array of {id, emoji, title} */
  @Prop() quests: string = '[]';

  /** Pre-selected quest (when opened from quest detail) */
  @Prop() defaultQuestId: string | null = null;

  /**
   * Optional mention sources keyed by group. When provided, the title input
   * is replaced by `<pop-mention-input>` so users can `@`-mention people /
   * `#`-tag etc. When absent, the existing plain-text input is rendered.
   */
  @Prop() mentionSources?: Record<string, MentionSource[]>;

  /** User submitted the form */
  @Event({ composed: true, bubbles: true }) taskCreate: EventEmitter<{ title: string; dueDate: string | null; questId: string | null }>;

  /** Popover dismissed */
  @Event({ composed: true, bubbles: true }) quickAddClose: EventEmitter<void>;

  @State() title: string = '';
  @State() dueDate: string = '';
  @State() questId: string = '';
  @State() validationError: string = '';

  private titleInput?: HTMLInputElement;
  private parsedQuests: QuestOption[] = [];

  componentWillLoad() {
    this.parseQuests();
  }

  @Watch('quests')
  onQuestsChange() {
    this.parseQuests();
  }

  @Watch('open')
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      this.title = '';
      this.dueDate = '';
      this.questId = this.defaultQuestId || '';
      this.validationError = '';
      requestAnimationFrame(() => {
        this.titleInput?.focus();
      });
    }
  }

  private parseQuests() {
    try {
      this.parsedQuests = JSON.parse(this.quests);
    } catch {
      this.parsedQuests = [];
    }
  }

  private handleSubmit = (e: Event) => {
    e.preventDefault();
    const trimmedTitle = this.title.trim();
    if (!trimmedTitle) {
      this.validationError = 'Title is required';
      this.titleInput?.focus();
      return;
    }
    this.taskCreate.emit({
      title: trimmedTitle,
      dueDate: this.dueDate || null,
      questId: this.questId || null,
    });
    this.open = false;
    this.quickAddClose.emit();
  };

  private handleDismiss = () => {
    this.open = false;
    this.quickAddClose.emit();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.handleDismiss();
    }
  };

  private handleBackdropClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('tqa-backdrop')) {
      this.handleDismiss();
    }
  };

  private flatMentionSources(): MentionSource[] {
    if (!this.mentionSources) return [];
    const out: MentionSource[] = [];
    for (const arr of Object.values(this.mentionSources)) {
      for (const s of arr) out.push(s);
    }
    return out;
  }

  render() {
    if (!this.open) return null;

    const useMention = !!this.mentionSources && Object.keys(this.mentionSources).length > 0;

    return (
      <div class="tqa-backdrop" onClick={this.handleBackdropClick} onKeyDown={this.handleKeyDown}>
        <div class="tqa-popover" role="dialog" aria-modal="true" aria-label="Quick add task">
          <form class="tqa-form" onSubmit={this.handleSubmit}>
            {useMention ? (
              <pop-mention-input
                class={{ 'tqa-mention': true, 'tqa-input--error': !!this.validationError }}
                placeholder="What needs doing?"
                sources={this.flatMentionSources()}
                onValueChanged={(e: CustomEvent<MentionValue>) => {
                  this.title = (e.detail?.text || '').trim();
                  if (this.validationError) this.validationError = '';
                }}
                onSubmitted={(e: CustomEvent<MentionValue>) => {
                  this.title = (e.detail?.text || '').trim();
                  const evt = document.createEvent('Event');
                  evt.initEvent('submit', false, true);
                  this.handleSubmit(evt);
                }}
              />
            ) : (
              <input
                type="text"
                class={{ 'tqa-input': true, 'tqa-input--error': !!this.validationError }}
                placeholder="What needs doing?"
                value={this.title}
                onInput={(e: Event) => {
                  this.title = (e.target as HTMLInputElement).value;
                  if (this.validationError) this.validationError = '';
                }}
                ref={el => { this.titleInput = el; }}
                autocomplete="off"
              />
            )}
            {this.validationError && (
              <span class="tqa-error">{this.validationError}</span>
            )}

            <div class="tqa-row">
              <input
                type="date"
                class="tqa-date"
                value={this.dueDate}
                onInput={(e: Event) => { this.dueDate = (e.target as HTMLInputElement).value; }}
              />

              <select
                class="tqa-quest-select"
                onChange={(e: Event) => { this.questId = (e.target as HTMLSelectElement).value; }}
              >
                <option value="" selected={!this.questId}>Inbox</option>
                {this.parsedQuests.map(q => (
                  <option value={q.id} selected={this.questId === q.id}>{q.emoji} {q.title}</option>
                ))}
              </select>
            </div>

            <button type="submit" class="tqa-submit">Add Task</button>
          </form>
        </div>
      </div>
    );
  }
}
