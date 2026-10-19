import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopListFilterSort = class {
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-list-filter-sort",
        "componentClassName": "PopListFilterSort",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "value",
                "type": "string",
                "attribute": "value",
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
                    "text": "Current search text (\u2192 pop-search-filter `value`)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "placeholder",
                "type": "string",
                "attribute": "placeholder",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Search\u2026'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Search placeholder (\u2192 pop-search-filter)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "filters",
                "type": "string",
                "attribute": "filters",
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
                    "text": "JSON filter group descriptors (\u2192 pop-search-filter `filters`)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "debounce",
                "type": "number",
                "attribute": "debounce",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "150",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Debounce (ms) for searchChange (\u2192 pop-search-filter)."
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
                "defaultValue": "true",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Show \"Clear all\" in the filter popover (\u2192 pop-search-filter)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "views",
                "type": "string",
                "attribute": "views",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[\"list\",\"card\"]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON view list (\u2192 pop-view-switcher `views`). `[]` hides the switcher."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "view",
                "type": "string",
                "attribute": "view",
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
                    "text": "Current view (\u2192 pop-view-switcher `value`)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "searchChange",
                "method": "searchChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Re-emitted from pop-search-filter: debounced search text."
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "filterChange",
                "method": "filterChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Re-emitted from pop-search-filter: a filter group changed."
                },
                "complexType": {
                    "original": "{ key: string; value: string }",
                    "resolved": "{ key: string; value: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "clearFilters",
                "method": "clearFilters",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Re-emitted from pop-search-filter: \"Clear all\" pressed."
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "viewChange",
                "method": "viewChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Re-emitted from pop-view-switcher: the view changed."
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-LIST-FILTER-SORT",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/list-filter-sort/list-filter-sort.css",
                        "relativePath": "list-filter-sort.css",
                        "originalComponentPath": "list-filter-sort.css"
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
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": false,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": false,
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
        "hasPropNumber": true,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": true,
        "hasState": false,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "value", "placeholder", "filters", "debounce", "showClear", "onSearchChange", "onFilterChange", "onClearFilters", "name", "views", "onViewChange"],
        "htmlTagNames": ["div", "pop-search-filter", "slot", "pop-view-switcher"],
        "htmlParts": [],
        "htmlSlots": ["input", "actions"],
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
//# sourceMappingURL=list-filter-sort.js.map