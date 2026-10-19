import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
const LazyConstructor = class {
    internals;
    changed;
    value = 'a';
    get el() { return __stencil_getElement(this); }
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.changed = __stencil_createEvent(this, "changed", 7);
        if (hostRef.$hostElement$["s-ei"]) {
            this.internals = hostRef.$hostElement$["s-ei"];
        }
        else {
            this.internals = hostRef.$hostElement$.attachInternals();
            hostRef.$hostElement$["s-ei"] = this.internals;
        }
        this.internals.states.add("open");
        console.log('built');
    }
    render() {
        return h("div", { key: '0' }, this.el.tagName);
    }
    static get attachInternalsCustomStates() { return [{
            "name": "open",
            "initialValue": true,
            "docs": ""
        }]; }
    static get formAssociated() { return true; }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": "internals",
        "attachInternalsCustomStates": [{
                "name": "open",
                "initialValue": true,
                "docs": ""
            }],
        "formAssociated": true,
        "tagName": "lazy-constructor",
        "componentClassName": "LazyConstructor",
        "elementRef": "el",
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
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'a'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
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
                "name": "changed",
                "method": "changed",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
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
        "styles": [],
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
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": false,
        "hasStyle": false,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": false,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": false,
        "hasVdomPropOrAttr": false,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key"],
        "htmlTagNames": ["div"],
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
//# sourceMappingURL=lazy-constructor.js.map