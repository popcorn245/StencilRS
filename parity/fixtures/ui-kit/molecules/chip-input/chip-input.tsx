import { Component, h, Prop, State, Event, EventEmitter, Element, Method } from '@stencil/core';

/**
 * pop-chip-input — string-array editor rendered as removable chips.
 *
 * Used by tasks-app for tags, assignees, and any other flat string-array field.
 * Accepts free-text adds (Enter or comma) and optionally an array of
 * suggestions to seed autocomplete.
 *
 *   <pop-chip-input
 *     value={['design', 'review']}
 *     suggestions={[{ id: 'critical', label: 'critical' }]}
 *     placeholder="Add a tag…"
 *     onValueChanged={ev => save(ev.detail)}
 *   />
 *
 * Each chip displays the matched suggestion's `label` if found, else the raw
 * value. Backspace on an empty input removes the trailing chip.
 */

export interface ChipSuggestion {
  id: string;
  label: string;
  /** Optional emoji prefix rendered before the label on both the selected chip
   *  and the suggestion row. */
  emoji?: string;
  /** Optional color (any CSS color) used to tint the selected chip's background
   *  + border and the suggestion-row dot. Falls back to a neutral chip. */
  color?: string;
}

@Component({
  tag: 'pop-chip-input',
  encapsulation: { type: 'scoped' },
  styleUrl: 'chip-input.css',
})
export class PopChipInput {
  @Element() el!: HTMLElement;

  /** Current value array. */
  @Prop({ mutable: true }) value: string[] = [];

  /** Optional suggestions for autocomplete + chip label resolution. */
  @Prop() suggestions: ChipSuggestion[] = [];

  /** Placeholder for the trailing text input. */
  @Prop() placeholder: string = 'Add…';

  /** Reject values that don't match a suggestion id. */
  @Prop() strict: boolean = false;

  /** Hide the trailing add-input (read-only mode). */
  @Prop() readonly: boolean = false;

  @Event({ composed: true, bubbles: true }) valueChanged!: EventEmitter<string[]>;

  /** Emitted when the user picks the inline "Create «text»" row (the typed text
   *  matches no existing suggestion). The host persists a new chip/tag and adds
   *  its id to `value`. Only fires when `allowCreate` is true. */
  @Event({ composed: true, bubbles: true }) createChip!: EventEmitter<{ label: string }>;

  /** Show the inline "＋ Create «text»" row when the draft matches no suggestion.
   *  Off by default so existing {id,label} / free-text callers are unchanged. */
  @Prop() allowCreate: boolean = false;

  @State() draft: string = '';
  @State() openSuggestions: boolean = false;

  private inputRef: HTMLInputElement | null = null;

  /** Imperatively focus the input. */
  @Method()
  async focusInput() {
    this.inputRef?.focus();
  }

  private currentValue(): string[] {
    return Array.isArray(this.value) ? this.value : [];
  }

  private suggestionFor(id: string): ChipSuggestion | undefined {
    return this.suggestions.find((s) => s.id === id);
  }

  private labelFor(id: string): string {
    const hit = this.suggestionFor(id);
    return hit ? hit.label : id;
  }

  /** Inline styles that tint a selected chip from its suggestion's `color`.
   *  No color → empty object, so the neutral (brand-blue) CSS default applies. */
  private chipStyle(id: string): { [k: string]: string } {
    const color = this.suggestionFor(id)?.color;
    if (!color) return {};
    return {
      background: `color-mix(in oklab, ${color} 16%, transparent)`,
      borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
    };
  }

  /** Whether to offer the inline "Create «draft»" row: create is enabled, the
   *  draft is non-empty, and it matches no existing suggestion by id or label. */
  private canCreateDraft(): boolean {
    if (!this.allowCreate) return false;
    const q = this.draft.trim();
    if (!q) return false;
    const lower = q.toLowerCase();
    return !this.suggestions.some(
      (s) => s.id.toLowerCase() === lower || s.label.toLowerCase() === lower,
    );
  }

  private commit(next: string[]) {
    this.value = next;
    this.valueChanged.emit([...next]);
  }

  private addRaw(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const current = this.currentValue();
    if (current.includes(trimmed)) return;
    if (this.strict) {
      const hit = this.suggestions.find(
        (s) => s.id === trimmed || s.label.toLowerCase() === trimmed.toLowerCase(),
      );
      if (!hit) return;
      this.commit([...current, hit.id]);
    } else {
      this.commit([...current, trimmed]);
    }
    this.draft = '';
    this.openSuggestions = false;
  }

  /** Emit createChip for the current draft (the host persists + adds the id). */
  private emitCreate() {
    const label = this.draft.trim();
    if (!label) return;
    this.createChip.emit({ label });
    this.draft = '';
    this.openSuggestions = false;
  }

  private removeAt(index: number) {
    const current = this.currentValue();
    const next = current.slice(0, index).concat(current.slice(index + 1));
    this.commit(next);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      // When the draft names no existing suggestion and create is on, Enter/comma
      // creates a new chip (host persists it) instead of a raw/strict-rejected add.
      if (this.canCreateDraft()) {
        this.emitCreate();
        return;
      }
      this.addRaw(this.draft);
      return;
    }
    if (e.key === 'Backspace' && !this.draft) {
      const current = this.currentValue();
      if (current.length) this.removeAt(current.length - 1);
    }
  };

  private filteredSuggestions(): ChipSuggestion[] {
    const current = new Set(this.currentValue());
    const q = this.draft.trim().toLowerCase();
    return this.suggestions
      .filter((s) => !current.has(s.id))
      .filter((s) => !q || s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
      .slice(0, 8);
  }

  render() {
    const chips = this.currentValue();
    const suggestions = this.filteredSuggestions();
    const showCreate = this.canCreateDraft();
    return (
      <div class={`pci ${this.readonly ? 'pci--readonly' : ''}`}>
        <div class="pci__chips">
          {chips.map((id, i) => {
            const sug = this.suggestionFor(id);
            return (
            <span class="pci__chip" key={id} style={this.chipStyle(id)}>
              {sug?.emoji && <span class="pci__chip-emoji" aria-hidden="true">{sug.emoji}</span>}
              <span class="pci__chip-label">{this.labelFor(id)}</span>
              {!this.readonly && (
                <button
                  type="button"
                  class="pci__chip-remove"
                  aria-label={`Remove ${this.labelFor(id)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    this.removeAt(i);
                  }}
                >
                  ×
                </button>
              )}
            </span>
            );
          })}
          {!this.readonly && (
            <input
              ref={(el) => (this.inputRef = el || null)}
              class="pci__input"
              type="text"
              placeholder={chips.length === 0 ? this.placeholder : ''}
              value={this.draft}
              onInput={(e) => {
                this.draft = (e.target as HTMLInputElement).value;
                this.openSuggestions = true;
              }}
              onFocus={() => (this.openSuggestions = true)}
              onBlur={() =>
                setTimeout(() => (this.openSuggestions = false), 120)
              }
              onKeyDown={this.handleKeyDown}
            />
          )}
        </div>
        {!this.readonly && this.openSuggestions && (suggestions.length > 0 || showCreate) && (
          <ul class="pci__suggestions" role="listbox">
            {suggestions.map((s) => (
              <li
                role="option"
                class="pci__suggestion"
                onMouseDown={(e) => {
                  e.preventDefault();
                  this.addRaw(s.id);
                }}
              >
                {s.emoji ? (
                  <span class="pci__suggestion-emoji" aria-hidden="true">{s.emoji}</span>
                ) : (
                  <span
                    class="pci__suggestion-dot"
                    aria-hidden="true"
                    style={{ background: s.color || 'var(--brand-blue, #4299e1)' }}
                  />
                )}
                <span class="pci__suggestion-label">{s.label}</span>
              </li>
            ))}
            {showCreate && (
              <li
                role="option"
                class="pci__suggestion pci__suggestion--create"
                onMouseDown={(e) => {
                  e.preventDefault();
                  this.emitCreate();
                }}
              >
                <span class="pci__suggestion-plus" aria-hidden="true">＋</span>
                <span class="pci__suggestion-label">
                  Create “{this.draft.trim()}”
                </span>
              </li>
            )}
          </ul>
        )}
      </div>
    );
  }
}
