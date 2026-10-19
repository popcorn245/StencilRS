import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
const VALUE = 'value';
const COUNT = `count`;
const ALIAS = VALUE;
const NAMED = 'named';
const CHECKED = 'checked';
const PREFIX = 'sta';
const TEMPLATE = `${PREFIX}tus`;
const CLICK = 'click';
const KEYS = { open: 'open', nested: { size: 'size' } };
const LOOSE = { label: 'label' };
var Events;
(function (Events) {
    Events["Focus"] = "focusin";
    Events["Blur"] = "focusout";
    Events["Out"] = "focusout";
})(Events || (Events = {}));
export const ConstArgs = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.changed = __stencil_createEvent(this, "changed", 7);
    }
    value;
    open;
    size;
    named;
    checked;
    status;
    label;
    count = 0;
    changed;
    onValue() { }
    onAny() { }
    onOpen() { }
    onMore() { }
    onClick() { }
    onFocus() { }
    onBlur() { }
    render() {
        return h("div", { key: '0' }, this.value);
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "const-args",
        "componentClassName": "ConstArgs",
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
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
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
            }, {
                "name": "open",
                "type": "boolean",
                "attribute": "open",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "size",
                "type": "number",
                "attribute": "size",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "named",
                "type": "string",
                "attribute": "named",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
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
            }, {
                "name": "checked",
                "type": "boolean",
                "attribute": "checked",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "status",
                "type": "string",
                "attribute": "status",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
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
            }, {
                "name": "label",
                "type": "string",
                "attribute": "label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
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
        "states": [{
                "name": "count"
            }],
        "methods": [],
        "listeners": [{
                "name": "click",
                "method": "onClick",
                "capture": false,
                "passive": false,
                "target": undefined
            }, {
                "name": "focusin",
                "method": "onFocus",
                "capture": false,
                "passive": false,
                "target": "document"
            }, {
                "name": "focusout",
                "method": "onBlur",
                "capture": false,
                "passive": false,
                "target": undefined
            }],
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
        "watchers": [{
                "propName": "value",
                "methodName": "onValue",
                "handlerOptions": undefined
            }, {
                "propName": "count",
                "methodName": "onAny",
                "handlerOptions": undefined
            }, {
                "propName": "value",
                "methodName": "onAny",
                "handlerOptions": undefined
            }, {
                "propName": "open",
                "methodName": "onOpen",
                "handlerOptions": undefined
            }, {
                "propName": "size",
                "methodName": "onOpen",
                "handlerOptions": undefined
            }, {
                "propName": "named",
                "methodName": "onMore",
                "handlerOptions": undefined
            }, {
                "propName": "checked",
                "methodName": "onMore",
                "handlerOptions": undefined
            }, {
                "propName": "status",
                "methodName": "onMore",
                "handlerOptions": undefined
            }, {
                "propName": "label",
                "methodName": "onMore",
                "handlerOptions": undefined
            }],
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
        "hasListener": true,
        "hasListenerTarget": true,
        "hasListenerTargetWindow": false,
        "hasListenerTargetDocument": true,
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
        "hasSlot": false,
        "hasState": true,
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
        "hasWatchCallback": true,
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
    static get watchers() { return {
        "value": [{
                "onValue": 0
            }, {
                "onAny": 0
            }],
        "count": [{
                "onAny": 0
            }],
        "open": [{
                "onOpen": 0
            }],
        "size": [{
                "onOpen": 0
            }],
        "named": [{
                "onMore": 0
            }],
        "checked": [{
                "onMore": 0
            }],
        "status": [{
                "onMore": 0
            }],
        "label": [{
                "onMore": 0
            }]
    }; }
};
//# sourceMappingURL=const-args.js.map