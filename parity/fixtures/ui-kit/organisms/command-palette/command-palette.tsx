import {
  Component,
  Prop,
  State,
  Event,
  EventEmitter,
  Element,
  Watch,
  Listen,
  Host,
  h,
} from '@stencil/core';

/**
 * pop-command-palette — the keyboard-first Cmd-K front door (organism).
 *
 * A global overlay that pairs a search input with a sectioned, flat-navigable
 * result list. It is intentionally **presentation-only + generic**: the host
 * app (notes-app) owns the data — it runs the `notesSearch` engine, debounces,
 * and feeds back `sections` (JUMP TO / FULL-TEXT / COMMANDS / …). The palette
 * owns the interaction model: focus trap, ↑/↓ across sections, Enter to
 * activate, Esc to close, ARIA combobox + listbox, reduced-motion, and a
 * full-screen sheet on mobile.
 *
 * Phase 5 wires JUMP TO (fuzzy titles), FULL-TEXT (Dexie bodies) and COMMANDS.
 * The ASK YOUR BRAIN section (Tab to ask → streamed RAG) is **Phase 6**; the
 * palette renders an Ask affordance row only when the host supplies an `ask`
 * section, and emits `popAsk` — it never calls a model itself.
 *
 * See planned/notes-app-digital-brain/{components,screens,search-and-ai}.mdx.
 */

/** One activatable row. `kind` lets the host route the activation. */
export interface PaletteItem {
  /** Stable id (noteId for notes, command id for actions). */
  id: string;
  /** Primary label / title. */
  label: string;
  /** Secondary line (snippet, shortcut hint, tag). */
  detail?: string;
  /** Leading glyph / emoji. */
  icon?: string;
  /** Routing hint for the host's `popSelect` handler. */
  kind?: 'note' | 'command' | 'ask';
}

export interface PaletteSection {
  /** Section heading, e.g. "JUMP TO", "FULL-TEXT", "COMMANDS". */
  heading: string;
  items: PaletteItem[];
  /** Renders the "(Tab to ask)" affordance hint on the heading row. */
  askHint?: boolean;
}

interface FlatRow {
  item: PaletteItem;
  /** Global index across all sections (for roving selection). */
  index: number;
}

@Component({
  tag: 'pop-command-palette',
  encapsulation: { type: 'scoped' },
  styleUrl: 'command-palette.css',
})
export class PopCommandPalette {
  @Element() el!: HTMLElement;

  /** Overlay visibility. */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Sections to render. Accepts an array (property) or JSON string (attr). */
  @Prop() sections: PaletteSection[] | string = [];

  /** Current query value (controlled by the host). */
  @Prop({ mutable: true }) query = '';

  /** Placeholder for the input. */
  @Prop() placeholder = 'Search or ask your brain…';

  /** Loading spinner in the input affordance. */
  @Prop() loading = false;

  /** Empty-state copy shown when there's a query but no results. */
  @Prop() emptyLabel = 'No matches';

  /** Index of the currently highlighted flat row. */
  @State() active = 0;

  /** Fires on every input keystroke (host debounces + runs notesSearch). */
  @Event({ composed: true, bubbles: true }) popQueryChange!: EventEmitter<string>;
  /** Fires when a row is activated (Enter / click). */
  @Event({ composed: true, bubbles: true }) popSelect!: EventEmitter<PaletteItem>;
  /** Fires on Tab from the input → host expands the Ask flow (Phase 6). */
  @Event({ composed: true, bubbles: true }) popAsk!: EventEmitter<string>;
  /** Fires when the palette closes (Esc / backdrop / select). */
  @Event({ composed: true, bubbles: true }) popClose!: EventEmitter<void>;

  /** Element focused before the palette opened — restored on close. */
  private lastFocused: HTMLElement | null = null;
  private inputEl?: HTMLInputElement;

  private parseSections(): PaletteSection[] {
    if (typeof this.sections === 'string') {
      try {
        return JSON.parse(this.sections) as PaletteSection[];
      } catch {
        return [];
      }
    }
    return this.sections ?? [];
  }

  /** Flattened, globally-indexed rows for roving selection. */
  private get rows(): FlatRow[] {
    const out: FlatRow[] = [];
    let i = 0;
    for (const s of this.parseSections()) {
      for (const item of s.items ?? []) out.push({ item, index: i++ });
    }
    return out;
  }

  @Watch('open')
  onOpenChange(next: boolean, prev: boolean) {
    if (next && !prev) {
      this.lastFocused = (document.activeElement as HTMLElement) ?? null;
      this.active = 0;
      // Focus the input after the overlay mounts.
      requestAnimationFrame(() => this.inputEl?.focus());
    } else if (!next && prev) {
      // Restore focus to whatever opened us (the topbar pill, usually).
      this.lastFocused?.focus?.();
      this.lastFocused = null;
    }
  }

  @Watch('sections')
  onSectionsChange() {
    // Keep the active row in range as results change under the cursor.
    const max = Math.max(0, this.rows.length - 1);
    if (this.active > max) this.active = max;
  }

  private close = () => {
    if (!this.open) return;
    this.open = false;
    this.popClose.emit();
  };

  private activate(item: PaletteItem) {
    this.popSelect.emit(item);
  }

  private move(delta: number) {
    const n = this.rows.length;
    if (!n) return;
    this.active = (this.active + delta + n) % n;
    // Scroll the active row into view.
    requestAnimationFrame(() => {
      const node = this.el.querySelector(`[data-row="${this.active}"]`) as HTMLElement | null;
      node?.scrollIntoView({ block: 'nearest' });
    });
  }

  /** Global key handling while open (focus is trapped on the input). */
  @Listen('keydown', { target: 'window' })
  onKeydown(ev: KeyboardEvent) {
    if (!this.open) return;
    switch (ev.key) {
      case 'Escape':
        ev.preventDefault();
        this.close();
        break;
      case 'ArrowDown':
        ev.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        ev.preventDefault();
        this.move(-1);
        break;
      case 'Enter': {
        ev.preventDefault();
        const row = this.rows[this.active];
        if (row) this.activate(row.item);
        break;
      }
      case 'Tab': {
        // Trap focus on the input; Tab triggers the Phase-6 Ask affordance.
        ev.preventDefault();
        if (this.query.trim()) this.popAsk.emit(this.query.trim());
        break;
      }
      default:
        break;
    }
  }

  private onInput = (e: Event) => {
    const v = (e.target as HTMLInputElement).value;
    this.query = v;
    this.active = 0;
    this.popQueryChange.emit(v);
  };

  private renderInput() {
    return (
      <div class="cp-inputrow">
        <svg
          class="cp-search-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={(el) => (this.inputEl = el as HTMLInputElement)}
          class="cp-input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="cp-listbox"
          aria-activedescendant={`cp-row-${this.active}`}
          aria-autocomplete="list"
          aria-label="Search or ask your brain"
          placeholder={this.placeholder}
          value={this.query}
          autocomplete="off"
          spellcheck={false}
          onInput={this.onInput}
        />
        {this.loading && <span class="cp-spinner" aria-hidden="true" />}
      </div>
    );
  }

  private renderRows() {
    const sections = this.parseSections();
    const hasAny = sections.some((s) => (s.items ?? []).length > 0);

    if (!hasAny) {
      return (
        <div class="cp-empty" role="status">
          <span class="cp-empty-icon" aria-hidden="true"><pop-brand-icon name="search" /></span>
          <span class="cp-empty-text">{this.query.trim() ? this.emptyLabel : 'Type to search your brain'}</span>
        </div>
      );
    }

    // Single global counter so each row's index matches `this.rows`.
    let idx = 0;
    return (
      <ul class="cp-list" id="cp-listbox" role="listbox" aria-label="Results">
        {sections.map((section) =>
          (section.items ?? []).length === 0
            ? null
            : [
                <li class="cp-heading" role="presentation">
                  <span>{section.heading}</span>
                  {section.askHint && <span class="cp-heading-hint">Tab to ask</span>}
                </li>,
                ...section.items.map((item) => {
                  const i = idx++;
                  const isActive = i === this.active;
                  return (
                    <li
                      id={`cp-row-${i}`}
                      data-row={i}
                      class={{ 'cp-row': true, 'is-active': isActive }}
                      role="option"
                      aria-selected={isActive ? 'true' : 'false'}
                      onMouseEnter={() => (this.active = i)}
                      onClick={() => this.activate(item)}
                    >
                      <span class="cp-row-icon" aria-hidden="true">
                        <pop-brand-icon name={item.icon || 'dot-outline'} />
                      </span>
                      <span class="cp-row-body">
                        <span class="cp-row-label">{item.label || 'Untitled'}</span>
                        {item.detail && <span class="cp-row-detail">{item.detail}</span>}
                      </span>
                      {isActive && <kbd class="cp-row-enter" aria-hidden="true">↵</kbd>}
                    </li>
                  );
                }),
              ],
        )}
      </ul>
    );
  }

  render() {
    if (!this.open) return <Host aria-hidden="true" />;
    return (
      <Host>
        <div class="cp-backdrop" onClick={this.close} />
        <div
          class="cp-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          onClick={(e) => e.stopPropagation()}
        >
          {this.renderInput()}
          <div class="cp-results">{this.renderRows()}</div>
          <div class="cp-footer" aria-hidden="true">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> open</span>
            <span><kbd>tab</kbd> ask</span>
            <span><kbd>esc</kbd> close</span>
          </div>
        </div>
      </Host>
    );
  }
}
