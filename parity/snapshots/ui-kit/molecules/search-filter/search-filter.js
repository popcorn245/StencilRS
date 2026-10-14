import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopSearchFilterStyle0 from "./ui-kit/molecules/search-filter/search-filter.css?tag=pop-search-filter&encapsulation=scoped";
const PopSearchFilter = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.searchChange = __stencil_createEvent(this, "searchChange", 7);
        this.filterChange = __stencil_createEvent(this, "filterChange", 7);
        this.clearFilters = __stencil_createEvent(this, "clearFilters", 7);
    }
    get el() { return this; }
    /** Current search text (mutable — reflects what's in the field). */
    value = '';
    /** Placeholder for the search input. */
    placeholder = 'Search…';
    /** Debounce (ms) for `searchChange`. 0 → emit synchronously. */
    debounce = 150;
    /** JSON array of filter group descriptors (see SearchFilterGroup). */
    filters = '[]';
    /** Show a "Clear all" affordance in the popover when any filter is non-default. */
    showClear = true;
    /** Debounced search text. */
    searchChange;
    /** A filter group's value changed. */
    filterChange;
    /** The "Clear all" affordance was pressed. */
    clearFilters;
    /** Whether the funnel popover is open (view-local). */
    open = false;
    /** Parsed filter groups (re-parsed when `filters` changes). */
    groups = [];
    /** Bumped when input-slot detection changes after a render (late-mounted
     *  slotted content, e.g. projected through pop-list-filter-sort). */
    slotTick = 0;
    debounceTimer = null;
    /** What `hasSlottedInput()` returned during the LAST render — compared in
     *  componentDidRender/-Load to catch content that lands after we render. */
    renderedSlotted;
    parseFilters(json) {
        try {
            const arr = JSON.parse(json ?? this.filters);
            if (!Array.isArray(arr)) {
                this.groups = [];
                return;
            }
            this.groups = arr
                .filter((g) => g && typeof g === 'object' && Array.isArray(g.options))
                .map((g) => ({
                key: String(g.key ?? ''),
                label: String(g.label ?? g.key ?? ''),
                kind: g.kind === 'tabs' ? 'tabs' : 'select',
                value: String(g.value ?? ''),
                default: String(g.default ?? ''),
                options: g.options
                    .filter((o) => o && typeof o === 'object')
                    .map((o) => ({
                    value: String(o.value ?? ''),
                    label: String(o.label ?? o.value ?? ''),
                })),
            }));
        }
        catch {
            this.groups = [];
        }
    }
    componentWillLoad() {
        this.parseFilters();
    }
    connectedCallback() {
        document.addEventListener('keydown', this.onKeyDown);
    }
    disconnectedCallback() {
        document.removeEventListener('keydown', this.onKeyDown);
        if (this.debounceTimer)
            clearTimeout(this.debounceTimer);
    }
    onKeyDown = (e) => {
        if (e.key === 'Escape' && this.open)
            this.open = false;
    };
    /** Light-DOM check for a slotted custom input (the presenter/hasActions
     *  idiom) — re-evaluated on every render, never cached across props. */
    hasSlottedInput() {
        return !!this.el?.querySelector('[slot="input"]');
    }
    /** Late-slot safety net: if slotted content appeared/vanished since the last
     *  render (nested projection can land after our first pass), re-render once. */
    recheckSlot() {
        const now = this.hasSlottedInput();
        if (this.renderedSlotted !== undefined && now !== this.renderedSlotted) {
            this.renderedSlotted = now;
            this.slotTick++;
        }
    }
    componentDidLoad() {
        this.recheckSlot();
    }
    componentDidRender() {
        this.recheckSlot();
    }
    /** True when any group's value differs from its default — drives the
     *  funnel's active dot. */
    get filtersActive() {
        return this.groups.some((g) => g.value !== (g.default ?? ''));
    }
    onInput = (e) => {
        const next = e.target.value;
        this.value = next;
        if (this.debounceTimer)
            clearTimeout(this.debounceTimer);
        if (this.debounce > 0) {
            this.debounceTimer = setTimeout(() => this.searchChange.emit(next), this.debounce);
        }
        else {
            this.searchChange.emit(next);
        }
    };
    pick(group, value) {
        // Optimistic local echo so the popover reflects the pick even before the
        // host re-renders us with an updated `filters` JSON (controlled flow).
        this.groups = this.groups.map((g) => (g.key === group.key ? { ...g, value } : g));
        this.filterChange.emit({ key: group.key, value });
    }
    clearAll = (e) => {
        e.stopPropagation();
        this.groups = this.groups.map((g) => ({ ...g, value: g.default ?? '' }));
        this.clearFilters.emit();
    };
    renderGroup(g) {
        if (g.kind === 'tabs') {
            return (h("div", { class: "psf__group", key: g.key },
                h("span", { class: "psf__group-label" }, g.label),
                h("div", { class: "psf__tabs", "aria-label": g.label }, g.options.map((o) => (h("button", { type: "button", class: { psf__tab: true, 'psf__tab--on': g.value === o.value }, "aria-pressed": g.value === o.value ? 'true' : 'false', onClick: (e) => {
                        e.stopPropagation();
                        this.pick(g, o.value);
                    } }, o.label))))));
        }
        return (h("label", { class: "psf__group", key: g.key },
            h("span", { class: "psf__group-label" }, g.label),
            h("select", { class: "psf__select", "aria-label": g.label, onChange: (e) => this.pick(g, e.target.value) }, g.options.map((o) => (h("option", { value: o.value, selected: g.value === o.value }, o.label))))));
    }
    render() {
        const hasFilters = this.groups.length > 0;
        // Slot detection is LIVE each render; renderedSlotted records what this
        // pass saw so the didRender/didLoad recheck can catch late projection.
        const slotted = (this.renderedSlotted = this.hasSlottedInput());
        return (h("div", { key: '0', class: { psf: true, 'psf--slotted': slotted } },
            h("div", { key: '1', class: "psf__field" },
                !slotted && h("pop-icon", { key: '2', class: "psf__lead", name: "search-outline" }),
                h("span", { key: '3', class: "psf__slot" },
                    h("slot", { key: '4', name: "input" })),
                !slotted && (h("input", { key: '5', class: { psf__input: true, 'psf__input--nofunnel': !hasFilters }, type: "search", placeholder: this.placeholder, value: this.value, "aria-label": this.placeholder, onInput: this.onInput })),
                hasFilters && (h("button", { key: '6', type: "button", class: { psf__funnel: true, 'psf__funnel--open': this.open, 'psf__funnel--active': this.filtersActive }, "aria-haspopup": "dialog", "aria-expanded": this.open ? 'true' : 'false', "aria-label": "Filter", title: "Filter", onClick: (e) => {
                        e.stopPropagation();
                        this.open = !this.open;
                    } },
                    h("pop-icon", { key: '7', name: "funnel-outline" }),
                    this.filtersActive && h("span", { key: '8', class: "psf__dot", "aria-hidden": "true" })))),
            this.open && [
                h("div", { key: '9', class: "psf__backdrop", onClick: () => (this.open = false) }),
                h("div", { key: 'a', class: "psf__menu", role: "dialog", "aria-label": "Filters" },
                    this.groups.map((g) => this.renderGroup(g)),
                    this.showClear && this.filtersActive && (h("button", { key: 'b', type: "button", class: "psf__clear", onClick: this.clearAll }, "Clear all"))),
            ]));
    }
    static get watchers() { return {
        "filters": [{
                "parseFilters": 0
            }]
    }; }
    static get style() { return PopSearchFilterStyle0(); }
};
__stencil_defineCustomElement(PopSearchFilter, [774, "pop-search-filter", {
        "value": [1025],
        "placeholder": [1],
        "debounce": [2],
        "filters": [1],
        "showClear": [4, "show-clear"],
        "open": [32],
        "groups": [32],
        "slotTick": [32]
    }, undefined, {
        "filters": [{
                "parseFilters": 0
            }]
    }]);
//# sourceMappingURL=search-filter.js.map