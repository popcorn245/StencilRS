import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { readLocation, writeLocation, LOCATION_EVENT, mapPhoton, mapNominatimReverse, mapIpapi, } from './location-store';
import PopLocationStyle0 from "./ui-kit/organisms/location/location.css?tag=pop-location&encapsulation=scoped";
export const PopLocation = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popLocationChange = __stencil_createEvent(this, "popLocationChange", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Initial location label (optional — the shared store wins if present). */
    value = '';
    /**
     * Trigger style:
     *  - 'button' (default): a filled button (pin + label + caret).
     *  - 'inline': plain inline text (label + subtle ▾ chevron), styled to sit
     *    INSIDE another element (e.g. a card's location label). The popover still
     *    anchors to + drops down from this trigger, but right-aligns so it never
     *    overflows off the right edge on mobile.
     */
    variant = 'button';
    /**
     * Soft fallback location (label or ZIP) shown when NOTHING is in the shared
     * `hub:location` store. It is display-only: it is NOT written to localStorage
     * and does NOT emit `popLocationChange`, so the user can still actively set a
     * real location (which then wins + persists) and we never clobber a server zip.
     * Precedence for what's shown: stored `hub:location` → `default` → "Set Location".
     */
    default = '';
    /** Photon autocomplete endpoint (overridable; OSM-data, keyless, CORS-ok). */
    photonUrl = 'https://photon.komoot.io/api/';
    /** Nominatim reverse-geocode endpoint (for GPS coords → place). */
    nominatimUrl = 'https://nominatim.openstreetmap.org/reverse';
    /** IP-geolocation fallback endpoint. */
    ipUrl = 'https://ipapi.co/json/';
    /** Fired on every set with the resolved place; consumers may persist server-side. */
    popLocationChange;
    current = null;
    open = false;
    query = '';
    suggestions = [];
    resolving = false; // GPS/IP in flight
    searching = false; // autocomplete in flight
    error = '';
    /** Keyboard-highlighted suggestion index (-1 = none). */
    highlight = -1;
    debounceTimer;
    reqSeq = 0; // drop stale autocomplete responses
    inputEl;
    componentWillLoad() {
        // Hydrate from the shared store; fall back to the `value` prop.
        this.current = readLocation() || (this.value ? { label: this.value, zip: '', lat: null, lng: null } : null);
    }
    connectedCallback() {
        window.addEventListener('storage', this.onStorage);
        window.addEventListener(LOCATION_EVENT, this.onSharedChange);
        document.addEventListener('click', this.onDocClick, true);
    }
    disconnectedCallback() {
        window.removeEventListener('storage', this.onStorage);
        window.removeEventListener(LOCATION_EVENT, this.onSharedChange);
        document.removeEventListener('click', this.onDocClick, true);
        clearTimeout(this.debounceTimer);
    }
    /** Cross-tab: a `storage` event on our key → re-hydrate. */
    onStorage = (e) => {
        if (e.key === 'hub:location')
            this.current = readLocation();
    };
    /** Same-page: another instance wrote → adopt the new value (don't echo back). */
    onSharedChange = (e) => {
        if (e.detail)
            this.current = e.detail;
    };
    /** Close the popover on an outside click. */
    onDocClick = (e) => {
        if (this.open && !this.el.contains(e.target))
            this.open = false;
    };
    toggle = () => {
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
    isUsZip(s) {
        return /^\d{5}(-\d{4})?$/.test(s.trim());
    }
    // ── Autocomplete (Photon, debounced) ──────────────────────────────────────
    onInput = (raw) => {
        this.query = raw;
        this.error = '';
        this.highlight = -1; // typing resets the keyboard highlight
        clearTimeout(this.debounceTimer);
        const q = raw.trim();
        if (q.length < 3) {
            this.suggestions = [];
            this.searching = false;
            return;
        }
        this.debounceTimer = setTimeout(() => void this.search(q), 300);
    };
    /**
     * Keyboard nav in the input: ArrowUp/Down move the highlight over the Photon
     * suggestions; Enter commits — the highlighted suggestion if any, else a typed
     * 5-digit US ZIP directly, else shows a small inline validation message.
     */
    onKeyDown = (e) => {
        const n = this.suggestions.length;
        if (e.key === 'ArrowDown') {
            if (!n)
                return;
            e.preventDefault();
            this.highlight = this.highlight < 0 ? 0 : Math.min(n - 1, this.highlight + 1);
        }
        else if (e.key === 'ArrowUp') {
            if (!n)
                return;
            e.preventDefault();
            this.highlight = this.highlight <= 0 ? n - 1 : this.highlight - 1;
        }
        else if (e.key === 'Enter') {
            e.preventDefault();
            this.submitFromInput();
        }
        else if (e.key === 'Escape') {
            this.open = false;
        }
    };
    /** Enter handler: highlighted suggestion → typed-ZIP → inline validation. */
    submitFromInput() {
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
    async search(q) {
        const seq = ++this.reqSeq;
        this.searching = true;
        try {
            const url = `${this.photonUrl}?q=${encodeURIComponent(q)}&limit=5&lang=en`;
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            const json = res.ok ? await res.json() : null;
            if (seq !== this.reqSeq)
                return; // a newer query superseded this one
            this.suggestions = mapPhoton(json);
            this.highlight = -1; // fresh results → clear the keyboard highlight
        }
        catch {
            if (seq === this.reqSeq)
                this.suggestions = [];
        }
        finally {
            if (seq === this.reqSeq)
                this.searching = false;
        }
    }
    pick = (s) => {
        this.commit({ label: s.label, zip: s.zip, lat: s.lat, lng: s.lng });
    };
    // ── Find my location (GPS → Nominatim, else IP) ───────────────────────────
    locate = () => {
        if (this.resolving)
            return;
        this.error = '';
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            void this.ipFallback();
            return;
        }
        this.resolving = true;
        navigator.geolocation.getCurrentPosition((pos) => void this.reverseGeocode(pos.coords.latitude, pos.coords.longitude), () => void this.ipFallback(), { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 });
    };
    async reverseGeocode(lat, lng) {
        try {
            const url = `${this.nominatimUrl}?format=jsonv2&lat=${lat}&lon=${lng}`;
            const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
            const place = res.ok ? mapNominatimReverse(await res.json()) : null;
            if (place) {
                this.commit(place);
                return;
            }
            await this.ipFallback();
        }
        catch {
            await this.ipFallback();
        }
    }
    async ipFallback() {
        try {
            const res = await fetch(this.ipUrl, { signal: AbortSignal.timeout(8000) });
            const place = res.ok ? mapIpapi(await res.json()) : null;
            if (place) {
                this.commit(place);
                return;
            }
            this.error = "Couldn't detect your location — type it instead.";
        }
        catch {
            this.error = "Couldn't detect your location — type it instead.";
        }
        finally {
            this.resolving = false;
        }
    }
    /** Persist (shared store), emit, and collapse. */
    commit(loc) {
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
        return (h("div", { key: '0', class: { pl: true, 'pl--inline': inline } },
            inline ? (h("button", { class: "pl__inline", type: "button", "aria-expanded": String(this.open), "aria-label": "Change location", onClick: this.toggle },
                h("span", { class: "pl__inline-label" }, label || 'Set location'),
                h("ion-icon", { class: "pl__inline-caret", name: "chevron-down", "aria-hidden": "true" }))) : (h("button", { class: "pl__btn", type: "button", "aria-expanded": String(this.open), onClick: this.toggle },
                h("ion-icon", { class: "pl__btn-pin", name: "location-outline", "aria-hidden": "true" }),
                h("span", { class: "pl__btn-label" }, label || 'Set Location'),
                h("ion-icon", { class: "pl__btn-caret", name: "chevron-down", "aria-hidden": "true" }))),
            this.open && (h("div", { key: '1', class: { pl__pop: true, 'pl__pop--right': inline }, role: "dialog", "aria-label": "Choose location" },
                h("div", { key: '2', class: "pl__field" },
                    h("input", { key: '3', ref: (el) => (this.inputEl = el), class: "pl__input", type: "text", inputMode: "text", placeholder: "ZIP or town", autocomplete: "off", role: "combobox", "aria-expanded": String(this.suggestions.length > 0), "aria-activedescendant": this.highlight >= 0 ? `pl-opt-${this.highlight}` : undefined, value: this.query, onInput: (e) => this.onInput(e.target.value), onKeyDown: this.onKeyDown }),
                    h("button", { key: '4', class: "pl__locate", type: "button", title: "Use my location", "aria-label": "Use my location", disabled: this.resolving, onClick: this.locate }, this.resolving ? h("span", { class: "pl__spin", "aria-hidden": "true" }) : h("ion-icon", { name: "locate", "aria-hidden": "true" }))),
                this.error && h("div", { key: '5', class: "pl__error", role: "alert" }, this.error),
                this.searching && this.suggestions.length === 0 && (h("div", { key: '6', class: "pl__hint" }, "Searching\u2026")),
                this.suggestions.length > 0 && (h("ul", { key: '7', class: "pl__list", role: "listbox" }, this.suggestions.map((s, i) => (h("li", { key: s.id },
                    h("button", { id: `pl-opt-${i}`, class: { pl__item: true, 'pl__item--hl': i === this.highlight }, type: "button", role: "option", "aria-selected": String(i === this.highlight), onMouseEnter: () => (this.highlight = i), onClick: () => this.pick(s) },
                        h("ion-icon", { name: "location-outline", "aria-hidden": "true" }),
                        h("span", null, s.label)))))))))));
    }
};
PopLocation.style = PopLocationStyle0();
//# sourceMappingURL=location.js.map