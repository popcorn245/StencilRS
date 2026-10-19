import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const MethodReturns = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    async asyncNoAnnotation() { }
    annotatedPromise() {
        return Promise.resolve();
    }
    annotatedVoid() { }
    emptyBody() { }
    returnsNumber() {
        return 1;
    }
    annotatedBoolean() {
        return true;
    }
    returnsPromiseResolve() {
        return Promise.resolve(1);
    }
    nestedReturnOnly() {
        [1].forEach((x) => {
            return x;
        });
    }
    render() {
        return h("div", { key: '0' });
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "method-returns",
        "componentClassName": "MethodReturns",
        "elementRef": null,
        "encapsulation": "none",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [],
        "virtualProperties": [],
        "states": [],
        "methods": [{
                "name": "asyncNoAnnotation",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => any",
                    "parameters": [],
                    "references": {},
                    "return": "any"
                },
                "internal": false
            }, {
                "name": "annotatedPromise",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<void>",
                    "parameters": [],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<void>"
                },
                "internal": false
            }, {
                "name": "annotatedVoid",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<void>",
                    "parameters": [],
                    "references": {},
                    "return": "Promise<void>"
                },
                "internal": false
            }, {
                "name": "emptyBody",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<void>",
                    "parameters": [],
                    "references": {},
                    "return": "Promise<void>"
                },
                "internal": false
            }, {
                "name": "returnsNumber",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => number",
                    "parameters": [],
                    "references": {},
                    "return": "number"
                },
                "internal": false
            }, {
                "name": "annotatedBoolean",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => boolean",
                    "parameters": [],
                    "references": {},
                    "return": "boolean"
                },
                "internal": false
            }, {
                "name": "returnsPromiseResolve",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => any",
                    "parameters": [],
                    "references": {},
                    "return": "any"
                },
                "internal": false
            }, {
                "name": "nestedReturnOnly",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<void>",
                    "parameters": [],
                    "references": {},
                    "return": "Promise<void>"
                },
                "internal": false
            }],
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
        "hasMethod": true,
        "hasMode": false,
        "hasModernPropertyDecls": false,
        "hasAttribute": false,
        "hasProp": false,
        "hasPropNumber": false,
        "hasPropBoolean": false,
        "hasPropString": false,
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
        "hasVdomText": false,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key"],
        "htmlTagNames": ["div"],
        "htmlParts": [],
        "htmlSlots": [],
        "isUpdateable": false,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
};
//# sourceMappingURL=method-returns.js.map