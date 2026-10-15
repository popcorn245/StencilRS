import { Component, h, Prop, State, Event, EventEmitter, Element } from '@stencil/core';
import {
  readLocation, writeLocation, LOCATION_EVENT,
  mapPhoton, mapNominatimReverse, mapIpapi,
  type ResolvedLocation, type Suggestion,
} from './location-store';

/**
 * pop-location — a self-contained, reusable location picker.
 *
 * Collapsed: ONE button showing the current place (pin + label) or "Set
 * Location". Tap → a popover with a single "ZIP or town" input that has a
 * find-my-location icon on its right edge, OpenStreetMap (Photon) autocomplete
 * suggestions under it, and a GPS→reverse-geocode (Nominatim) / IP (ipapi)
 * fallback on the icon. Selecting a suggestion or geolocating resolves
 * { label, zip, lat, lng }, persists it to the SHARED `hub:location`
 * localStorage key (so every instance stays in sync), and emits
 * `popLocationChange`.
 */
@Component({
  tag: 'pop-location',
  encapsulation: { type: 'scoped' },
  styleUrl: 'location.css',
})
export class PopLocation {
  @Element() el!: HTMLElement;

  /** Initial location label (optional — the shared store wins if present). */
  @Prop() value: string = '';
  /**
   * Trigger style:
   *  - 'button' (default): a filled button (pin + label + caret).
   *  - 'inline': plain inline text (label + subtle ▾ chevron), styled to sit
   *    INSIDE another element (e.g. a card's location label). The popover still
   *    anchors to + drops down from this trigger, but right-aligns so it never
   *    overflows off the right edge on mobile.
   */
  @Prop() variant: 'button' | 'inline' = 'button';
  /**
   * Soft fallback location (label or ZIP) shown when NOTHING is in the shared
   * `hub:location` store. It is display-only: it is NOT written to localStorage
   * and does NOT emit `popLocationChange`, so the user can still actively set a
   * real location (which then wins + persists) and we never clobber a server zip.
   * Precedence for what's shown: stored `hub:location` → `default` → "Set Location".
   */
  @Prop() default: string = '';
  /** Photon autocomplete endpoint (overridable; OSM-data, keyless, CORS-ok). */
  @Prop() photonUrl: string = 'https://photon.komoot.io/api/';
  /** Nominatim reverse-geocode endpoint (for GPS coords → place). */
  @Prop() nominatimUrl: string = 'https://nominatim.openstreetmap.org/reverse';
  /** IP-geolocation fallback endpoint. */
  @Prop() ipUrl: string = 'https://ipapi.co/json/';

  /** Fired on every set with the resolved place; consumers may persist server-side. */
  @Event({ composed: true, bubbles: true }) popLocationChange!: EventEmitter<ResolvedLocation>;

  @State() current: ResolvedLocation | null = null;
  @State() open = false;
  @State() query = '';
  @State() suggestions: Suggestion[] = [];
  @State() resolving = false; // GPS/IP in flight
  @State() searching = false; // autocomplete in flight
  @State() error = '';
  /** Keyboard-highlighted suggestion index (-1 = none). */
  @State() highlight = -1;

  private debounceTimer?: ReturnType<typeof setTimeout>;
  private reqSeq = 0; // drop stale autocomplete responses
  private inputEl?: HTMLInputElement;

  componentWillLoad() {
    // Hydrate from the shared store; fall back to the `value` prop.
    this.current = readLocation() || (this.value ? { label: this.value, zip: '', lat: null, lng: null } : null);
  }

  connectedCallback() {
    window.addEventListener('storage', this.onStorage);
    window.addEventListener(LOCATION_EVENT, this.onSharedChange as EventListener);
    document.addEventListener('click', this.onDocClick, true);
  }
  disconnectedCallback() {
    window.removeEventListener('storage', this.onStorage);
    window.removeEventListener(LOCATION_EVENT, this.onSharedChange as EventListener);
    document.removeEventListener('click', this.onDocClick, true);
    clearTimeout(this.debounceTimer);
  }

  /** Cross-tab: a `storage` event on our key → re-hydrate. */
  private onStorage = (e: StorageEvent) => {
    if (e.key === 'hub:location') this.current = readLocation();
  };
  /** Same-page: another instance wrote → adopt the new value (don't echo back). */
  private onSharedChange = (e: CustomEvent<ResolvedLocation>) => {
    if (e.detail) this.current = e.detail;
  };
  /** Close the popover on an outside click. */
  private onDocClick = (e: MouseEvent) => {
    if (this.open && !this.el.contains(e.target as Node)) this.open = false;
  };

  private toggle = () => {
    this.open = !this.open;
    if (this.open) {
      this.error = '';
      this.query = '';
      this.suggestions = [];
      this.highlight = -1;
      // Focus the input after it renders.
      requestAnimationFrame(() => this.inputEl?.focus());
    }
  };

  /** True for a well-formed US ZIP (5 digits, optionally +4). */
  private isUsZip(s: string): boolean {
    return /^\d{5}(-\d{4})?$/.test(s.trim());
  }

  // ── Autocomplete (Photon, debounced) ──────────────────────────────────────
  private onInput = (raw: string) => {
    this.query = raw;
    this.error = '';
    this.highlight = -1; // typing resets the keyboard highlight
    clearTimeout(this.debounceTimer);
    const q = raw.trim();
    if (q.length < 3) { this.suggestions = []; this.searching = false; return; }
    this.debounceTimer = setTimeout(() => void this.search(q), 300);
  };

  /**
   * Keyboard nav in the input: ArrowUp/Down move the highlight over the Photon
   * suggestions; Enter commits — the highlighted suggestion if any, else a typed
   * 5-digit US ZIP directly, else shows a small inline validation message.
   */
  private onKeyDown = (e: KeyboardEvent) => {
    const n = this.suggestions.length;
    if (e.key === 'ArrowDown') {
      if (!n) return;
      e.preventDefault();
      this.highlight = this.highlight < 0 ? 0 : Math.min(n - 1, this.highlight + 1);
    } else if (e.key === 'ArrowUp') {
      if (!n) return;
      e.preventDefault();
      this.highlight = this.highlight <= 0 ? n - 1 : this.highlight - 1;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.submitFromInput();
    } else if (e.key === 'Escape') {
      this.open = false;
    }
  };

  /** Enter handler: highlighted suggestion → typed-ZIP → inline validation. */
  private submitFromInput() {
    const n = this.suggestions.length;
    if (this.highlight >= 0 && this.highlight < n) {
      this.pick(this.suggestions[this.highlight]);
      return;
    }
    // No highlight: if there's exactly one obvious match, prefer it; else require
    // a valid ZIP. (We DON'T auto-pick when multiple suggestions are showing.)
    const q = this.query.trim();
    if (this.isUsZip(q)) {
      // Resolve/save the typed ZIP directly (backend geocodes the label).
      this.commit({ label: q, zip: q, lat: null, lng: null });
      return;
    }
    if (n === 1) {
      this.pick(this.suggestions[0]);
      return;
    }
    this.error = 'Pick a suggestion or enter a valid ZIP';
  }

  private async search(q: string) {
    const seq = ++this.reqSeq;
    this.searching = true;
    try {
      const url = `${this.photonUrl}?q=${encodeURIComponent(q)}&limit=5&lang=en`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const json = res.ok ? await res.json() : null;
      if (seq !== this.reqSeq) return; // a newer query superseded this one
      this.suggestions = mapPhoton(json);
      this.highlight = -1; // fresh results → clear the keyboard highlight
    } catch {
      if (seq === this.reqSeq) this.suggestions = [];
    } finally {
      if (seq === this.reqSeq) this.searching = false;
    }
  }

  private pick = (s: Suggestion) => {
    this.commit({ label: s.label, zip: s.zip, lat: s.lat, lng: s.lng });
  };

  // ── Find my location (GPS → Nominatim, else IP) ───────────────────────────
  private locate = () => {
    if (this.resolving) return;
    this.error = '';
    if (typeof navigator === 'undefined' || !navigator.geolocation) { void this.ipFallback(); return; }
    this.resolving = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => void this.reverseGeocode(pos.coords.latitude, pos.coords.longitude),
      () => void this.ipFallback(),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  };

  private async reverseGeocode(lat: number, lng: number) {
    try {
      const url = `${this.nominatimUrl}?format=jsonv2&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      const place = res.ok ? mapNominatimReverse(await res.json()) : null;
      if (place) { this.commit(place); return; }
      await this.ipFallback();
    } catch {
      await this.ipFallback();
    }
  }

  private async ipFallback() {
    try {
      const res = await fetch(this.ipUrl, { signal: AbortSignal.timeout(8000) });
      const place = res.ok ? mapIpapi(await res.json()) : null;
      if (place) { this.commit(place); return; }
      this.error = "Couldn't detect your location — type it instead.";
    } catch {
      this.error = "Couldn't detect your location — type it instead.";
    } finally {
      this.resolving = false;
    }
  }

  /** Persist (shared store), emit, and collapse. */
  private commit(loc: ResolvedLocation) {
    this.resolving = false;
    this.current = { ...loc };
    writeLocation(loc); // shared store + same-page event (other instances follow)
    this.popLocationChange.emit(loc);
    this.open = false;
    this.query = '';
    this.suggestions = [];
  }

  render() {
    // Display precedence: an actively-set/stored location (current) → the soft
    // `default` fallback (display-only, never persisted) → the "Set Location"
    // placeholder rendered below.
    const label = this.current?.label || this.default || '';
    const inline = this.variant === 'inline';
    return (
      <div class={{ pl: true, 'pl--inline': inline }}>
        {/* Collapsed trigger: a filled button, or plain inline text (label + ▾). */}
        {inline ? (
          <button class="pl__inline" type="button" aria-expanded={String(this.open)} aria-label="Change location" onClick={this.toggle}>
            <span class="pl__inline-label">{label || 'Set location'}</span>
            <ion-icon class="pl__inline-caret" name="chevron-down" aria-hidden="true" />
          </button>
        ) : (
          <button class="pl__btn" type="button" aria-expanded={String(this.open)} onClick={this.toggle}>
            <ion-icon class="pl__btn-pin" name="location-outline" aria-hidden="true" />
            <span class="pl__btn-label">{label || 'Set Location'}</span>
            <ion-icon class="pl__btn-caret" name="chevron-down" aria-hidden="true" />
          </button>
        )}

        {this.open && (
          <div class={{ pl__pop: true, 'pl__pop--right': inline }} role="dialog" aria-label="Choose location">
            <div class="pl__field">
              <input
                ref={(el) => (this.inputEl = el as HTMLInputElement)}
                class="pl__input"
                type="text"
                inputMode="text"
                placeholder="ZIP or town"
                autocomplete="off"
                role="combobox"
                aria-expanded={String(this.suggestions.length > 0)}
                aria-activedescendant={this.highlight >= 0 ? `pl-opt-${this.highlight}` : undefined}
                value={this.query}
                onInput={(e) => this.onInput((e.target as HTMLInputElement).value)}
                onKeyDown={this.onKeyDown}
              />
              <button class="pl__locate" type="button" title="Use my location" aria-label="Use my location" disabled={this.resolving} onClick={this.locate}>
                {this.resolving ? <span class="pl__spin" aria-hidden="true" /> : <ion-icon name="locate" aria-hidden="true" />}
              </button>
            </div>

            {this.error && <div class="pl__error" role="alert">{this.error}</div>}

            {this.searching && this.suggestions.length === 0 && (
              <div class="pl__hint">Searching…</div>
            )}
            {this.suggestions.length > 0 && (
              <ul class="pl__list" role="listbox">
                {this.suggestions.map((s, i) => (
                  <li key={s.id}>
                    <button
                      id={`pl-opt-${i}`}
                      class={{ pl__item: true, 'pl__item--hl': i === this.highlight }}
                      type="button"
                      role="option"
                      aria-selected={String(i === this.highlight)}
                      onMouseEnter={() => (this.highlight = i)}
                      onClick={() => this.pick(s)}
                    >
                      <ion-icon name="location-outline" aria-hidden="true" />
                      <span>{s.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }
}
