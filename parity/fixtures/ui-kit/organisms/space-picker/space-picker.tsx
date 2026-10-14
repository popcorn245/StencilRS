import { Component, h, Prop, State, Event, EventEmitter, Element } from '@stencil/core';

/**
 * pop-space-picker
 *
 * Multi-select chip picker for Spaces. Presentational only: the caller passes
 * the available `spaces` array and the picked `value` (array of space IDs).
 * Writes (creating a new Space, persisting selection) are the caller's
 * responsibility — this component only emits events.
 *
 * Spec: tasks-app/components.mdx §7 + task-entity/schema.mdx (Space contract).
 */
export interface Space {
  /** nanoid, doc id */
  id: string;
  /** display name, e.g. "Kitchen" */
  name: string;
  /** emoji or icon key, e.g. "🍳" */
  icon: string;
  /** optional categorical descriptor: "kitchen" | "office" | ... */
  room?: string;
  /** canonical floor-plan room id (floorplan-core Room.id), when resolved. */
  roomId?: string;
}

@Component({
  tag: 'pop-space-picker',
  encapsulation: { type: 'scoped' },
  styleUrl: 'space-picker.css',
})
export class PopSpacePicker {
  @Element() el: HTMLElement;

  /** Currently picked space IDs. */
  @Prop({ mutable: true }) value: string[] = [];

  /** Available spaces — caller provides; component is presentational. */
  @Prop() spaces: Space[] = [];

  /** Placeholder shown when no spaces are selected. */
  @Prop() placeholder: string = 'Select spaces…';

  /** Whether to show the "+ New space" entry at popover bottom. */
  @Prop() allowCreate: boolean = true;

  /** Emitted when the picked set changes. Detail = new ID list. */
  @Event({ composed: true, bubbles: true }) valueChanged: EventEmitter<string[]>;

  /** Emitted when user submits the "+ New space" mini-form. */
  @Event({ composed: true, bubbles: true }) spaceCreateRequested: EventEmitter<{
    name: string;
    icon: string;
    room?: string;
  }>;

  @State() open: boolean = false;
  @State() query: string = '';
  @State() showCreateForm: boolean = false;
  @State() createName: string = '';
  @State() createIcon: string = '📦';
  @State() createRoom: string = '';

  private onChipRemove(id: string, e: Event) {
    e.stopPropagation();
    const next = (this.value ?? []).filter(v => v !== id);
    this.value = next;
    this.valueChanged.emit(next);
  }

  private toggleSpace(id: string) {
    const current = this.value ?? [];
    const next = current.includes(id)
      ? current.filter(v => v !== id)
      : [...current, id];
    this.value = next;
    this.valueChanged.emit(next);
  }

  private openPopover = () => {
    this.open = true;
  };

  private closePopover = () => {
    this.open = false;
    this.showCreateForm = false;
    this.query = '';
  };

  private onOuterClick = (e: MouseEvent) => {
    if (!this.el.contains(e.target as Node)) {
      this.closePopover();
    }
  };

  connectedCallback() {
    document.addEventListener('mousedown', this.onOuterClick);
  }

  disconnectedCallback() {
    document.removeEventListener('mousedown', this.onOuterClick);
  }

  private submitCreate = (e: Event) => {
    e.preventDefault();
    const name = this.createName.trim();
    if (!name) return;
    this.spaceCreateRequested.emit({
      name,
      icon: this.createIcon || '📦',
      room: this.createRoom.trim() || undefined,
    });
    this.createName = '';
    this.createIcon = '📦';
    this.createRoom = '';
    this.showCreateForm = false;
  };

  private filteredSpaces(): Space[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.spaces;
    return this.spaces.filter(s =>
      s.name.toLowerCase().includes(q) || (s.room?.toLowerCase().includes(q) ?? false)
    );
  }

  render() {
    const picked = this.value ?? [];
    const byId = new Map(this.spaces.map(s => [s.id, s] as const));
    const chips = picked.map(id => byId.get(id)).filter(Boolean) as Space[];

    return (
      <div class="psp">
        <button
          type="button"
          class="psp__field"
          aria-haspopup="listbox"
          aria-expanded={this.open ? 'true' : 'false'}
          onClick={this.openPopover}
        >
          {chips.length === 0 && (
            <span class="psp__placeholder">{this.placeholder}</span>
          )}
          {chips.map(s => (
            <span class="psp__chip" key={s.id}>
              <span class="psp__chip-icon">{s.icon}</span>
              <span class="psp__chip-label">{s.name}</span>
              <button
                type="button"
                class="psp__chip-remove"
                aria-label={`Remove ${s.name}`}
                onClick={(e) => this.onChipRemove(s.id, e)}
              >
                ×
              </button>
            </span>
          ))}
        </button>

        {this.open && (
          <div class="psp__popover" role="dialog">
            <input
              type="text"
              class="psp__search"
              placeholder="Search spaces…"
              value={this.query}
              onInput={(e) => this.query = (e.target as HTMLInputElement).value}
            />

            <ul class="psp__list" role="listbox">
              {this.filteredSpaces().map(s => {
                const isPicked = picked.includes(s.id);
                return (
                  <li
                    class={{ 'psp__opt': true, 'psp__opt--picked': isPicked }}
                    role="option"
                    aria-selected={isPicked ? 'true' : 'false'}
                    key={s.id}
                    onClick={() => this.toggleSpace(s.id)}
                  >
                    <span class="psp__opt-icon">{s.icon}</span>
                    <span class="psp__opt-name">{s.name}</span>
                    {s.room && <span class="psp__opt-room">{s.room}</span>}
                    {isPicked && <span class="psp__opt-check">✓</span>}
                  </li>
                );
              })}
              {this.filteredSpaces().length === 0 && (
                <li class="psp__empty">No matching spaces.</li>
              )}
            </ul>

            {this.allowCreate && !this.showCreateForm && (
              <button
                type="button"
                class="psp__new"
                onClick={() => { this.showCreateForm = true; }}
              >
                + New space
              </button>
            )}

            {this.allowCreate && this.showCreateForm && (
              <form class="psp__create" onSubmit={this.submitCreate}>
                <div class="psp__create-row">
                  <input
                    type="text"
                    class="psp__create-icon"
                    aria-label="Icon"
                    maxLength={4}
                    value={this.createIcon}
                    onInput={(e) => this.createIcon = (e.target as HTMLInputElement).value}
                  />
                  <input
                    type="text"
                    class="psp__create-name"
                    aria-label="Space name"
                    placeholder="Name (e.g. Kitchen)"
                    value={this.createName}
                    onInput={(e) => this.createName = (e.target as HTMLInputElement).value}
                  />
                </div>
                <input
                  type="text"
                  class="psp__create-room"
                  aria-label="Room category (optional)"
                  placeholder="Room category (optional)"
                  value={this.createRoom}
                  onInput={(e) => this.createRoom = (e.target as HTMLInputElement).value}
                />
                <div class="psp__create-actions">
                  <button type="button" onClick={() => { this.showCreateForm = false; }}>Cancel</button>
                  <button type="submit" disabled={!this.createName.trim()}>Create</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    );
  }
}
