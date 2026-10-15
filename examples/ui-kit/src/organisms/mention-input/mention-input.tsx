import { Component, h, Prop, State, Event, EventEmitter, Element, Method, Watch } from '@stencil/core';

/**
 * pop-mention-input
 *
 * Standalone single-line input with mention-popover support, extracted from
 * the EditorJS `MentionInlineTool` / `HashtagInlineTool` pattern but free of
 * any EditorJS coupling.
 *
 * Each `MentionSource` is bound to a trigger character (`@`, `#`, etc.).
 * Multiple sources may share a trigger and are grouped by `label` in the popover.
 *
 * The component renders a contenteditable div internally so accepted mentions
 * become inline pills (non-editable spans with `data-mention-source` + `data-mention-id`).
 * Free text remains as text nodes. `value` is exposed as `{ text, mentions }`
 * for ergonomic consumer use; you can also call `getValue()` for the latest.
 *
 * Submit button is rendered to the right; submit fires when user clicks or hits Enter.
 */
export interface MentionItem {
  id: string;
  label: string;
  /** Anything else the source wants to attach (e.g. value: Timestamp). */
  data?: any;
  icon?: string;
  avatar?: string;
}

export interface MentionSource {
  /** Single trigger character, e.g. `'@'` or `'#'`. */
  trigger: string;
  /** Group label used in the popover when multiple sources share a trigger. */
  label: string;
  /** Resolver returning matching items for the typed query. */
  resolve: (query: string) => Promise<MentionItem[]> | MentionItem[];
  /** Optional further grouping name. */
  group?: string;
}

export interface MentionPill {
  /** Source label that produced this pill (e.g. "People", "Dates", "Tags"). */
  source: string;
  /** Source trigger character. */
  trigger: string;
  /** Mention id. */
  id: string;
  /** Display label (rendered prefixed by the trigger). */
  label: string;
  /** Original `data` payload from the source. */
  data?: any;
}

export interface MentionValue {
  /** Free-text portion (mention pills stripped). */
  text: string;
  /** All accepted mention pills in order of appearance. */
  mentions: MentionPill[];
}

interface InternalDropdownItem {
  source: MentionSource;
  item: MentionItem;
}

@Component({
  tag: 'pop-mention-input',
  encapsulation: { type: 'scoped' },
  styleUrl: 'mention-input.css',
})
export class PopMentionInput {
  @Element() el: HTMLElement;

  @Prop() placeholder: string = '';

  /** Mention sources. Passed as a property; do not stringify. */
  @Prop() sources: MentionSource[] = [];

  /** If true, the [➕] submit button is disabled regardless of internal state. */
  @Prop() submitDisabled: boolean = false;

  /** Label for the submit button. Default is the ➕ emoji. */
  @Prop() submitButtonLabel: string = '➕';

  /** Optional controlled initial value. */
  @Prop() initialValue?: MentionValue;

  /** Emitted whenever text or mentions change. */
  @Event({ composed: true, bubbles: true }) valueChanged: EventEmitter<MentionValue>;

  /** Emitted when user submits (Enter or click on ➕). */
  @Event({ composed: true, bubbles: true }) submitted: EventEmitter<MentionValue>;

  /** Emitted when a mention is accepted from the popover. */
  @Event({ composed: true, bubbles: true }) mentionAdded: EventEmitter<{ source: string; item: MentionItem }>;

  @State() dropdownItems: InternalDropdownItem[] = [];
  @State() activeIndex: number = 0;
  @State() dropdownOpen: boolean = false;
  @State() hasText: boolean = false;

  private editor?: HTMLDivElement;
  private dropdownEl?: HTMLDivElement;
  // Tracked for future dropdown filtering; not yet read.
  protected activeTrigger: string | null = null;
  protected activeQuery: string = '';

  componentWillLoad() {
    if (this.initialValue) {
      // We'll hydrate after first render via componentDidLoad.
    }
  }

  componentDidLoad() {
    if (this.initialValue && this.editor) {
      this.hydrateFromValue(this.initialValue);
    }
    this.refreshHasText();
  }

  /** Imperatively clear the input (used after submit). */
  @Method()
  async clear(): Promise<void> {
    if (this.editor) {
      this.editor.innerHTML = '';
      this.closeDropdown();
      this.refreshHasText();
      this.emitValue();
    }
  }

  /** Imperatively read current value. */
  @Method()
  async getValue(): Promise<MentionValue> {
    return this.readValue();
  }

  /** Imperatively focus the input. */
  @Method()
  async focusInput(): Promise<void> {
    this.editor?.focus();
  }

  @Watch('initialValue')
  onInitialValueChange(next?: MentionValue) {
    if (next && this.editor) {
      this.hydrateFromValue(next);
      this.refreshHasText();
      this.emitValue();
    }
  }

  // ─────────────────── value <-> DOM ───────────────────

  private readValue(): MentionValue {
    if (!this.editor) return { text: '', mentions: [] };
    const mentions: MentionPill[] = [];
    let text = '';
    this.editor.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.dataset && el.dataset.mentionId) {
          mentions.push({
            source: el.dataset.mentionSource || '',
            trigger: el.dataset.mentionTrigger || '',
            id: el.dataset.mentionId,
            label: el.dataset.mentionLabel || el.textContent || '',
            data: el.dataset.mentionData ? safeJsonParse(el.dataset.mentionData) : undefined,
          });
        } else {
          // Stray element — treat textContent as text
          text += el.textContent || '';
        }
      }
    });
    return { text: text.replace(/ /g, ' ').trim(), mentions };
  }

  private emitValue() {
    this.valueChanged.emit(this.readValue());
  }

  private hydrateFromValue(value: MentionValue) {
    if (!this.editor) return;
    this.editor.innerHTML = '';
    // Simple hydration: append all pills then the text (consumer can override
    // initial order by composing manually if needed)
    value.mentions.forEach(p => {
      this.editor!.appendChild(this.buildPill(p.trigger, p.source, p.id, p.label, p.data));
      this.editor!.appendChild(document.createTextNode(' '));
    });
    if (value.text) this.editor.appendChild(document.createTextNode(value.text));
  }

  private buildPill(trigger: string, sourceLabel: string, id: string, label: string, data?: any): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'pmi__pill';
    span.dataset.mentionTrigger = trigger;
    span.dataset.mentionSource = sourceLabel;
    span.dataset.mentionId = id;
    span.dataset.mentionLabel = label;
    if (data !== undefined) {
      try { span.dataset.mentionData = JSON.stringify(data); } catch { /* ignore */ }
    }
    span.contentEditable = 'false';
    span.textContent = `${trigger}${label}`;
    return span;
  }

  private refreshHasText() {
    const v = this.readValue();
    this.hasText = v.text.length > 0;
  }

  // ─────────────────── trigger detection ───────────────────

  private getCursorContext(): { textNode: Text; before: string; cursorPos: number } | null {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    if (!this.editor?.contains(range.startContainer)) return null;
    if (range.startContainer.nodeType !== Node.TEXT_NODE) return null;
    const textNode = range.startContainer as Text;
    const cursorPos = range.startOffset;
    return { textNode, before: (textNode.textContent || '').slice(0, cursorPos), cursorPos };
  }

  private findTriggerMatch(before: string): { trigger: string; query: string } | null {
    // Find the right-most trigger char preceded by start-or-whitespace
    let bestIdx = -1;
    let bestTrigger = '';
    for (const src of this.sources) {
      const idx = before.lastIndexOf(src.trigger);
      if (idx === -1) continue;
      if (idx > 0 && !/\s/.test(before[idx - 1])) continue;
      // Disallow whitespace in the query portion (mention input is single-token)
      const candidate = before.slice(idx + 1);
      if (/\s/.test(candidate)) continue;
      if (idx > bestIdx) { bestIdx = idx; bestTrigger = src.trigger; }
    }
    if (bestIdx === -1) return null;
    return { trigger: bestTrigger, query: before.slice(bestIdx + 1) };
  }

  private async refreshDropdown() {
    const ctx = this.getCursorContext();
    if (!ctx) { this.closeDropdown(); return; }
    const match = this.findTriggerMatch(ctx.before);
    if (!match) { this.closeDropdown(); return; }

    const eligible = this.sources.filter(s => s.trigger === match.trigger);
    if (eligible.length === 0) { this.closeDropdown(); return; }

    const lowered = match.query.toLowerCase();
    const all: InternalDropdownItem[] = [];
    for (const src of eligible) {
      try {
        const items = await src.resolve(lowered);
        for (const it of items) all.push({ source: src, item: it });
      } catch { /* skip source */ }
    }
    if (all.length === 0) { this.closeDropdown(); return; }

    this.dropdownItems = all;
    this.activeIndex = 0;
    this.activeTrigger = match.trigger;
    this.activeQuery = match.query;
    this.dropdownOpen = true;

    // Position next render tick
    requestAnimationFrame(() => this.positionDropdown());
  }

  private positionDropdown() {
    if (!this.dropdownEl) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    this.dropdownEl.style.left = `${rect.left}px`;
    this.dropdownEl.style.top = `${rect.bottom + 4}px`;
  }

  private closeDropdown() {
    this.dropdownOpen = false;
    this.dropdownItems = [];
    this.activeTrigger = null;
    this.activeQuery = '';
  }

  // ─────────────────── pick + insert ───────────────────

  private acceptItem(entry: InternalDropdownItem) {
    const ctx = this.getCursorContext();
    if (!ctx) { this.closeDropdown(); return; }
    const triggerIdx = ctx.before.lastIndexOf(entry.source.trigger);
    if (triggerIdx === -1) { this.closeDropdown(); return; }

    const text = ctx.textNode.textContent || '';
    const prefix = text.slice(0, triggerIdx);
    const suffix = text.slice(ctx.cursorPos);

    const pill = this.buildPill(entry.source.trigger, entry.source.label, entry.item.id, entry.item.label, entry.item.data);
    const parent = ctx.textNode.parentNode;
    if (!parent) { this.closeDropdown(); return; }

    const prefixNode = document.createTextNode(prefix);
    const spaceNode = document.createTextNode(' ');
    const suffixNode = document.createTextNode(suffix);

    parent.insertBefore(prefixNode, ctx.textNode);
    parent.insertBefore(pill, ctx.textNode);
    parent.insertBefore(spaceNode, ctx.textNode);
    parent.insertBefore(suffixNode, ctx.textNode);
    parent.removeChild(ctx.textNode);

    // Move cursor after the space
    const sel = window.getSelection();
    if (sel) {
      const newRange = document.createRange();
      newRange.setStartAfter(spaceNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    this.mentionAdded.emit({ source: entry.source.label, item: entry.item });
    this.closeDropdown();
    this.refreshHasText();
    this.emitValue();
  }

  // ─────────────────── handlers ───────────────────

  private onInput = () => {
    this.refreshHasText();
    this.emitValue();
    this.refreshDropdown();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.dropdownOpen && this.dropdownItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.activeIndex = (this.activeIndex + 1) % this.dropdownItems.length;
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeIndex = (this.activeIndex - 1 + this.dropdownItems.length) % this.dropdownItems.length;
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        this.acceptItem(this.dropdownItems[this.activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeDropdown();
        return;
      }
    }

    if (e.key === 'Enter') {
      // Submit on Enter when dropdown is closed
      e.preventDefault();
      this.trySubmit();
      return;
    }

    if (e.key === 'Backspace') {
      // Delete pill when cursor sits immediately after one
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (range.collapsed && range.startOffset === 0 && range.startContainer.nodeType === Node.TEXT_NODE) {
        const prev = range.startContainer.previousSibling;
        if (prev && prev.nodeType === Node.ELEMENT_NODE && (prev as HTMLElement).dataset?.mentionId) {
          e.preventDefault();
          (prev as HTMLElement).remove();
          this.refreshHasText();
          this.emitValue();
        }
      }
    }
  };

  private onPaste = (e: ClipboardEvent) => {
    // Only paste plain text into the input
    e.preventDefault();
    const txt = e.clipboardData?.getData('text/plain') || '';
    if (!txt) return;
    document.execCommand('insertText', false, txt);
  };

  private trySubmit = () => {
    if (this.submitDisabled) return;
    const value = this.readValue();
    if (!value.text) return;
    this.submitted.emit(value);
  };

  render() {
    const submitDisabled = this.submitDisabled || !this.hasText;
    return (
      <div class="pmi">
        <div class="pmi__field">
          <div
            class="pmi__editor"
            contentEditable={true}
            role="textbox"
            aria-multiline="false"
            data-placeholder={this.placeholder}
            ref={el => { this.editor = el as HTMLDivElement; }}
            onInput={this.onInput}
            onKeyDown={this.onKeyDown}
            onPaste={this.onPaste}
            onBlur={() => setTimeout(() => this.closeDropdown(), 120)}
          />
          <button
            type="button"
            class="pmi__submit"
            disabled={submitDisabled}
            aria-label="Submit"
            onClick={this.trySubmit}
          >
            {/* Default: a white `+` glyph on the brand-gradient circle (the ➕
                emoji ignores `color`, so it reads muddy). A host may still pass a
                custom `submitButtonLabel` (e.g. "Send") to override. */}
            {this.submitButtonLabel && this.submitButtonLabel !== '➕' ? (
              this.submitButtonLabel
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </button>
        </div>
        {this.dropdownOpen && this.dropdownItems.length > 0 && (
          <div class="pmi__dropdown" ref={el => { this.dropdownEl = el as HTMLDivElement; }} role="listbox">
            {this.renderGroupedItems()}
          </div>
        )}
      </div>
    );
  }

  private renderGroupedItems() {
    // Group by source.label preserving discovery order
    const groups = new Map<string, InternalDropdownItem[]>();
    this.dropdownItems.forEach(entry => {
      const key = entry.source.label;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    });
    let flatIdx = 0;
    const out: any[] = [];
    groups.forEach((items, label) => {
      if (groups.size > 1) {
        out.push(<div class="pmi__group-header">{label}</div>);
      }
      items.forEach(entry => {
        const isActive = flatIdx === this.activeIndex;
        const currentIdx = flatIdx;
        out.push(
          <button
            type="button"
            role="option"
            aria-selected={isActive ? 'true' : 'false'}
            class={{ 'pmi__opt': true, 'pmi__opt--active': isActive }}
            onMouseDown={(ev) => { ev.preventDefault(); this.acceptItem(entry); }}
            onMouseEnter={() => { this.activeIndex = currentIdx; }}
          >
            {entry.item.avatar
              ? <span class="pmi__opt-avatar"><img src={entry.item.avatar} alt="" /></span>
              : entry.item.icon
                ? <span class="pmi__opt-icon">{entry.item.icon}</span>
                : <span class="pmi__opt-icon">{entry.source.trigger}</span>}
            <span class="pmi__opt-label">{entry.item.label}</span>
          </button>
        );
        flatIdx++;
      });
    });
    return out;
  }
}

function safeJsonParse(s: string): any {
  try { return JSON.parse(s); } catch { return undefined; }
}
