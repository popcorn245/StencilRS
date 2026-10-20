import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopLocationPickerStyle0 from "./ui-kit/organisms/location-picker/location-picker.css?tag=pop-location-picker&encapsulation=scoped";
export class PopLocationPicker {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.locationChange = __stencil_createEvent(this, "locationChange", 7);
        this.spaceValueChanged = __stencil_createEvent(this, "spaceValueChanged", 7);
        this.spaceCreateRequested = __stencil_createEvent(this, "spaceCreateRequested", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** JSON of the current TaskLocation, or '' / 'null' for none. */
    value = 'null';
    /** Picked room→space ids as JSON array (passthrough to pop-space-picker). */
    spaceValue = '[]';
    /** Available spaces for the inline space picker (JSON array of LpSpace). */
    spaces = '[]';
    /** Whether the inline space picker shows its "+ New space" entry. */
    allowCreateSpace = true;
    /** Emitted when the chosen location changes. Detail = TaskLocation | null. */
    locationChange;
    /** Re-emitted from the inline space picker — host persists `spaceIds`. */
    spaceValueChanged;
    /** Re-emitted from the inline space picker — host creates a Space. */
    spaceCreateRequested;
    open = false;
    query = '';
    results = [];
    loading = false;
    error = null;
    debounceTimer = null;
    reqSeq = 0;
    get parsedValue() {
        try {
            const v = JSON.parse(this.value || 'null');
            if (v && (v.kind === 'home' || v.kind === 'place'))
                return v;
            return null;
        }
        catch {
            return null;
        }
    }
    get parsedSpaces() {
        try {
            return JSON.parse(this.spaces) ?? [];
        }
        catch {
            return [];
        }
    }
    get parsedSpaceValue() {
        try {
            return JSON.parse(this.spaceValue) ?? [];
        }
        catch {
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
    async runSearch(q) {
        const seq = ++this.reqSeq;
        this.loading = true;
        this.error = null;
        try {
            const url = 'https://nominatim.openstreetmap.org/search' +
                '?format=jsonv2&addressdetails=1&limit=5&accept-language=en' +
                `&q=${encodeURIComponent(q)}`;
            const res = await fetch(url, { headers: { Accept: 'application/json' } });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            // Ignore stale responses (a newer keystroke already fired).
            if (seq !== this.reqSeq)
                return;
            this.results = (data ?? []).map((r) => ({
                label: r.display_name,
                lat: +r.lat,
                lon: +r.lon,
                osmId: r.osm_type && r.osm_id != null ? `${r.osm_type}${r.osm_id}` : undefined,
            }));
            this.loading = false;
        }
        catch {
            if (seq !== this.reqSeq)
                return;
            // Fail soft — never throw, never block the UI.
            this.results = [];
            this.loading = false;
            this.error = 'No results — try again.';
        }
    }
    onQueryInput = (e) => {
        const q = e.target.value;
        this.query = q;
        this.error = null;
        if (this.debounceTimer)
            clearTimeout(this.debounceTimer);
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
    selectHome = () => {
        this.locationChange.emit({ kind: 'home' });
        this.open = false;
        this.query = '';
        this.results = [];
    };
    selectPlace = (p) => {
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
    clearLocation = (e) => {
        e.stopPropagation();
        this.locationChange.emit(null);
    };
    openPopover = () => {
        this.open = true;
    };
    onOuterClick = (e) => {
        if (!this.el.contains(e.target)) {
            this.open = false;
        }
    };
    connectedCallback() {
        document.addEventListener('mousedown', this.onOuterClick);
    }
    disconnectedCallback() {
        document.removeEventListener('mousedown', this.onOuterClick);
        if (this.debounceTimer)
            clearTimeout(this.debounceTimer);
    }
    // ─────────────── render ───────────────
    renderField() {
        const v = this.parsedValue;
        let label = 'Set a location…';
        let icon = '📍';
        let placeholder = true;
        if (v?.kind === 'home') {
            label = 'Home';
            icon = '🏠';
            placeholder = false;
        }
        else if (v?.kind === 'place') {
            label = v.label;
            icon = '📍';
            placeholder = false;
        }
        return (h("button", { type: "button", class: "plp__field", "aria-haspopup": "dialog", "aria-expanded": this.open ? 'true' : 'false', onClick: this.openPopover },
            h("span", { class: "plp__field-icon", "aria-hidden": "true" }, icon),
            h("span", { class: { 'plp__field-label': true, 'plp__field-label--placeholder': placeholder } }, label),
            !placeholder && (h("span", { class: "plp__field-clear", role: "button", "aria-label": "Clear location", onClick: this.clearLocation }, "\u00D7"))));
    }
    renderPopover() {
        const v = this.parsedValue;
        const homeSelected = v?.kind === 'home';
        return (h("div", { class: "plp__popover", role: "dialog" },
            h("input", { type: "text", class: "plp__search", placeholder: "Search an address\u2026", value: this.query, onInput: this.onQueryInput }),
            h("ul", { class: "plp__list", role: "listbox" },
                h("li", { class: { 'plp__opt': true, 'plp__opt--home': true, 'plp__opt--picked': homeSelected }, role: "option", "aria-selected": homeSelected ? 'true' : 'false', onClick: this.selectHome },
                    h("span", { class: "plp__opt-icon", "aria-hidden": "true" }, "\uD83C\uDFE0"),
                    h("span", { class: "plp__opt-label" }, "Home"),
                    homeSelected && h("span", { class: "plp__opt-check", "aria-hidden": "true" }, "\u2713")),
                this.loading && h("li", { class: "plp__hint" }, "Searching\u2026"),
                !this.loading && this.error && h("li", { class: "plp__hint" }, this.error),
                !this.loading &&
                    !this.error &&
                    this.query.trim().length >= 3 &&
                    this.results.length === 0 && h("li", { class: "plp__hint" }, "No results \u2014 try again."),
                this.results.map((p) => (h("li", { class: "plp__opt", role: "option", "aria-selected": v?.kind === 'place' && v.osmId === p.osmId ? 'true' : 'false', onClick: () => this.selectPlace(p) },
                    h("span", { class: "plp__opt-icon", "aria-hidden": "true" }, "\uD83D\uDCCD"),
                    h("span", { class: "plp__opt-label" }, p.label)))))));
    }
    render() {
        const v = this.parsedValue;
        const showSpacePicker = v?.kind === 'home';
        return (h("div", { key: '0', class: "plp" },
            h("div", { key: '1', class: "plp__field-wrap" },
                this.renderField(),
                this.open && this.renderPopover()),
            showSpacePicker && (h("div", { key: '2', class: "plp__spaces" },
                h("label", { key: '3', class: "plp__spaces-label" }, "Room"),
                h("pop-space-picker", { key: '4', value: this.parsedSpaceValue, spaces: this.parsedSpaces, allowCreate: this.allowCreateSpace, onValueChanged: (ev) => {
                        ev.stopPropagation();
                        this.spaceValueChanged.emit(ev.detail);
                    }, onSpaceCreateRequested: (ev) => {
                        ev.stopPropagation();
                        this.spaceCreateRequested.emit(ev.detail);
                    } })))));
    }
    static get style() { return PopLocationPickerStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-location-picker",
        "$members$": {
            "value": [1],
            "spaceValue": [1, "space-value"],
            "spaces": [1],
            "allowCreateSpace": [4, "allow-create-space"],
            "open": [32],
            "query": [32],
            "results": [32],
            "loading": [32],
            "error": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=location-picker.js.map