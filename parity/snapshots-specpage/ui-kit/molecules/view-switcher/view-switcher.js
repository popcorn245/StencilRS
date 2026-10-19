import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
const VIEW_META = {
    list: { icon: 'list', label: 'List view' },
    card: { icon: 'grid', label: 'Card view' },
    kanban: { icon: 'albums-outline', label: 'Kanban view' },
    table: { icon: 'reorder-four-outline', label: 'Table view' },
};
export const PopViewSwitcher = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.viewChange = __stencil_createEvent(this, "viewChange", 7);
    }
    /** JSON array of views to offer, from 'list' | 'card' | 'kanban' | 'table'. */
    views = '["list","card"]';
    /** The current view. */
    value = '';
    /** The user picked a view. Detail = the new view name. */
    viewChange;
    /** Parsed + validated view list. */
    parsed = [];
    parseViews(json) {
        try {
            const arr = JSON.parse(json ?? this.views);
            if (!Array.isArray(arr)) {
                this.parsed = [];
                return;
            }
            this.parsed = arr.filter((v) => typeof v === 'string' && v in VIEW_META);
        }
        catch {
            this.parsed = [];
        }
    }
    componentWillLoad() {
        this.parseViews();
    }
    pick(view) {
        if (view === this.value)
            return;
        this.viewChange.emit(view);
    }
    render() {
        if (this.parsed.length === 0)
            return null;
        return (h("div", { class: "pvs", "aria-label": "View mode" }, this.parsed.map((v) => (h("button", { type: "button", key: v, class: { pvs__btn: true, 'pvs__btn--on': this.value === v }, "aria-pressed": this.value === v ? 'true' : 'false', "aria-label": VIEW_META[v].label, title: VIEW_META[v].label, onClick: () => this.pick(v) },
            h("pop-icon", { name: VIEW_META[v].icon }))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-view-switcher",
        "componentClassName": "PopViewSwitcher",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
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
                    "text": "JSON array of views to offer, from 'list' | 'card' | 'kanban' | 'table'."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
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
                    "text": "The current view."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "parsed"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "viewChange",
                "method": "viewChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "The user picked a view. Detail = the new view name."
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "views",
                "methodName": "parseViews",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-VIEW-SWITCHER",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/view-switcher/view-switcher.css",
                        "relativePath": "view-switcher.css",
                        "originalComponentPath": "view-switcher.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": true,
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
        "hasPropBoolean": false,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
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
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "aria-label", "type", "key", "aria-pressed", "title", "onClick", "name"],
        "htmlTagNames": ["div", "button", "pop-icon"],
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
    static get watchers() { return {
        "views": [{
                "parseViews": 0
            }]
    }; }
};
//# sourceMappingURL=view-switcher.js.map