import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { Host, h } from "@stencil/core/testing";
export const PopActionsFooter = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popSubmit = __stencil_createEvent(this, "popSubmit", 7);
        this.popCancel = __stencil_createEvent(this, "popCancel", 7);
    }
    submitLabel = 'Send';
    cancelLabel = 'Cancel';
    submitDisabled = false;
    /** Busy: spinner-in-button, both buttons disabled. */
    busy = false;
    /** Presentation tier the footer sits in (spacing/order). */
    tier = 'dialog';
    popSubmit;
    popCancel;
    render() {
        return (h(Host, { key: '0', class: { [`pop-actions-footer--${this.tier}`]: true } },
            h("div", { key: '1', class: { af: true, [`af--${this.tier}`]: true } },
                h("button", { key: '2', type: "button", class: "af__cancel", disabled: this.busy, onClick: () => this.popCancel.emit() }, this.cancelLabel),
                h("button", { key: '3', type: "button", class: "af__submit", disabled: this.submitDisabled || this.busy, "aria-busy": this.busy ? 'true' : null, onClick: () => this.popSubmit.emit() },
                    this.busy && h("span", { key: '4', class: "af__spin", "aria-hidden": "true" }),
                    this.submitLabel))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-actions-footer",
        "componentClassName": "PopActionsFooter",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "submitLabel",
                "type": "string",
                "attribute": "submit-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Send'",
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
                "name": "submitDisabled",
                "type": "boolean",
                "attribute": "submit-disabled",
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
            }, {
                "name": "busy",
                "type": "boolean",
                "attribute": "busy",
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
                    "text": "Busy: spinner-in-button, both buttons disabled."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "tier",
                "type": "string",
                "attribute": "tier",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'dialog'",
                "complexType": {
                    "original": "'sheet' | 'dialog' | 'dock'",
                    "resolved": "\"dialog\" | \"dock\" | \"sheet\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Presentation tier the footer sits in (spacing/order)."
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
                "name": "popCancel",
                "method": "popCancel",
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
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-ACTIONS-FOOTER",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/actions-footer/actions-footer.css",
                        "relativePath": "actions-footer.css",
                        "originalComponentPath": "actions-footer.css"
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
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
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
        "htmlAttrNames": ["key", "class", "type", "disabled", "onClick", "aria-busy", "aria-hidden"],
        "htmlTagNames": ["div", "button", "span"],
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
//# sourceMappingURL=actions-footer.js.map