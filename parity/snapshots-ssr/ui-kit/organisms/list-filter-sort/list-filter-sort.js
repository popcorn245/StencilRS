import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopListFilterSortStyle0 from "./ui-kit/organisms/list-filter-sort/list-filter-sort.css?tag=pop-list-filter-sort&encapsulation=scoped";
/**
 * `pop-list-filter-sort` — the drop-in header row for list dialogs: ONE row
 * composing `pop-search-filter` (flex:1) + `pop-view-switcher` (flex:0) + a
 * named `actions` slot for dialog-specific extras (e.g. an Add button).
 *
 * Many hub dialogs (photos/images, tasks, inventory, calendar) each hand-roll
 * this same search + filter + view toolbar; this organism is the shared piece.
 * Expected adopters: hub-inventory (done), hub-images/photos, hub-tasks.
 *
 * Pass-through props: `value`, `placeholder`, `filters`, `debounce`,
 * `showClear` → pop-search-filter; `views`, `view` → pop-view-switcher.
 * `views` parsing to an EMPTY array (`views="[]"`) omits the switcher element
 * entirely (no stray flex-gap ghost). The `input` slot is passed through to
 * pop-search-filter: slot a host-owned search widget with `slot="input"` and
 * it replaces the built-in input (the host owns its value/events —
 * `searchChange` only fires from the built-in input). The pass-through slot is
 * always rendered (scoped-slot rule), so late-upgrading hosts still project.
 *
 * The child events are re-emitted from THIS host (the originals are stopped),
 * so hosts listen in one place: `searchChange`, `filterChange`,
 * `clearFilters`, `viewChange`.
 *
 * @example
 * <pop-list-filter-sort
 *   placeholder="Search name, tag, UPC…"
 *   filters='[{"key":"show","label":"Show","kind":"tabs","value":"","options":[{"value":"","label":"All"}]}]'
 *   views='["list","card"]'
 *   view="list">
 *   <button slot="actions" class="pop-iconbtn" aria-label="Add">…</button>
 * </pop-list-filter-sort>
 */
export class PopListFilterSort {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.searchChange = __stencil_createEvent(this, "searchChange", 7);
        this.filterChange = __stencil_createEvent(this, "filterChange", 7);
        this.clearFilters = __stencil_createEvent(this, "clearFilters", 7);
        this.viewChange = __stencil_createEvent(this, "viewChange", 7);
    }
    /** Current search text (→ pop-search-filter `value`). */
    value = '';
    /** Search placeholder (→ pop-search-filter). */
    placeholder = 'Search…';
    /** JSON filter group descriptors (→ pop-search-filter `filters`). */
    filters = '[]';
    /** Debounce (ms) for searchChange (→ pop-search-filter). */
    debounce = 150;
    /** Show "Clear all" in the filter popover (→ pop-search-filter). */
    showClear = true;
    /** JSON view list (→ pop-view-switcher `views`). `[]` hides the switcher. */
    views = '["list","card"]';
    /** Current view (→ pop-view-switcher `value`). */
    view = '';
    /** Re-emitted from pop-search-filter: debounced search text. */
    searchChange;
    /** Re-emitted from pop-search-filter: a filter group changed. */
    filterChange;
    /** Re-emitted from pop-search-filter: "Clear all" pressed. */
    clearFilters;
    /** Re-emitted from pop-view-switcher: the view changed. */
    viewChange;
    /** Stop the child's bubbling event and re-emit it from this host, so the
     *  parent sees exactly ONE event, sourced here. */
    relay = (emitter) => (ev) => {
        ev.stopPropagation();
        emitter.emit(ev.detail);
    };
    /** True when `views` parses to a non-empty array. pop-view-switcher would
     *  render null for `[]` anyway, but its HOST element would still sit in the
     *  flex row and cost a phantom gap — so we omit the element entirely. */
    hasViews() {
        try {
            const arr = JSON.parse(this.views);
            return Array.isArray(arr) && arr.length > 0;
        }
        catch {
            return false;
        }
    }
    render() {
        return (h("div", { key: '0', class: "plfs" },
            h("pop-search-filter", { key: '1', class: "plfs__search", value: this.value, placeholder: this.placeholder, filters: this.filters, debounce: this.debounce, showClear: this.showClear, onSearchChange: this.relay(this.searchChange), onFilterChange: this.relay(this.filterChange), onClearFilters: this.relay(this.clearFilters) },
                h("slot", { key: '2', name: "input" })),
            this.hasViews() && (h("pop-view-switcher", { key: '3', class: "plfs__views", views: this.views, value: this.view, onViewChange: this.relay(this.viewChange) })),
            h("slot", { key: '4', name: "actions" })));
    }
    static get style() { return PopListFilterSortStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 774,
        "$tagName$": "pop-list-filter-sort",
        "$members$": {
            "value": [1],
            "placeholder": [1],
            "filters": [1],
            "debounce": [2],
            "showClear": [4, "show-clear"],
            "views": [1],
            "view": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=list-filter-sort.js.map