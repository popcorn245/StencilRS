import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopTaskControls = class {
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-task-controls",
        "componentClassName": "PopTaskControls",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "groupBy",
                "type": "string",
                "attribute": "group-by",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Current group-by value (controlled)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "sortBy",
                "type": "string",
                "attribute": "sort-by",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Current sort value (controlled)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "statusFilter",
                "type": "string",
                "attribute": "status-filter",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Current status-filter value (controlled). `''` = all."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "groupOptions",
                "type": "string",
                "attribute": "group-options",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON array `[{id,label}]` of the group modes to show. Empty \u2192 no Group dropdown."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "sortOptions",
                "type": "string",
                "attribute": "sort-options",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON array `[{id,label}]` of the sort modes to show. Empty \u2192 no Sort dropdown."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "statusOptions",
                "type": "string",
                "attribute": "status-options",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON array `[{id,label}]` of the status filters to show. Empty \u2192 no Status dropdown."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "variant",
                "type": "string",
                "attribute": "variant",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'bar'",
                "complexType": {
                    "original": "'bar' | 'sheet' | 'sidenav'",
                    "resolved": "\"bar\" | \"sheet\" | \"sidenav\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Layout hint for class hooks."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "compact",
                "type": "boolean",
                "attribute": "compact",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Tighter layout for narrow docks (e.g. the hub's 400px tile)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "showClear",
                "type": "boolean",
                "attribute": "show-clear",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Render a \"Clear\" affordance."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "clearVariant",
                "type": "string",
                "attribute": "clear-variant",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'text'",
                "complexType": {
                    "original": "'text' | 'icon'",
                    "resolved": "\"icon\" | \"text\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Clear-affordance presentation: `text` = the \"Clear\"/\"Clear all\" link\n(default, tasks/calendar unchanged); `icon` = a quiet icon-only button\n(funnel-with-slash) for hosts where a text link sticks out too much."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "layout",
                "type": "string",
                "attribute": "layout",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'inline'",
                "complexType": {
                    "original": "'inline' | 'menu'",
                    "resolved": "\"inline\" | \"menu\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Presentation:\n - `inline` (default) \u2014 the three dropdown pills sit in a row (bar/compact).\n - `menu` \u2014 a single filter icon-button that opens ONE popover holding the\n   Group / Sort / Status selectors. Collapses the toolbar to a single\n   trigger (for tight headers next to a search input). An active-state dot\n   shows on the trigger when a non-default filter is set."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "defaultGroup",
                "type": "string",
                "attribute": "default-group",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Default group id \u2014 used only to decide the `menu` trigger's active dot\n(dot shows when `groupBy` differs from this). Empty \u2192 not considered."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "defaultSort",
                "type": "string",
                "attribute": "default-sort",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Default sort id \u2014 used only for the `menu` trigger's active dot."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "groupLabel",
                "type": "string",
                "attribute": "group-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Group'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Heading for the group dropdown (pill label + menu-row label). Hosts reusing\nthe control outside tasks can rename it (e.g. \"Tool\" for the hub's history)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "sortLabel",
                "type": "string",
                "attribute": "sort-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Sort'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Heading for the sort dropdown."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "statusLabel",
                "type": "string",
                "attribute": "status-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Status'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Heading for the status dropdown."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "openKey"
            }, {
                "name": "menuOpen"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "groupChange",
                "method": "groupChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "The group mode changed."
                },
                "complexType": {
                    "original": "{ value: string }",
                    "resolved": "{ value: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "sortChange",
                "method": "sortChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "The sort mode changed."
                },
                "complexType": {
                    "original": "{ value: string }",
                    "resolved": "{ value: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "taskStatusChange",
                "method": "taskStatusChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "The status filter changed."
                },
                "complexType": {
                    "original": "{ value: string }",
                    "resolved": "{ value: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "clearAll",
                "method": "clearAll",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "The clear affordance was pressed."
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-TASK-CONTROLS",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/task-controls/task-controls.css",
                        "relativePath": "task-controls.css",
                        "originalComponentPath": "task-controls.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": false,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": true,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": true,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": true,
        "hasListener": false,
        "hasListenerTarget": false,
        "hasListenerTargetWindow": false,
        "hasListenerTargetDocument": false,
        "hasListenerTargetBody": false,
        "hasMember": true,
        "hasMethod": false,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": false,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": true,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": true,
        "hasVdomRef": true,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["d", "width", "height", "viewBox", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "aria-hidden", "x1", "y1", "x2", "y2", "class", "type", "aria-haspopup", "aria-expanded", "aria-label", "title", "onClick", "points", "role", "aria-selected", "id"],
        "htmlTagNames": ["svg", "path", "line", "div", "button", "span", "polyline"],
        "htmlParts": [],
        "htmlSlots": [],
        "isUpdateable": true,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
};
//# sourceMappingURL=task-controls.js.map