import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PropsPrimitives = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    str;
    num;
    bool;
    anything;
    mystery;
    list;
    obj;
    fn;
    nothing;
    render() {
        return h("div", { key: '0' }, this.str);
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "props-primitives",
        "componentClassName": "PropsPrimitives",
        "elementRef": null,
        "encapsulation": "none",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "str",
                "type": "string",
                "attribute": "str",
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
                "name": "num",
                "type": "number",
                "attribute": "num",
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
                "name": "bool",
                "type": "boolean",
                "attribute": "bool",
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
                "name": "anything",
                "type": "any",
                "attribute": "anything",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "any",
                    "resolved": "any",
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
                "name": "mystery",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "unknown",
                    "resolved": "unknown",
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
                "name": "list",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string[]",
                    "resolved": "string[]",
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
                "name": "obj",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "{ a: string }",
                    "resolved": "{ a: string; }",
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
                "name": "fn",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "() => void",
                    "resolved": "() => void",
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
                "name": "nothing",
                "type": "any",
                "attribute": "nothing",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "any",
                    "resolved": "any",
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
        "events": [],
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
        "hasEvent": false,
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
//# sourceMappingURL=props-primitives.js.map