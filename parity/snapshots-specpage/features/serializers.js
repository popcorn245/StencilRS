import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const SerializersCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    when = new Date(0);
    tags = [];
    get label() {
        return this._label;
    }
    _label = '';
    whenToAttr(value) {
        return value?.toISOString();
    }
    whenFromAttr(value) {
        return new Date(value);
    }
    tagsTranslate(value) {
        return Array.isArray(value) ? value.join(',') : value.split(',');
    }
    labelToAttr(value) {
        return value.toUpperCase();
    }
    /** No @Prop named `missing`: ignored. */
    missingFromAttr(value) {
        return value;
    }
    render() {
        return h("p", { key: '0' },
            this.when.toISOString(),
            " ",
            this.tags.join(' '),
            " ",
            this.label);
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "serializers-cmp",
        "componentClassName": "SerializersCmp",
        "elementRef": null,
        "encapsulation": "none",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "when",
                "type": "any",
                "attribute": "when",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "new Date(0)",
                "complexType": {
                    "original": "Date",
                    "resolved": "Date",
                    "references": {
                        "Date": {
                            "location": "global",
                            "id": "global::Date"
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
                "name": "tags",
                "type": "unknown",
                "attribute": "tags",
                "reflect": true,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
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
                "name": "label",
                "type": "string",
                "attribute": "label",
                "reflect": true,
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
                    "text": ""
                },
                "internal": false,
                "getter": true,
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
        "serializers": [{
                "propName": "when",
                "methodName": "whenToAttr"
            }, {
                "propName": "tags",
                "methodName": "tagsTranslate"
            }, {
                "propName": "label",
                "methodName": "labelToAttr"
            }],
        "deserializers": [{
                "propName": "when",
                "methodName": "whenFromAttr"
            }, {
                "propName": "tags",
                "methodName": "tagsTranslate"
            }],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": false,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": true,
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
        "hasPropNumber": false,
        "hasPropBoolean": false,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": true,
        "hasRenderFn": true,
        "hasSerializer": true,
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
        "htmlTagNames": ["p"],
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
    static get serializers() { return {
        "when": [{
                "whenToAttr": 0
            }],
        "tags": [{
                "tagsTranslate": 0
            }],
        "label": [{
                "labelToAttr": 0
            }]
    }; }
    static get deserializers() { return {
        "when": [{
                "whenFromAttr": 0
            }],
        "tags": [{
                "tagsTranslate": 0
            }]
    }; }
};
//# sourceMappingURL=serializers.js.map