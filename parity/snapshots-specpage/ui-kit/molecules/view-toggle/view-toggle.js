import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopViewToggle = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popViewChange = __stencil_createEvent(this, "popViewChange", 7);
    }
    /** Current active view: 'card' or 'list' */
    value = 'card';
    /** Emitted when the view changes. `event.detail` is the new value ('card' | 'list'). */
    popViewChange;
    select(next) {
        if (this.value === next)
            return;
        this.value = next;
        this.popViewChange.emit(next);
    }
    render() {
        return (h("div", { key: '0', class: "pvt-root", role: "group", "aria-label": "View toggle" },
            h("button", { key: '1', class: `pvt-btn ${this.value === 'card' ? 'pvt-btn--active' : ''}`, "aria-pressed": this.value === 'card' ? 'true' : 'false', "aria-label": "Card view", title: "Card view", type: "button", onClick: () => this.select('card') },
                h("svg", { key: '2', width: "16", height: "16", viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" },
                    h("rect", { key: '3', x: "3", y: "3", width: "8", height: "8", rx: "1.5" }),
                    h("rect", { key: '4', x: "13", y: "3", width: "8", height: "8", rx: "1.5" }),
                    h("rect", { key: '5', x: "3", y: "13", width: "8", height: "8", rx: "1.5" }),
                    h("rect", { key: '6', x: "13", y: "13", width: "8", height: "8", rx: "1.5" }))),
            h("button", { key: '7', class: `pvt-btn ${this.value === 'list' ? 'pvt-btn--active' : ''}`, "aria-pressed": this.value === 'list' ? 'true' : 'false', "aria-label": "List view", title: "List view", type: "button", onClick: () => this.select('list') },
                h("svg", { key: '8', width: "16", height: "16", viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" },
                    h("rect", { key: '9', x: "3", y: "5", width: "18", height: "2.5", rx: "1.25" }),
                    h("rect", { key: 'a', x: "3", y: "11", width: "18", height: "2.5", rx: "1.25" }),
                    h("rect", { key: 'b', x: "3", y: "17", width: "18", height: "2.5", rx: "1.25" })))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-view-toggle",
        "componentClassName": "PopViewToggle",
        "elementRef": null,
        "encapsulation": "none",
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
                "reflect": true,
                "mutable": true,
                "required": false,
                "optional": false,
                "defaultValue": "'card'",
                "complexType": {
                    "original": "'card' | 'list'",
                    "resolved": "\"card\" | \"list\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Current active view: 'card' or 'list'"
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
                "name": "popViewChange",
                "method": "popViewChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the view changes. `event.detail` is the new value ('card' | 'list')."
                },
                "complexType": {
                    "original": "'card' | 'list'",
                    "resolved": "\"card\" | \"list\"",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-VIEW-TOGGLE",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/view-toggle/view-toggle.css",
                        "relativePath": "view-toggle.css",
                        "originalComponentPath": "view-toggle.css"
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
        "hasPropNumber": false,
        "hasPropBoolean": false,
        "hasPropString": true,
        "hasPropMutable": true,
        "hasReflect": true,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
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
        "hasVdomText": false,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "role", "aria-label", "aria-pressed", "title", "type", "onClick", "width", "height", "viewBox", "fill", "aria-hidden", "x", "y", "rx"],
        "htmlTagNames": ["div", "button", "svg", "rect"],
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
//# sourceMappingURL=view-toggle.js.map