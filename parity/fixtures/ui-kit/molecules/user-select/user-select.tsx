import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  State,
  h,
} from '@stencil/core';

/** One person — either resolved from a directory or entered as free-text email.
 *  `email` is the canonical de-dup key; `id` is kept when the source has one. */
export interface UserOption {
  /** Stable id from the source (uid / contact id). Absent for free-text emails. */
  id?: string;
  /** Display name. */
  name?: string;
  /** Email address — canonical key; the only field a free-text entry carries. */
  email?: string;
  /** Avatar image URL. */
  avatar?: string;
}

/** Injected async source: given the typed query, return matching people.
 *  Keeps the component API-agnostic — the host decides where users come from
 *  (hub → /api/hub/contacts, tasks-app → local /users mirror, …). */
export type UserResolver = (query: string) => Promise<UserOption[]>;

/**
 * pop-user-select — a reusable, drop-anywhere people picker.
 *
 * A chip field + suggestion popover driven entirely by an injected async
 * `resolve(query)` source, so it carries no knowledge of any backend. Selected
 * people render as removable chips; typing debounce-searches the source and
 * shows avatar/name/email rows in a popover. With `allow-free-text`, a typed
 * email that matches nothing can be added as a manual chip.
 *
 * @example
 *   <pop-user-select
 *     value={attendees}
 *     allow-free-text
 *     placeholder="Invite…"
 *     // resolve is a property (function) — set it in JS, not as an attribute:
 *     ref={(el) => (el.resolve = (q) => hubApi.searchContacts(q))}
 *     onValueChanged={(e) => setAttendees(e.detail)} />
 */
@Component({
  tag: 'pop-user-select',
  encapsulation: { type: 'scoped' },
  styleUrl: 'user-select.css',
})
export class PopUserSelect {
  @Element() el!: HTMLElement;

  /** Async source returning matches for a query. REQUIRED for search to work. */
  @Prop() resolve?: UserResolver;
  /** Selected people (controlled). */
  @Prop({ mutable: true }) value: UserOption[] = [];
  /** Accept a typed email that matches no suggestion as a manual chip. */
  @Prop() allowFreeText = false;
  /** Placeholder shown when nothing is selected. */
  @Prop() placeholder = 'Search people…';
  /** Accessible label for the field + popover. */
  @Prop() label = 'People';
  /** Max selections (0 = unlimited). */
  @Prop() max = 0;
  /** Debounce (ms) before each resolve() call. */
  @Prop() debounce = 250;
  /** Minimum characters before searching. */
  @Prop() minChars = 1;

  /** Emitted whenever the selection changes (add / remove). */
  @Event({ composed: true, bubbles: true }) valueChanged!: EventEmitter<UserOption[]>;

  @State() draft = '';
  @State() results: UserOption[] = [];
  @State() open = false;
  @State() busy = false;
  @State() active = -1;

  private timer?: ReturnType<typeof setTimeout>;
  private inputRef?: HTMLInputElement;

  connectedCallback() {
    document.addEventListener('click', this.onDocClick);
  }
  disconnectedCallback() {
    document.removeEventListener('click', this.onDocClick);
    clearTimeout(this.timer);
  }

  private onDocClick = (e: MouseEvent) => {
    if (this.open && !this.el.contains(e.target as Node)) this.close();
  };

  private selected(): UserOption[] {
    return Array.isArray(this.value) ? this.value : [];
  }

  private key(o: UserOption): string {
    return (o.email || o.id || o.name || '').toLowerCase();
  }

  private has(o: UserOption): boolean {
    const k = this.key(o);
    return this.selected().some((v) => this.key(v) === k);
  }

  private commit(next: UserOption[]) {
    this.value = next;
    this.valueChanged.emit([...next]);
  }

  private add(o: UserOption) {
    if (!o || !this.key(o) || this.has(o)) return this.reset();
    if (this.max && this.selected().length >= this.max) return;
    this.commit([...this.selected(), o]);
    this.reset();
  }

  private remove(i: number) {
    const next = this.selected().slice();
    next.splice(i, 1);
    this.commit(next);
  }

  private reset() {
    this.draft = '';
    this.results = [];
    this.close();
    this.inputRef?.focus();
  }

  private close() {
    this.open = false;
    this.active = -1;
  }

  private isEmail(s: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  private onInput = (e: Event) => {
    const q = (e.target as HTMLInputElement).value;
    this.draft = q;
    this.active = -1;
    clearTimeout(this.timer);
    const trimmed = q.trim();
    if (trimmed.length < this.minChars || !this.resolve) {
      this.results = [];
      this.open = this.allowFreeText && this.isEmail(trimmed);
      return;
    }
    this.busy = true;
    this.open = true;
    this.timer = setTimeout(() => void this.search(trimmed), this.debounce);
  };

  private async search(q: string) {
    try {
      const raw = (await this.resolve?.(q)) ?? [];
      this.results = raw.filter((o) => !this.has(o)).slice(0, 8);
    } catch {
      this.results = [];
    } finally {
      this.busy = false;
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const draftEmail = this.allowFreeText && this.isEmail(this.draft.trim());
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.open = true;
      this.active = Math.min(this.active + 1, this.results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.active = Math.max(this.active - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.active >= 0 && this.results[this.active]) this.add(this.results[this.active]);
      else if (draftEmail) this.add({ email: this.draft.trim() });
    } else if (e.key === 'Escape') {
      if (this.open) {
        e.stopPropagation();
        this.close();
      }
    } else if (e.key === 'Backspace' && !this.draft && this.selected().length) {
      this.remove(this.selected().length - 1);
    }
  };

  private avatarFor(o: UserOption, cls: string) {
    if (o.avatar) return <img class={cls} src={o.avatar} alt="" loading="lazy" />;
    const ch = (o.name || o.email || '?').charAt(0).toUpperCase();
    return (
      <span class={`${cls} ${cls}--ph`} aria-hidden="true">
        {ch}
      </span>
    );
  }

  render() {
    const draft = this.draft.trim();
    const draftEmail = this.allowFreeText && this.isEmail(draft);
    const dupDraft = this.results.some((r) => this.key(r) === draft.toLowerCase());
    const showPop = this.open && (this.busy || this.results.length > 0 || draftEmail || draft.length > 0);
    return (
      <div class={{ pus: true, 'pus--open': this.open }}>
        <div class="pus__field" onClick={() => this.inputRef?.focus()}>
          {this.selected().map((o, i) => (
            <span class="pus__chip" key={this.key(o) || i}>
              {this.avatarFor(o, 'pus__chip-av')}
              <span class="pus__chip-label">{o.name || o.email}</span>
              <button
                type="button"
                class="pus__chip-x"
                aria-label={`Remove ${o.name || o.email}`}
                onClick={(ev) => {
                  ev.stopPropagation();
                  this.remove(i);
                }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            class="pus__input"
            ref={(el) => (this.inputRef = el as HTMLInputElement)}
            type="text"
            role="combobox"
            aria-expanded={String(this.open)}
            aria-autocomplete="list"
            aria-label={this.label}
            placeholder={this.selected().length ? '' : this.placeholder}
            value={this.draft}
            onInput={this.onInput}
            onKeyDown={this.onKeyDown}
            onFocus={() => {
              if (this.draft.trim().length >= this.minChars || draftEmail) this.open = true;
            }}
          />
        </div>
        {showPop && (
          <div class="pus__pop" role="listbox" aria-label={this.label}>
            {this.busy && this.results.length === 0 && <div class="pus__hint">Searching…</div>}
            {this.results.map((o, i) => (
              <button
                type="button"
                key={this.key(o) || i}
                class={{ pus__opt: true, 'pus__opt--active': i === this.active }}
                role="option"
                aria-selected={String(i === this.active)}
                onMouseEnter={() => (this.active = i)}
                onClick={() => this.add(o)}
              >
                {this.avatarFor(o, 'pus__opt-av')}
                <span class="pus__opt-text">
                  <span class="pus__opt-name">{o.name || o.email}</span>
                  {o.name && o.email && <span class="pus__opt-email">{o.email}</span>}
                </span>
              </button>
            ))}
            {draftEmail && !dupDraft && (
              <button
                type="button"
                class="pus__opt pus__opt--add"
                role="option"
                onClick={() => this.add({ email: draft })}
              >
                <span class="pus__opt-av pus__opt-av--ph" aria-hidden="true">
                  +
                </span>
                <span class="pus__opt-text">
                  <span class="pus__opt-name">Add “{draft}”</span>
                </span>
              </button>
            )}
            {!this.busy && this.results.length === 0 && !draftEmail && (
              <div class="pus__hint">No matches</div>
            )}
          </div>
        )}
      </div>
    );
  }
}
