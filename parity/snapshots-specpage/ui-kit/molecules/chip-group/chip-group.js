import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const ChipGroup = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popChange = __stencil_createEvent(this, "popChange", 7);
    }
    get el() { return __stencil_getElement(this); }
    value = '';
    multiple = false;
    popChange;
    handleChipSelect(event) {
        event.stopPropagation();
        const chipValue = event.detail.value;
        if (this.multiple) {
            const values = this.value ? this.value.split(',') : [];
            const idx = values.indexOf(chipValue);
            if (idx >= 0)
                values.splice(idx, 1);
            else
                values.push(chipValue);
            this.value = values.join(',');
            this.popChange.emit({ value: this.value, values });
        }
        else {
            this.value = chipValue;
            this.popChange.emit({ value: chipValue, values: [chipValue] });
        }
        this.updateChildren();
    }
    componentDidLoad() { this.updateChildren(); }
    updateChildren() {
        const values = this.value ? this.value.split(',') : [];
        const chips = this.el.querySelectorAll('pop-chip');
        chips.forEach((chip) => {
            chip.selected = values.includes(chip.value);
        });
    }
    render() {
        return (h("div", { key: '0', class: "chip-group", role: this.multiple ? 'listbox' : 'radiogroup' },
            h("slot", { key: '1' })));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-chip-group",
        "componentClassName": "ChipGroup",
        "elementRef": "el",
        "encapsulation": "scoped",
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
                "getter": false,
                "setter": false
            }, {
                "name": "multiple",
                "type": "boolean",
                "attribute": "multiple",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
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
            }],
        "virtualProperties": [],
        "states": [],
        "methods": [],
        "listeners": [{
                "name": "popChipSelect",
                "method": "handleChipSelect",
                "capture": false,
                "passive": false,
                "target": undefined
            }],
        "events": [{
                "name": "popChange",
                "method": "popChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ value: string; values: string[] }",
                    "resolved": "{ value: string; values: {}; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-CHIP-GROUP",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/chip-group/chip-group.css",
                        "relativePath": "chip-group.css",
                        "originalComponentPath": "chip-group.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": true,
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
        "hasLifecycle": true,
        "hasListener": true,
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
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": true,
        "hasReflect": true,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": true,
        "hasState": false,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": false,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": false,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "role"],
        "htmlTagNames": ["div", "slot"],
        "htmlParts": [],
        "htmlSlots": [""],
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
//# sourceMappingURL=chip-group.js.map