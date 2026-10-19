import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopCaptureBar = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.capture = __stencil_createEvent(this, "capture", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Placeholder copy. */
    placeholder = 'Capture a thought…';
    /** Autofocus the field on mount (Home does; the topbar variant may not). */
    autofocus = false;
    /** Fired with the captured text when the user submits a non-empty thought. */
    capture;
    value = '';
    input;
    componentDidLoad() {
        if (this.autofocus)
            this.input?.focus();
    }
    submit = () => {
        const text = this.value.trim();
        if (!text)
            return;
        this.capture.emit({ text });
        this.value = '';
        // keep focus for the save-and-clear loop
        this.input?.focus();
    };
    onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.submit();
        }
    };
    onInput = (e) => {
        this.value = e.target.value;
    };
    render() {
        const hasText = this.value.trim().length > 0;
        return (h("div", { key: '0', class: { 'cb': true, 'is-active': hasText } },
            h("span", { key: '1', class: "cb__lead", "aria-hidden": "true" },
                h("pop-brand-icon", { key: '2', name: "edit" })),
            h("input", { key: '3', ref: (el) => (this.input = el), class: "cb__input", type: "text", enterkeyhint: "done", autocomplete: "off", value: this.value, placeholder: this.placeholder, "aria-label": this.placeholder, onInput: this.onInput, onKeyDown: this.onKeyDown }),
            h("button", { key: '4', type: "button", class: "cb__send", "aria-label": "Capture thought", title: "Capture (Enter)", disabled: !hasText, onClick: this.submit },
                h("svg", { key: '5', width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
                    h("path", { key: '6', d: "M5 12h14M13 6l6 6-6 6" })))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-capture-bar",
        "componentClassName": "PopCaptureBar",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "placeholder",
                "type": "string",
                "attribute": "placeholder",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Capture a thought\u2026'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Placeholder copy."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "autofocus",
                "type": "boolean",
                "attribute": "autofocus",
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
                    "text": "Autofocus the field on mount (Home does; the topbar variant may not)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "value"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "capture",
                "method": "capture",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fired with the captured text when the user submits a non-empty thought."
                },
                "complexType": {
                    "original": "{ text: string }",
                    "resolved": "{ text: string; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-CAPTURE-BAR",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/capture-bar/capture-bar.css",
                        "relativePath": "capture-bar.css",
                        "originalComponentPath": "capture-bar.css"
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
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": true,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": false,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "aria-hidden", "name", "ref", "type", "enterkeyhint", "autocomplete", "value", "placeholder", "aria-label", "onInput", "onKeyDown", "title", "disabled", "onClick", "width", "height", "viewBox", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "d"],
        "htmlTagNames": ["div", "span", "pop-brand-icon", "input", "button", "svg", "path"],
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
//# sourceMappingURL=capture-bar.js.map