import { Component, h, Prop, State, Event, EventEmitter, Element } from '@stencil/core';

/**
 * pop-location-picker
 *
 * Location-first place picker for a task. Presentational only — the host
 * passes the current `value` (JSON of a TaskLocation), the available `spaces`,
 * and the picked `spaceValue` (room→space ids). All persistence (Firestore)
 * stays with the host; this component only emits events.
 *
 * A task's place is ONE of:
 *   - { kind: 'home' }                        → the special floor-plan location
 *   - { kind: 'place', label, lat, lon, osmId? } → a real address (OSM)
 *
 * When "🏠 Home" is selected we render the existing <pop-space-picker> INLINE
 * beneath so the user can pick the room→space; its events are re-emitted so the
 * host wires them exactly as before. When an address is selected the space
 * picker is hidden.
 *
 * Spec: floor-plan/location-first.
 */

/** Mirrors tasks-core / tasks-app `TaskLocation`. */
export type TaskLocation =
  | { kind: 'home' }
  | { kind: 'place'; label: string; lat: number; lon: number; osmId?: string };

/** Minimal space shape (mirrors pop-space-picker's Space). */
export interface LpSpace {
  id: string;
  name: string;
  icon: string;
  room?: string;
  roomId?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  osm_type?: string;
  osm_id?: number;
}

interface PlaceOption {
  label: string;
  lat: number;
  lon: number;
  osmId?: string;
}

@Component({
  tag: 'pop-location-picker',
  encapsulation: { type: 'scoped' },
  styleUrl: 'location-picker.css',
})
export class PopLocationPicker {
  @Element() el!: HTMLElement;

  /** JSON of the current TaskLocation, or '' / 'null' for none. */
  @Prop() value: string = 'null';

  /** Picked room→space ids as JSON array (passthrough to pop-space-picker). */
  @Prop() spaceValue: string = '[]';

  /** Available spaces for the inline space picker (JSON array of LpSpace). */
  @Prop() spaces: string = '[]';

  /** Whether the inline space picker shows its "+ New space" entry. */
  @Prop() allowCreateSpace: boolean = true;

  /** Emitted when the chosen location changes. Detail = TaskLocation | null. */
  @Event({ composed: true, bubbles: true }) locationChange: EventEmitter<TaskLocation | null>;

  /** Re-emitted from the inline space picker — host persists `spaceIds`. */
  @Event({ composed: true, bubbles: true }) spaceValueChanged: EventEmitter<string[]>;

  /** Re-emitted from the inline space picker — host creates a Space. */
  @Event({ composed: true, bubbles: true }) spaceCreateRequested: EventEmitter<{
    name: string;
    icon: string;
    room?: string;
  }>;

  @State() open: boolean = false;
  @State() query: string = '';
  @State() results: PlaceOption[] = [];
  @State() loading: boolean = false;
  @State() error: string | null = null;

  private debounceTimer: any = null;
  private reqSeq = 0;

  private get parsedValue(): TaskLocation | null {
    try {
      const v = JSON.parse(this.value || 'null');
      if (v && (v.kind === 'home' || v.kind === 'place')) return v;
      return null;
    } catch {
      return null;
    }
  }

  private get parsedSpaces(): LpSpace[] {
    try {
      return JSON.parse(this.spaces) ?? [];
    } catch {
      return [];
    }
  }

  private get parsedSpaceValue(): string[] {
    try {
      return JSON.parse(this.spaceValue) ?? [];
    } catch {
      return [];
    }
  }

  // ─────────────── Nominatim autocomplete ───────────────

  /**
   * Query OpenStreetMap Nominatim. Nominatim asks consumers to keep to ~1
   * request/second and to identify themselves — browsers can't set a custom
   * User-Agent (forbidden header), which is fine for this low-volume, on-type
   * use. We debounce ~400ms (below) so we never burst. Fails soft: any
   * network/rate-limit/parse error surfaces a gentle "no results" and never
   * throws.
   */
  private async runSearch(q: string) {
    const seq = ++this.reqSeq;
    this.loading = true;
    this.error = null;
    try {
      const url =
        'https://nominatim.openstreetmap.org/search' +
        '?format=jsonv2&addressdetails=1&limit=5&accept-language=en' +
        `&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: NominatimResult[] = await res.json();
      // Ignore stale responses (a newer keystroke already fired).
      if (seq !== this.reqSeq) return;
      this.results = (data ?? []).map((r) => ({
        label: r.display_name,
        lat: +r.lat,
        lon: +r.lon,
        osmId: r.osm_type && r.osm_id != null ? `${r.osm_type}${r.osm_id}` : undefined,
      }));
      this.loading = false;
    } catch {
      if (seq !== this.reqSeq) return;
      // Fail soft — never throw, never block the UI.
      this.results = [];
      this.loading = false;
      this.error = 'No results — try again.';
    }
  }

  private onQueryInput = (e: Event) => {
    const q = (e.target as HTMLInputElement).value;
    this.query = q;
    this.error = null;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    const trimmed = q.trim();
    if (trimmed.length < 3) {
      this.results = [];
      this.loading = false;
      return;
    }
    // ~400ms debounce keeps us well under Nominatim's ~1 req/sec etiquette.
    this.debounceTimer = setTimeout(() => this.runSearch(trimmed), 400);
  };

  // ─────────────── selection ───────────────

  private selectHome = () => {
    this.locationChange.emit({ kind: 'home' });
    this.open = false;
    this.query = '';
    this.results = [];
  };

  private selectPlace = (p: PlaceOption) => {
    this.locationChange.emit({
      kind: 'place',
      label: p.label,
      lat: p.lat,
      lon: p.lon,
      ...(p.osmId ? { osmId: p.osmId } : {}),
    });
    this.open = false;
    this.query = '';
    this.results = [];
  };

  private clearLocation = (e: Event) => {
    e.stopPropagation();
    this.locationChange.emit(null);
  };

  private openPopover = () => {
    this.open = true;
  };

  private onOuterClick = (e: MouseEvent) => {
    if (!this.el.contains(e.target as Node)) {
      this.open = false;
    }
  };

  connectedCallback() {
    document.addEventListener('mousedown', this.onOuterClick);
  }

  disconnectedCallback() {
    document.removeEventListener('mousedown', this.onOuterClick);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  // ─────────────── render ───────────────

  private renderField() {
    const v = this.parsedValue;
    let label = 'Set a location…';
    let icon = '📍';
    let placeholder = true;
    if (v?.kind === 'home') {
      label = 'Home';
      icon = '🏠';
      placeholder = false;
    } else if (v?.kind === 'place') {
      label = v.label;
      icon = '📍';
      placeholder = false;
    }
    return (
      <button
        type="button"
        class="plp__field"
        aria-haspopup="dialog"
        aria-expanded={this.open ? 'true' : 'false'}
        onClick={this.openPopover}
      >
        <span class="plp__field-icon" aria-hidden="true">{icon}</span>
        <span class={{ 'plp__field-label': true, 'plp__field-label--placeholder': placeholder }}>
          {label}
        </span>
        {!placeholder && (
          <span
            class="plp__field-clear"
            role="button"
            aria-label="Clear location"
            onClick={this.clearLocation}
          >
            ×
          </span>
        )}
      </button>
    );
  }

  private renderPopover() {
    const v = this.parsedValue;
    const homeSelected = v?.kind === 'home';
    return (
      <div class="plp__popover" role="dialog">
        <input
          type="text"
          class="plp__search"
          placeholder="Search an address…"
          value={this.query}
          onInput={this.onQueryInput}
        />
        <ul class="plp__list" role="listbox">
          {/* Pinned default — always first, regardless of query. */}
          <li
            class={{ 'plp__opt': true, 'plp__opt--home': true, 'plp__opt--picked': homeSelected }}
            role="option"
            aria-selected={homeSelected ? 'true' : 'false'}
            onClick={this.selectHome}
          >
            <span class="plp__opt-icon" aria-hidden="true">🏠</span>
            <span class="plp__opt-label">Home</span>
            {homeSelected && <span class="plp__opt-check" aria-hidden="true">✓</span>}
          </li>

          {this.loading && <li class="plp__hint">Searching…</li>}
          {!this.loading && this.error && <li class="plp__hint">{this.error}</li>}
          {!this.loading &&
            !this.error &&
            this.query.trim().length >= 3 &&
            this.results.length === 0 && <li class="plp__hint">No results — try again.</li>}

          {this.results.map((p) => (
            <li
              class="plp__opt"
              role="option"
              aria-selected={v?.kind === 'place' && v.osmId === p.osmId ? 'true' : 'false'}
              onClick={() => this.selectPlace(p)}
            >
              <span class="plp__opt-icon" aria-hidden="true">📍</span>
              <span class="plp__opt-label">{p.label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  render() {
    const v = this.parsedValue;
    const showSpacePicker = v?.kind === 'home';
    return (
      <div class="plp">
        {/* Field + popover share a relative wrapper so the autocomplete
            dropdown anchors to the INPUT (overlaying the Room section below),
            not to the bottom of the whole component. */}
        <div class="plp__field-wrap">
          {this.renderField()}
          {this.open && this.renderPopover()}
        </div>
        {showSpacePicker && (
          <div class="plp__spaces">
            <label class="plp__spaces-label">Room</label>
            <pop-space-picker
              value={this.parsedSpaceValue}
              spaces={this.parsedSpaces as any}
              allowCreate={this.allowCreateSpace}
              onValueChanged={(ev: CustomEvent<string[]>) => {
                ev.stopPropagation();
                this.spaceValueChanged.emit(ev.detail);
              }}
              onSpaceCreateRequested={(
                ev: CustomEvent<{ name: string; icon: string; room?: string }>,
              ) => {
                ev.stopPropagation();
                this.spaceCreateRequested.emit(ev.detail);
              }}
            />
          </div>
        )}
      </div>
    );
  }
}
