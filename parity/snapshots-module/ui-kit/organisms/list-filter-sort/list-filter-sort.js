import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopListFilterSortStyle0 from "./ui-kit/organisms/list-filter-sort/list-filter-sort.css?tag=pop-list-filter-sort&encapsulation=scoped";
export const PopListFilterSort = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
};
__stencil_proxyCustomElement(PopListFilterSort, [774, "pop-list-filter-sort", {
        "value": [1],
        "placeholder": [1],
        "filters": [1],
        "debounce": [2],
        "showClear": [4, "show-clear"],
        "views": [1],
        "view": [1]
    }]);
//# sourceMappingURL=list-filter-sort.js.map