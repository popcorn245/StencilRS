import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export var Color;
(function (Color) {
    Color[Color["Red"] = 0] = "Red";
    Color[Color["Green"] = 1] = "Green";
})(Color || (Color = {}));
export const MOne = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    async a1(x, y, ...rest) { }
    async a2(opts, cb) { return null; }
    async a3(m, c, p, arr, ro) { return null; }
    async a4(x = 5, y = 'a', z = 'x') { return []; }
    async a5() { return null; }
    async a6(t, u, v) { return null; }
    async a7(f, g) { return null; }
    a8() { return null; }
    async a9() { }
    async a10() { return 1; }
    a11() { }
    async a12(x, y, z, w) { }
    async a13(x, y, z) { }
    async a14(x, y) { }
    render() { return h("div", { key: '0' }); }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "m-one",
        "componentClassName": "MOne",
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
                "name": "a1",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(x: string, y?: number, ...rest: boolean[]) => Promise<void>",
                    "parameters": [{
                            "name": "x",
                            "type": "string",
                            "docs": ""
                        }, {
                            "name": "y",
                            "type": "number | undefined",
                            "docs": ""
                        }, {
                            "name": "rest",
                            "type": "{}",
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
                "name": "a2",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(opts: { id: string; n?: number; }, cb: (e: Event) => void) => Promise<Box<string>>",
                    "parameters": [{
                            "name": "opts",
                            "type": "{ id: string; n?: number | undefined; }",
                            "docs": ""
                        }, {
                            "name": "cb",
                            "type": "(e: Event) => void",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        },
                        "Box": {
                            "location": "local",
                            "path": "features/complex-types-methods.tsx",
                            "id": "features/complex-types-methods.tsx::Box"
                        },
                        "Event": {
                            "location": "global",
                            "id": "global::Event"
                        }
                    },
                    "return": "Promise<Box<string>>"
                },
                "internal": false
            }, {
                "name": "a3",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(m: Mode, c: Color, p: Pair<number>, arr: Array<string>, ro: ReadonlyArray<number>) => Promise<Mode | undefined>",
                    "parameters": [{
                            "name": "m",
                            "type": "\"b\" | \"a\"",
                            "docs": ""
                        }, {
                            "name": "c",
                            "type": "Color",
                            "docs": ""
                        }, {
                            "name": "p",
                            "type": "{ a: number; b: number; }",
                            "docs": ""
                        }, {
                            "name": "arr",
                            "type": "Array<string>",
                            "docs": ""
                        }, {
                            "name": "ro",
                            "type": "ReadonlyArray<number>",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        },
                        "Mode": {
                            "location": "local",
                            "path": "features/complex-types-methods.tsx",
                            "id": "features/complex-types-methods.tsx::Mode"
                        },
                        "Color": {
                            "location": "local",
                            "path": "features/complex-types-methods.tsx",
                            "id": "features/complex-types-methods.tsx::Color"
                        },
                        "Pair": {
                            "location": "global",
                            "id": "global::Pair"
                        },
                        "Array": {
                            "location": "global",
                            "id": "global::Array"
                        },
                        "ReadonlyArray": {
                            "location": "global",
                            "id": "global::ReadonlyArray"
                        }
                    },
                    "return": "Promise<Mode | undefined>"
                },
                "internal": false
            }, {
                "name": "a4",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(x?: number, y?: string, z?: \"x\" | \"y\") => Promise<string[]>",
                    "parameters": [{
                            "name": "x",
                            "type": "number",
                            "docs": ""
                        }, {
                            "name": "y",
                            "type": "string",
                            "docs": ""
                        }, {
                            "name": "z",
                            "type": "\"x\" | \"y\"",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<{}>"
                },
                "internal": false
            }, {
                "name": "a5",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<{ a: 1; b: \"x\" | \"y\"; }>",
                    "parameters": [],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<{ a: 1; b: \"x\" | \"y\"; }>"
                },
                "internal": false
            }, {
                "name": "a6",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(t: [string, number], u: string | number | undefined, v: null) => Promise<Promise<number>>",
                    "parameters": [{
                            "name": "t",
                            "type": "[string, number]",
                            "docs": ""
                        }, {
                            "name": "u",
                            "type": "string | number | undefined",
                            "docs": ""
                        }, {
                            "name": "v",
                            "type": "null",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<Promise<number>>"
                },
                "internal": false
            }, {
                "name": "a7",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(f: () => Promise<void>, g?: (a: number, b?: string) => void) => Promise<(x: number) => string>",
                    "parameters": [{
                            "name": "f",
                            "type": "() => Promise<void>",
                            "docs": ""
                        }, {
                            "name": "g",
                            "type": "((a: number, b?: string | undefined) => void) | undefined",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<(x: number) => string>"
                },
                "internal": false
            }, {
                "name": "a8",
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
                "name": "a9",
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
                "name": "a10",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => unknown",
                    "parameters": [],
                    "references": {},
                    "return": "unknown"
                },
                "internal": false
            }, {
                "name": "a11",
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
                "name": "a12",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(x: any, y: unknown, z: object, w: never) => Promise<any>",
                    "parameters": [{
                            "name": "x",
                            "type": "any",
                            "docs": ""
                        }, {
                            "name": "y",
                            "type": "unknown",
                            "docs": ""
                        }, {
                            "name": "z",
                            "type": "object",
                            "docs": ""
                        }, {
                            "name": "w",
                            "type": "never",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }, {
                "name": "a13",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(x: Color.Red, y: -1 | 2, z: `a`) => Promise<void>",
                    "parameters": [{
                            "name": "x",
                            "type": "Color.Red",
                            "docs": ""
                        }, {
                            "name": "y",
                            "type": "2 | -1",
                            "docs": ""
                        }, {
                            "name": "z",
                            "type": "\"a\"",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        },
                        "Color": {
                            "location": "local",
                            "path": "features/complex-types-methods.tsx",
                            "id": "features/complex-types-methods.tsx::Color"
                        }
                    },
                    "return": "Promise<void>"
                },
                "internal": false
            }, {
                "name": "a14",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(x: Record<string, number>, y: Partial<Box<string>>) => Promise<Map<string, Box<number>>>",
                    "parameters": [{
                            "name": "x",
                            "type": "Record<string, number>",
                            "docs": ""
                        }, {
                            "name": "y",
                            "type": "Partial<Box<string>>",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        },
                        "Map": {
                            "location": "global",
                            "id": "global::Map"
                        },
                        "Box": {
                            "location": "local",
                            "path": "features/complex-types-methods.tsx",
                            "id": "features/complex-types-methods.tsx::Box"
                        },
                        "Record": {
                            "location": "global",
                            "id": "global::Record"
                        },
                        "Partial": {
                            "location": "global",
                            "id": "global::Partial"
                        }
                    },
                    "return": "Promise<Map<string, Box<number>>>"
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
//# sourceMappingURL=complex-types-methods.js.map