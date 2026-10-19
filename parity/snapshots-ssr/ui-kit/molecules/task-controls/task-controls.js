import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopTaskControlsStyle0 from "./ui-kit/molecules/task-controls/task-controls.css?tag=pop-task-controls&encapsulation=scoped";
/**
 * `pop-task-controls` — a fully CONTROLLED group-by / sort / status control set.
 *
 * Lifted (and generalised) from tasks-app's `renderFilterControls` so both the
 * tasks-app and the hub's tasks tile can share ONE toolbar: a row of pill
 * dropdowns (Group · Sort · Status), each a button + popover listbox with a ✓
 * on the current selection.
 *
 * The component holds NO filter values of its own — the host passes the current
 * `groupBy` / `sortBy` / `statusFilter` and the option lists, and the component
 * emits a `*Change` event when the user picks something. The only internal
 * state is view-local: which popover is open.
 *
 * @example
 * <pop-task-controls
 *   group-by="date"
 *   sort-by="dueDate"
 *   status-filter=""
 *   group-options='[{"id":"none","label":"No grouping"},{"id":"date","label":"Date"}]'
 *   sort-options='[{"id":"dueDate","label":"Due date"},{"id":"priority","label":"Priority"}]'
 *   status-options='[{"id":"","label":"All"},{"id":"open","label":"Open"}]'
 *   variant="bar"
 *   show-clear>
 * </pop-task-controls>
 */
export class PopTaskControls {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.groupChange = __stencil_createEvent(this, "groupChange", 7);
        this.sortChange = __stencil_createEvent(this, "sortChange", 7);
        this.taskStatusChange = __stencil_createEvent(this, "taskStatusChange", 7);
        this.clearAll = __stencil_createEvent(this, "clearAll", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Current group-by value (controlled). */
    groupBy = '';
    /** Current sort value (controlled). */
    sortBy = '';
    /** Current status-filter value (controlled). `''` = all. */
    statusFilter = '';
    /** JSON array `[{id,label}]` of the group modes to show. Empty → no Group dropdown. */
    groupOptions = '[]';
    /** JSON array `[{id,label}]` of the sort modes to show. Empty → no Sort dropdown. */
    sortOptions = '[]';
    /** JSON array `[{id,label}]` of the status filters to show. Empty → no Status dropdown. */
    statusOptions = '[]';
    /** Layout hint for class hooks. */
    variant = 'bar';
    /** Tighter layout for narrow docks (e.g. the hub's 400px tile). */
    compact = false;
    /** Render a "Clear" affordance. */
    showClear = false;
    /** Clear-affordance presentation: `text` = the "Clear"/"Clear all" link
     *  (default, tasks/calendar unchanged); `icon` = a quiet icon-only button
     *  (funnel-with-slash) for hosts where a text link sticks out too much. */
    clearVariant = 'text';
    /**
     * Presentation:
     *  - `inline` (default) — the three dropdown pills sit in a row (bar/compact).
     *  - `menu` — a single filter icon-button that opens ONE popover holding the
     *    Group / Sort / Status selectors. Collapses the toolbar to a single
     *    trigger (for tight headers next to a search input). An active-state dot
     *    shows on the trigger when a non-default filter is set.
     */
    layout = 'inline';
    /** Default group id — used only to decide the `menu` trigger's active dot
     *  (dot shows when `groupBy` differs from this). Empty → not considered. */
    defaultGroup = '';
    /** Default sort id — used only for the `menu` trigger's active dot. */
    defaultSort = '';
    /** Heading for the group dropdown (pill label + menu-row label). Hosts reusing
     *  the control outside tasks can rename it (e.g. "Tool" for the hub's history). */
    groupLabel = 'Group';
    /** Heading for the sort dropdown. */
    sortLabel = 'Sort';
    /** Heading for the status dropdown. */
    statusLabel = 'Status';
    /** The group mode changed. */
    groupChange;
    /** The sort mode changed. */
    sortChange;
    /** The status filter changed. */
    taskStatusChange;
    /** The clear affordance was pressed. */
    clearAll;
    /** Which dropdown listbox is open (view-local). */
    openKey = null;
    /** Whether the collapsed `menu` popover is open (layout='menu' only). */
    menuOpen = false;
    connectedCallback() {
        document.addEventListener('click', this.onDocClick);
        document.addEventListener('keydown', this.onKeyDown);
    }
    disconnectedCallback() {
        document.removeEventListener('click', this.onDocClick);
        document.removeEventListener('keydown', this.onKeyDown);
    }
    /** Close any open popover on an outside click. */
    onDocClick = (e) => {
        if ((this.openKey || this.menuOpen) && !this.el.contains(e.target)) {
            this.openKey = null;
            this.menuOpen = false;
        }
    };
    /** Escape closes the innermost popover first (a sub-dropdown), then the menu. */
    onKeyDown = (e) => {
        if (e.key !== 'Escape')
            return;
        if (this.openKey)
            this.openKey = null;
        else if (this.menuOpen)
            this.menuOpen = false;
    };
    /** True when a non-default filter is set — drives the `menu` trigger dot. */
    get filterActive() {
        return (!!this.statusFilter ||
            (!!this.defaultGroup && this.groupBy !== this.defaultGroup) ||
            (!!this.defaultSort && this.sortBy !== this.defaultSort));
    }
    parse(json) {
        try {
            const arr = JSON.parse(json);
            if (!Array.isArray(arr))
                return [];
            return arr
                .filter((o) => o && typeof o === 'object')
                .map((o) => ({ id: String(o.id ?? ''), label: String(o.label ?? o.id ?? '') }));
        }
        catch {
            return [];
        }
    }
    toggle(key) {
        this.openKey = this.openKey === key ? null : key;
    }
    select(key, value) {
        this.openKey = null;
        if (key === 'group')
            this.groupChange.emit({ value });
        else if (key === 'sort')
            this.sortChange.emit({ value });
        else
            this.taskStatusChange.emit({ value });
    }
    /** The `clearVariant="icon"` glyph: the trigger's funnel with a slash through
     *  it — same stroke idiom as the trigger SVG so the pair reads as a set. */
    /** A small leading glyph per control so Group/Sort/Status read as one pill
     *  family (icon · muted key · ink value), matching the redesign mockup. */
    renderKeyIcon(key) {
        const common = {
            width: '15',
            height: '15',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '2',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'aria-hidden': 'true',
        };
        if (key === 'group') {
            return (h("svg", { ...common },
                h("path", { d: "M3 6h18M3 12h12M3 18h6" })));
        }
        if (key === 'sort') {
            return (h("svg", { ...common },
                h("path", { d: "M7 4v16M7 4l3 3M7 4 4 7M17 20V4M17 20l3-3M17 20l-3-3" })));
        }
        // status → funnel
        return (h("svg", { ...common },
            h("path", { d: "M4 5h16l-6 8v5l-4 2v-7z" })));
    }
    renderClearIcon() {
        return (h("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
            h("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
            h("line", { x1: "7", y1: "12", x2: "17", y2: "12" }),
            h("line", { x1: "10", y1: "18", x2: "14", y2: "18" }),
            h("line", { x1: "5", y1: "3", x2: "19", y2: "21" })));
    }
    /** A single pill dropdown: button + popover listbox. Mirrors the
     *  renderFilterControls `renderDropdown` pattern (label · current · caret,
     *  then a listbox with a ✓ on the selected option). */
    renderDropdown(key, label, value, options) {
        if (options.length === 0)
            return null;
        const open = this.openKey === key;
        const current = options.find((o) => o.id === value) ?? options[0];
        const active = !!value;
        return (h("div", { class: "ptc__dd" },
            h("button", { type: "button", class: { 'ptc__dd-btn': true, 'ptc__dd-btn--active': active, 'ptc__dd-btn--open': open }, "aria-haspopup": "listbox", "aria-expanded": open ? 'true' : 'false', "aria-label": label, title: label, onClick: (e) => {
                    e.stopPropagation();
                    this.toggle(key);
                } },
                h("span", { class: "ptc__dd-icon", "aria-hidden": "true" }, this.renderKeyIcon(key)),
                !this.compact && h("span", { class: "ptc__dd-label" }, label),
                h("span", { class: "ptc__dd-current" }, current?.label),
                h("svg", { class: "ptc__dd-caret", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.4", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
                    h("polyline", { points: "6 9 12 15 18 9" }))),
            open && (h("div", { class: "ptc__dd-menu", role: "listbox", "aria-label": label }, options.map((o) => (h("button", { type: "button", role: "option", "aria-selected": o.id === value ? 'true' : 'false', class: { 'ptc__dd-opt': true, 'ptc__dd-opt--sel': o.id === value }, onClick: (e) => {
                    e.stopPropagation();
                    this.select(key, o.id);
                } },
                h("span", { class: "ptc__dd-check", "aria-hidden": "true" }, o.id === value ? '✓' : ''),
                h("span", { class: "ptc__dd-opt-label" }, o.label))))))));
    }
    /** A labelled row inside the `menu` popover wrapping one dropdown. */
    renderMenuRow(key, label, value, options) {
        if (options.length === 0)
            return null;
        return (h("div", { class: "ptc__menu-row" },
            h("span", { class: "ptc__menu-label", id: `ptc-lbl-${key}` }, label),
            this.renderDropdown(key, label, value, options)));
    }
    /** Collapsed `menu` layout: a single filter icon-button → one popover holding
     *  the Group / Sort / Status dropdowns. */
    renderMenu(groupOpts, sortOpts, statusOpts) {
        const anyOptions = groupOpts.length || sortOpts.length || statusOpts.length;
        if (!anyOptions)
            return h("div", { class: "ptc ptc--menu" });
        return (h("div", { class: { ptc: true, 'ptc--menu': true, [`ptc--${this.variant}`]: true, 'ptc--compact': this.compact } },
            h("button", { type: "button", class: { 'ptc__filter-trigger': true, 'ptc__filter-trigger--open': this.menuOpen, 'ptc__filter-trigger--active': this.filterActive }, "aria-haspopup": "dialog", "aria-expanded": this.menuOpen ? 'true' : 'false', "aria-label": "Filter, group and sort", title: "Filter, group and sort", onClick: (e) => {
                    e.stopPropagation();
                    this.menuOpen = !this.menuOpen;
                    this.openKey = null;
                } },
                h("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
                    h("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
                    h("line", { x1: "7", y1: "12", x2: "17", y2: "12" }),
                    h("line", { x1: "10", y1: "18", x2: "14", y2: "18" })),
                this.filterActive && h("span", { class: "ptc__filter-dot", "aria-hidden": "true" })),
            this.menuOpen && (h("div", { class: "ptc__menu", role: "dialog", "aria-label": "Filter, group and sort" },
                this.renderMenuRow('group', this.groupLabel, this.groupBy, groupOpts),
                this.renderMenuRow('sort', this.sortLabel, this.sortBy, sortOpts),
                this.renderMenuRow('status', this.statusLabel, this.statusFilter, statusOpts),
                this.showClear && (h("button", { type: "button", class: { 'ptc__menu-clear': true, 'ptc__menu-clear--icon': this.clearVariant === 'icon' }, "aria-label": "Clear filters", title: this.clearVariant === 'icon' ? 'Clear filters' : undefined, onClick: (e) => {
                        e.stopPropagation();
                        this.openKey = null;
                        this.clearAll.emit();
                    } }, this.clearVariant === 'icon' ? this.renderClearIcon() : 'Clear all'))))));
    }
    render() {
        const groupOpts = this.parse(this.groupOptions);
        const sortOpts = this.parse(this.sortOptions);
        const statusOpts = this.parse(this.statusOptions);
        if (this.layout === 'menu')
            return this.renderMenu(groupOpts, sortOpts, statusOpts);
        return (h("div", { class: {
                ptc: true,
                [`ptc--${this.variant}`]: true,
                'ptc--compact': this.compact,
            } },
            this.renderDropdown('group', this.groupLabel, this.groupBy, groupOpts),
            this.renderDropdown('sort', this.sortLabel, this.sortBy, sortOpts),
            this.renderDropdown('status', this.statusLabel, this.statusFilter, statusOpts),
            this.showClear && (h("button", { type: "button", class: { 'ptc__clear': true, 'ptc__clear--icon': this.clearVariant === 'icon' }, "aria-label": "Clear filters", title: this.clearVariant === 'icon' ? 'Clear filters' : undefined, onClick: (e) => {
                    e.stopPropagation();
                    this.openKey = null;
                    this.clearAll.emit();
                } }, this.clearVariant === 'icon' ? this.renderClearIcon() : 'Clear'))));
    }
    static get style() { return PopTaskControlsStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-task-controls",
        "$members$": {
            "groupBy": [1, "group-by"],
            "sortBy": [1, "sort-by"],
            "statusFilter": [1, "status-filter"],
            "groupOptions": [1, "group-options"],
            "sortOptions": [1, "sort-options"],
            "statusOptions": [1, "status-options"],
            "variant": [1],
            "compact": [4],
            "showClear": [4, "show-clear"],
            "clearVariant": [1, "clear-variant"],
            "layout": [1],
            "defaultGroup": [1, "default-group"],
            "defaultSort": [1, "default-sort"],
            "groupLabel": [1, "group-label"],
            "sortLabel": [1, "sort-label"],
            "statusLabel": [1, "status-label"],
            "openKey": [32],
            "menuOpen": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=task-controls.js.map