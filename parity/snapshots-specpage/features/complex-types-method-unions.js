import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const MThree = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.e1 = __stencil_createEvent(this, "e1", 7);
    }
    async c1(y) { }
    async c2(y) { }
    async c3(y, z, w, v) { return null; }
    e1;
    render() { return h("div", { key: '0' }); }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "m-three",
        "componentClassName": "MThree",
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
                "name": "c1",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(y: -1 | 2) => Promise<void>",
                    "parameters": [{
                            "name": "y",
                            "type": "-1 | 2",
                            "docs": ""
                        }],
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
                "name": "c2",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(y: 3 | -4 | 1) => Promise<void>",
                    "parameters": [{
                            "name": "y",
                            "type": "1 | 3 | -4",
                            "docs": ""
                        }],
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
                "name": "c3",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(y: Mode | undefined, z: Mode | \"c\", w: Mode | \"a\", v?: Mode) => Promise<Mode | null>",
                    "parameters": [{
                            "name": "y",
                            "type": "Mode | undefined",
                            "docs": ""
                        }, {
                            "name": "z",
                            "type": "Mode | \"c\"",
                            "docs": ""
                        }, {
                            "name": "w",
                            "type": "\"b\" | \"a\"",
                            "docs": ""
                        }, {
                            "name": "v",
                            "type": "Mode | undefined",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        },
                        "Mode": {
                            "location": "local",
                            "path": "features/complex-types-method-unions.tsx",
                            "id": "features/complex-types-method-unions.tsx::Mode"
                        }
                    },
                    "return": "Promise<Mode | null>"
                },
                "internal": false
            }],
        "listeners": [],
        "events": [{
                "name": "e1",
                "method": "e1",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ a: Mode | undefined; b: Mode | number; c: 'x' | Mode }",
                    "resolved": "{ a: Mode | undefined; b: number | Mode; c: Mode | \"x\"; }",
                    "references": {
                        "Mode": {
                            "location": "local",
                            "path": "features/complex-types-method-unions.tsx",
                            "id": "features/complex-types-method-unions.tsx::Mode"
                        }
                    }
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
//# sourceMappingURL=complex-types-method-unions.js.map