import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h, Host } from "@stencil/core/testing";
export const PopFillableField = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.valueChange = __stencil_createEvent(this, "valueChange", 7);
        this.askChange = __stencil_createEvent(this, "askChange", 7);
    }
    /** Field label shown above the control. */
    label;
    /** Optional secondary text shown next to the label (e.g. a unit hint). */
    hint;
    /** Value for the built-in text input (ignored when `useSlot` is set). */
    value = '';
    /** Placeholder for the built-in text input. */
    placeholder;
    /** Input type for the built-in text input (text, number, datetime-local…). */
    inputType = 'text';
    /** When set, render a <select> of these options instead of a text input.
     *  The selected option is whichever matches `value`. */
    options;
    /** Whether the field auto-fills on tap (true) or is baked (false). */
    askOnTap = false;
    /** Whether to show the auto-fill toggle at all. */
    askable = true;
    /** Render a slotted control instead of the built-in text input. */
    useSlot = false;
    /** Emitted when the built-in input value changes. */
    valueChange;
    /** Emitted when the auto-fill toggle flips. Detail is the new askOnTap. */
    askChange;
    onInput = (e) => {
        this.value = e.target.value;
        this.valueChange.emit(this.value);
    };
    toggle = () => {
        this.askOnTap = !this.askOnTap;
        this.askChange.emit(this.askOnTap);
    };
    render() {
        const on = this.askOnTap;
        return (h(Host, { key: '0' },
            h("label", { key: '1', class: "ff" },
                h("span", { key: '2', class: "ff__label" },
                    h("span", { key: '3', class: "ff__label-text" }, this.label),
                    this.hint && h("span", { key: '4', class: "ff__hint" }, this.hint)),
                h("div", { key: '5', class: { ff__row: true, 'ff__row--ask': on } },
                    this.options ? (h("select", { class: "ff__input", onInput: this.onInput }, this.options.map((o) => (h("option", { value: o.value, selected: o.value === this.value }, o.label))))) : this.useSlot ? (h("span", { class: "ff__control" },
                        h("slot", null))) : (h("input", { class: "ff__input", type: this.inputType, value: this.value, placeholder: this.placeholder, onInput: this.onInput })),
                    this.askable && (h("button", { key: '6', type: "button", class: { ff__toggle: true, 'ff__toggle--on': on }, "aria-pressed": on ? 'true' : 'false', "aria-label": on ? 'Auto-fill on tap: on' : 'Auto-fill on tap: off', title: on ? 'Asks you when the tag is tapped' : 'Baked into the tag', onClick: this.toggle }, on ? (h("svg", { viewBox: "0 0 24 24", width: "18", height: "18", "aria-hidden": "true" },
                        h("path", { fill: "currentColor", d: "M7 2v11h3v9l7-12h-4l4-8z" }))) : (h("svg", { viewBox: "0 0 24 24", width: "18", height: "18", "aria-hidden": "true" },
                        h("path", { fill: "currentColor", d: "M3.27 3 2 4.27l5 5V13h3v9l3.58-6.14L17.73 20 19 18.73 3.27 3zM17 10h-4l4-8H7v2.18l8.46 8.46L17 10z" })))))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-fillable-field",
        "componentClassName": "PopFillableField",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "label",
                "type": "string",
                "attribute": "label",
                "reflect": false,
                "mutable": false,
                "required": true,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Field label shown above the control."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "hint",
                "type": "string",
                "attribute": "hint",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Optional secondary text shown next to the label (e.g. a unit hint)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "value",
                "type": "string",
                "attribute": "value",
                "reflect": false,
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
                    "text": "Value for the built-in text input (ignored when `useSlot` is set)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "placeholder",
                "type": "string",
                "attribute": "placeholder",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Placeholder for the built-in text input."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "inputType",
                "type": "string",
                "attribute": "input-type",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'text'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Input type for the built-in text input (text, number, datetime-local\u2026)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "options",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "{ value: string; label: string }[]",
                    "resolved": "{ value: string; label: string; }[]",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "When set, render a <select> of these options instead of a text input.\nThe selected option is whichever matches `value`."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "askOnTap",
                "type": "boolean",
                "attribute": "ask-on-tap",
                "reflect": false,
                "mutable": true,
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
                    "text": "Whether the field auto-fills on tap (true) or is baked (false)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "askable",
                "type": "boolean",
                "attribute": "askable",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "true",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Whether to show the auto-fill toggle at all."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "useSlot",
                "type": "boolean",
                "attribute": "use-slot",
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
                    "text": "Render a slotted control instead of the built-in text input."
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
                "name": "valueChange",
                "method": "valueChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the built-in input value changes."
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "askChange",
                "method": "askChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the auto-fill toggle flips. Detail is the new askOnTap."
                },
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-FILLABLE-FIELD",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/fillable-field/fillable-field.css",
                        "relativePath": "fillable-field.css",
                        "originalComponentPath": "fillable-field.css"
                    }]
            }],
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
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": true,
        "hasReflect": false,
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
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "onInput", "value", "selected", "type", "placeholder", "aria-pressed", "aria-label", "title", "onClick", "viewBox", "width", "height", "aria-hidden", "fill", "d"],
        "htmlTagNames": ["label", "span", "div", "select", "option", "slot", "input", "button", "svg", "path"],
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
//# sourceMappingURL=fillable-field.js.map