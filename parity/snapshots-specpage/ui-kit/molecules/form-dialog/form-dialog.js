import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { Host, h } from "@stencil/core/testing";
export const FormDialog = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popSubmit = __stencil_createEvent(this, "popSubmit", 7);
        this.popClose = __stencil_createEvent(this, "popClose", 7);
    }
    get el() { return __stencil_getElement(this); }
    open = false;
    dialogTitle;
    description;
    submitLabel = 'Save';
    cancelLabel = 'Cancel';
    /**
     * Hide the footer (Cancel/Submit) entirely — for dialogs that are dismissed by
     * the × / backdrop and have no explicit confirm action (e.g. the Weather panel).
     */
    hideFooter = false;
    /**
     * Opt into a slotted HEADER BAR: a single flex row laid out as
     *   `[ slot="header" …flex-grows… ] [ slot="header-actions" ] [ × close ]`
     * so the consumer supplies its OWN title + right-side control (a list-select, a
     * room switcher, …) INLINE with the close/action buttons — nothing overlaps the
     * ×, and the consumer's control can't be clipped in the top-right corner.
     *
     * When false (the default) the dialog keeps its legacy chrome: the absolutely
     * positioned round × plus an optional `dialogTitle` heading. Existing consumers
     * that pass `dialogTitle` are unaffected — this is purely additive.
     */
    headerBar = false;
    popSubmit;
    popClose;
    handleKeydown(ev) {
        if (ev.key === 'Escape' && this.open) {
            this.handleClose();
        }
    }
    handleOpenChange() {
        if (this.open) {
            requestAnimationFrame(() => {
                const firstInput = this.el.querySelector('input, textarea, select, button:not(.fd-close)');
                if (firstInput)
                    firstInput.focus();
            });
        }
    }
    handleClose() {
        this.open = false;
        this.popClose.emit();
    }
    /**
     * The content lives in a <form> so consumers WITH a footer keep Enter-to-submit
     * (e.g. type a thread name → Enter creates it). But ANY slotted <button> without
     * type="button" defaults to type=submit and would otherwise submit the form.
     * To prevent unintended close/submit:
     *   - We ALWAYS preventDefault (the form never navigates).
     *   - We only emit popSubmit when a footer is shown (an explicit submit action
     *     exists). With hideFooter there is NO submit semantics, so a stray slotted
     *     button can never trigger popSubmit — only ×/backdrop/Esc close the dialog.
     * The explicit footer submit button is type="submit" so Enter + click both
     * route through here; the close stays on × / backdrop / Esc, never on submit.
     */
    handleSubmit(e) {
        e.preventDefault();
        if (!this.hideFooter)
            this.popSubmit.emit();
    }
    render() {
        return (h(Host, { key: '0' },
            h("div", { key: '1', class: { 'fd-backdrop': true, 'fd-backdrop--open': this.open }, onClick: () => this.handleClose() }),
            h("div", { key: '2', class: { 'fd-card': true }, style: { display: this.open ? 'flex' : 'none' } },
                h("div", { key: '3', class: { 'fd-panel': true, 'fd-panel--open': this.open, 'fd-panel--headerbar': this.headerBar } },
                    this.headerBar ? (h("div", { class: "fd-header" },
                        h("div", { class: "fd-header-main" },
                            h("slot", { name: "header" })),
                        h("div", { class: "fd-header-actions" },
                            h("slot", { name: "header-actions" }),
                            h("button", { type: "button", class: "fd-close fd-close--inline", "aria-label": "Close", onClick: () => this.handleClose() }, "\u00D7")))) : (h("button", { type: "button", class: "fd-close", "aria-label": "Close", onClick: () => this.handleClose() }, "\u00D7")),
                    this.dialogTitle && h("h2", { key: '4', class: "fd-title" }, this.dialogTitle),
                    this.description && h("p", { key: '5', class: "fd-description" }, this.description),
                    h("form", { key: '6', onSubmit: (e) => this.handleSubmit(e) },
                        h("div", { key: '7', class: "fd-body" },
                            h("slot", { key: '8' })),
                        !this.hideFooter && (h("div", { key: '9', class: "fd-footer" },
                            h("slot", { key: 'a', name: "footer" },
                                h("button", { key: 'b', type: "button", class: "outline", onClick: () => this.handleClose() }, this.cancelLabel),
                                h("button", { key: 'c', type: "submit" }, this.submitLabel)))))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-form-dialog",
        "componentClassName": "FormDialog",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "open",
                "type": "boolean",
                "attribute": "open",
                "reflect": true,
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "dialogTitle",
                "type": "string",
                "attribute": "dialog-title",
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
                "name": "description",
                "type": "string",
                "attribute": "description",
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
                "name": "submitLabel",
                "type": "string",
                "attribute": "submit-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Save'",
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
                "name": "cancelLabel",
                "type": "string",
                "attribute": "cancel-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Cancel'",
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
                "name": "hideFooter",
                "type": "boolean",
                "attribute": "hide-footer",
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
                    "text": "Hide the footer (Cancel/Submit) entirely \u2014 for dialogs that are dismissed by\nthe \u00D7 / backdrop and have no explicit confirm action (e.g. the Weather panel)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "headerBar",
                "type": "boolean",
                "attribute": "header-bar",
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
                    "text": "Opt into a slotted HEADER BAR: a single flex row laid out as\n  `[ slot=\"header\" \u2026flex-grows\u2026 ] [ slot=\"header-actions\" ] [ \u00D7 close ]`\nso the consumer supplies its OWN title + right-side control (a list-select, a\nroom switcher, \u2026) INLINE with the close/action buttons \u2014 nothing overlaps the\n\u00D7, and the consumer's control can't be clipped in the top-right corner.\n\nWhen false (the default) the dialog keeps its legacy chrome: the absolutely\npositioned round \u00D7 plus an optional `dialogTitle` heading. Existing consumers\nthat pass `dialogTitle` are unaffected \u2014 this is purely additive."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [],
        "methods": [],
        "listeners": [{
                "name": "keydown",
                "method": "handleKeydown",
                "capture": false,
                "passive": false,
                "target": "window"
            }],
        "events": [{
                "name": "popSubmit",
                "method": "popSubmit",
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
                "name": "popClose",
                "method": "popClose",
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
            }],
        "watchers": [{
                "propName": "open",
                "methodName": "handleOpenChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-FORM-DIALOG",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/form-dialog/form-dialog.css",
                        "relativePath": "form-dialog.css",
                        "originalComponentPath": "form-dialog.css"
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
        "hasListener": true,
        "hasListenerTarget": true,
        "hasListenerTargetWindow": true,
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
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "onClick", "style", "name", "type", "aria-label", "onSubmit"],
        "htmlTagNames": ["div", "slot", "button", "h2", "p", "form"],
        "htmlParts": [],
        "htmlSlots": ["header", "header-actions", "", "footer"],
        "isUpdateable": true,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
    static get watchers() { return {
        "open": [{
                "handleOpenChange": 0
            }]
    }; }
};
//# sourceMappingURL=form-dialog.js.map