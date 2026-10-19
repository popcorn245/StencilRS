import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const TOne = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.ev1 = __stencil_createEvent(this, "ev1", 7);
        this.ev2 = __stencil_createEvent(this, "ev2", 7);
        this.ev3 = __stencil_createEvent(this, "ev3", 7);
        this.ev4 = __stencil_createEvent(this, "ev4", 7);
    }
    f1;
    f2;
    f3;
    f4;
    f5;
    f6;
    f7;
    f8;
    f9;
    f10;
    f11;
    f12;
    f13;
    f14;
    f15;
    f16;
    f18;
    f19;
    ev1;
    ev2;
    ev3;
    ev4;
    render() { return h("div", { key: '0' }); }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "t-one",
        "componentClassName": "TOne",
        "elementRef": null,
        "encapsulation": "none",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "f1",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "(a?: number) => void",
                    "resolved": "((a?: number | undefined) => void) | undefined",
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
                "name": "f2",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "(a: string | undefined, b: number) => void",
                    "resolved": "(a: string | undefined, b: number) => void",
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
                "name": "f3",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "{ readonly a: string; m(x: number): void; [k: string]: any; cb: () => void }",
                    "resolved": "{ [k: string]: any; readonly a: string; m(x: number): void; cb: () => void; }",
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
                "name": "f4",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "[string, number]",
                    "resolved": "[string, number]",
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
                "name": "f5",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "Box<string>",
                    "resolved": "Box<string>",
                    "references": {
                        "Box": {
                            "location": "local",
                            "path": "features/complex-types-props.tsx",
                            "id": "features/complex-types-props.tsx::Box"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "f6",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "Pair<string>",
                    "resolved": "string",
                    "references": {
                        "Pair": {
                            "location": "global",
                            "id": "global::Pair"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "f7",
                "type": "any",
                "attribute": "f-7",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "Array<string>",
                    "resolved": "string",
                    "references": {
                        "Array": {
                            "location": "global",
                            "id": "global::Array"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "f8",
                "type": "any",
                "attribute": "f-8",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "ReadonlyArray<string>",
                    "resolved": "string",
                    "references": {
                        "ReadonlyArray": {
                            "location": "global",
                            "id": "global::ReadonlyArray"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "f9",
                "type": "number",
                "attribute": "f-9",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "1.50 | -1 | 0x10 | 1e3",
                    "resolved": "-1 | 1.5 | 1000 | 16",
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
                "name": "f10",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "Fn",
                    "resolved": "(a?: number | undefined, ...rest: {}) => void",
                    "references": {
                        "Fn": {
                            "location": "global",
                            "id": "global::Fn"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "f11",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "Pair<string>[]",
                    "resolved": "string[]",
                    "references": {
                        "Pair": {
                            "location": "global",
                            "id": "global::Pair"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "f12",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "(string | number)[]",
                    "resolved": "(number | string)[]",
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
                "name": "f13",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "Box<string> | Pair<number>",
                    "resolved": "Box<string> | number",
                    "references": {
                        "Box": {
                            "location": "local",
                            "path": "features/complex-types-props.tsx",
                            "id": "features/complex-types-props.tsx::Box"
                        },
                        "Pair": {
                            "location": "global",
                            "id": "global::Pair"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "f14",
                "type": "any",
                "attribute": "f-1-4",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "Promise<string>",
                    "resolved": "string",
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "f15",
                "type": "any",
                "attribute": "f-1-5",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "Map<string, number>",
                    "resolved": "number | string",
                    "references": {
                        "Map": {
                            "location": "global",
                            "id": "global::Map"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "f16",
                "type": "string",
                "attribute": "f-1-6",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "'a\"b' | 'c\\nd'",
                    "resolved": "\"a\\\"b\" | \"c\\nd\"",
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
                "name": "f18",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string & { brand: 1 }",
                    "resolved": "string & { brand: 1; }",
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
                "name": "f19",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "{ a: 1 } | { b: 2 }",
                    "resolved": "{ a: 1; } | { b: 2; }",
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
                "name": "ev1",
                "method": "ev1",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ a?: string; b: Box<number> }",
                    "resolved": "{ a?: string | undefined; b: Box<number>; }",
                    "references": {
                        "Box": {
                            "location": "local",
                            "path": "features/complex-types-props.tsx",
                            "id": "features/complex-types-props.tsx::Box"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "ev2",
                "method": "ev2",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "(x: number) => string",
                    "resolved": "(x: number) => string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "ev3",
                "method": "ev3",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "string | undefined",
                    "resolved": "string | undefined",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "ev4",
                "method": "ev4",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "[number, number]",
                    "resolved": "[number, number]",
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
        "hasPropNumber": true,
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
        "hasVdomText": false,
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
//# sourceMappingURL=complex-types-props.js.map