import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const ErrorState = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popRetry = __stencil_createEvent(this, "popRetry", 7);
    }
    /** `pop-brand-icon` name for the illustration. */
    iconName = 'warning';
    heading = 'Something went wrong';
    message = '';
    /** `inline` (compact) or `full` (centered, min-height). */
    size = 'inline';
    /** Show a Retry button (emits `popRetry`). */
    retryable = false;
    /** Retry button label. */
    retryLabel = 'Try again';
    popRetry;
    render() {
        return (h("div", { key: '0', class: { 'err': true, [`err--${this.size}`]: true }, role: "alert" },
            h("div", { key: '1', class: "err-icon", "aria-hidden": "true" },
                h("pop-brand-icon", { key: '2', name: this.iconName })),
            this.heading && h("h3", { key: '3', class: "err-heading" }, this.heading),
            this.message && h("p", { key: '4', class: "err-message" }, this.message),
            this.retryable && (h("button", { key: '5', type: "button", class: "err-retry", onClick: () => this.popRetry.emit() }, this.retryLabel))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-error-state",
        "componentClassName": "ErrorState",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "iconName",
                "type": "string",
                "attribute": "icon-name",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'warning'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "`pop-brand-icon` name for the illustration."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "heading",
                "type": "string",
                "attribute": "heading",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Something went wrong'",
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
                "name": "message",
                "type": "string",
                "attribute": "message",
                "reflect": false,
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
                "getter": false,
                "setter": false
            }, {
                "name": "size",
                "type": "string",
                "attribute": "size",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'inline'",
                "complexType": {
                    "original": "'inline' | 'full'",
                    "resolved": "\"full\" | \"inline\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "`inline` (compact) or `full` (centered, min-height)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "retryable",
                "type": "boolean",
                "attribute": "retryable",
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
                    "text": "Show a Retry button (emits `popRetry`)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "retryLabel",
                "type": "string",
                "attribute": "retry-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Try again'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Retry button label."
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
                "name": "popRetry",
                "method": "popRetry",
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
                "styleId": "POP-ERROR-STATE",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/error-state/error-state.css",
                        "relativePath": "error-state.css",
                        "originalComponentPath": "error-state.css"
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
        "htmlAttrNames": ["key", "class", "role", "aria-hidden", "name", "type", "onClick"],
        "htmlTagNames": ["div", "pop-brand-icon", "h3", "p", "button"],
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
//# sourceMappingURL=error-state.js.map