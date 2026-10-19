import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export var Level;
(function (Level) {
    Level[Level["Low"] = 0] = "Low";
    Level[Level["High"] = 1] = "High";
})(Level || (Level = {}));
export const PopNoteCard = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.picked = __stencil_createEvent(this, "picked", 7);
        this.moded = __stencil_createEvent(this, "moded", 7);
        this.leveled = __stencil_createEvent(this, "leveled", 7);
        this.listed = __stencil_createEvent(this, "listed", 7);
        this.pair = __stencil_createEvent(this, "pair", 7);
        this.inline = __stencil_createEvent(this, "inline", 7);
        this.plain = __stencil_createEvent(this, "plain", 7);
        this.fn = __stencil_createEvent(this, "fn", 7);
    }
    /** Fired when the note is picked. */
    picked;
    moded;
    leveled;
    listed;
    pair;
    inline;
    plain;
    fn;
    render() {
        return h("div", { key: '0' });
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-note-card",
        "componentClassName": "PopNoteCard",
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
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "picked",
                "method": "picked",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fired when the note is picked."
                },
                "complexType": {
                    "original": "NoteCardData",
                    "resolved": "NoteCardData",
                    "references": {
                        "NoteCardData": {
                            "location": "local",
                            "path": "features/complex-types-events.tsx",
                            "id": "features/complex-types-events.tsx::NoteCardData"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "moded",
                "method": "moded",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "Mode | undefined",
                    "resolved": "\"compact\" | \"full\" | undefined",
                    "references": {
                        "Mode": {
                            "location": "local",
                            "path": "features/complex-types-events.tsx",
                            "id": "features/complex-types-events.tsx::Mode"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "leveled",
                "method": "leveled",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "Level",
                    "resolved": "Level.High | Level.Low",
                    "references": {
                        "Level": {
                            "location": "local",
                            "path": "features/complex-types-events.tsx",
                            "id": "features/complex-types-events.tsx::Level"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "listed",
                "method": "listed",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "NoteCardData[]",
                    "resolved": "NoteCardData[]",
                    "references": {
                        "NoteCardData": {
                            "location": "local",
                            "path": "features/complex-types-events.tsx",
                            "id": "features/complex-types-events.tsx::NoteCardData"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "pair",
                "method": "pair",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "[string, number]",
                    "resolved": "[string, number]",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "inline",
                "method": "inline",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ a: Mode; b?: number }",
                    "resolved": "{ a: Mode; b?: number | undefined; }",
                    "references": {
                        "Mode": {
                            "location": "local",
                            "path": "features/complex-types-events.tsx",
                            "id": "features/complex-types-events.tsx::Mode"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "plain",
                "method": "plain",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "fn",
                "method": "fn",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "(note: NoteCardData) => void",
                    "resolved": "(note: NoteCardData) => void",
                    "references": {
                        "NoteCardData": {
                            "location": "local",
                            "path": "features/complex-types-events.tsx",
                            "id": "features/complex-types-events.tsx::NoteCardData"
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
        "hasMember": false,
        "hasMethod": false,
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
//# sourceMappingURL=complex-types-events.js.map