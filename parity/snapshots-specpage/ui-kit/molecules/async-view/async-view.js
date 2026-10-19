import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { Host, h } from "@stencil/core/testing";
export const PopAsyncView = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popRetry = __stencil_createEvent(this, "popRetry", 7);
    }
    /** Which region shows. */
    state = 'loading';
    /** Default empty-state message (default empty slot). */
    emptyLabel = 'Nothing here yet';
    /** Default error-state message (default error slot). */
    errorLabel = 'Something went wrong';
    /** Default retry button label (default error slot). */
    retryLabel = 'Retry';
    /** The default error state's retry button was tapped. */
    popRetry;
    /** Re-emit the inner pop-error-state's popRetry as our own (single source). */
    onInnerRetry = (e) => {
        e.stopPropagation();
        this.popRetry.emit();
    };
    render() {
        const s = this.state;
        const region = (name) => ({
            av__region: true,
            [`av__region--${name}`]: true,
            'av__region--active': s === name,
        });
        return (h(Host, { key: '0', class: { [`pop-async-view--${s}`]: true } },
            h("div", { key: '1', class: region('loading'), role: "status", "aria-hidden": s !== 'loading' ? 'true' : 'false' },
                h("slot", { key: '2', name: "loading" },
                    h("pop-loading-state", { key: '3', variant: "spinner", label: "Loading\u2026" }))),
            h("div", { key: '4', class: region('empty'), "aria-hidden": s !== 'empty' ? 'true' : 'false' },
                h("slot", { key: '5', name: "empty" },
                    h("pop-empty-state", { key: '6', message: this.emptyLabel, size: "inline" }))),
            h("div", { key: '7', class: region('error'), "aria-hidden": s !== 'error' ? 'true' : 'false' },
                h("slot", { key: '8', name: "error" },
                    h("pop-error-state", { key: '9', heading: this.errorLabel, retryable: true, retryLabel: this.retryLabel, size: "inline", onPopRetry: this.onInnerRetry }))),
            h("div", { key: 'a', class: region('content'), "aria-hidden": s !== 'content' ? 'true' : 'false' },
                h("slot", { key: 'b' }))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-async-view",
        "componentClassName": "PopAsyncView",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "state",
                "type": "string",
                "attribute": "state",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'loading'",
                "complexType": {
                    "original": "'loading' | 'empty' | 'error' | 'content'",
                    "resolved": "\"content\" | \"empty\" | \"error\" | \"loading\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Which region shows."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "emptyLabel",
                "type": "string",
                "attribute": "empty-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Nothing here yet'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Default empty-state message (default empty slot)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "errorLabel",
                "type": "string",
                "attribute": "error-label",
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
                    "text": "Default error-state message (default error slot)."
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
                "defaultValue": "'Retry'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Default retry button label (default error slot)."
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
                    "text": "The default error state's retry button was tapped."
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
                "styleId": "POP-ASYNC-VIEW",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/async-view/async-view.css",
                        "relativePath": "async-view.css",
                        "originalComponentPath": "async-view.css"
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
        "hasPropBoolean": false,
        "hasPropString": true,
        "hasPropMutable": false,
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
        "hasVdomText": false,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "role", "aria-hidden", "name", "variant", "label", "message", "size", "heading", "retryable", "retryLabel", "onPopRetry"],
        "htmlTagNames": ["div", "slot", "pop-loading-state", "pop-empty-state", "pop-error-state"],
        "htmlParts": [],
        "htmlSlots": ["loading", "empty", "error", ""],
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
//# sourceMappingURL=async-view.js.map