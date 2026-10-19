import { registerInstance as __stencil_registerInstance, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const Toast = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    get el() { return __stencil_getElement(this); }
    position = 'bottom-center';
    duration = 5000;
    toasts = [];
    nextId = 0;
    /** Pending auto-dismiss timers, keyed by toast id, so a replacing `show` or an
     *  explicit `hide()` can cancel them (a sticky toast has no entry here). */
    timers = new Map();
    async show(message, type = 'default', action, options) {
        const id = this.nextId++;
        this.toasts = [...this.toasts, { id, message, type, action }];
        // A `duration <= 0` or `persistent: true` toast is sticky — it never
        // auto-dismisses and must be cleared via hide() (or a caller re-showing).
        // Otherwise arm a per-toast timer (tracked so hide() can cancel it).
        const ms = options?.duration ?? this.duration;
        const persistent = options?.persistent === true || ms <= 0;
        if (!persistent) {
            this.timers.set(id, setTimeout(() => {
                this.timers.delete(id);
                this.dismiss(id);
            }, ms));
        }
    }
    /**
     * Dismiss all currently-shown toasts, cancelling any pending auto-dismiss
     * timers. The single programmatic way to clear a sticky (persistent) toast.
     */
    async hide() {
        for (const t of [...this.toasts])
            this.dismiss(t.id);
    }
    dismiss(id) {
        const timer = this.timers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(id);
        }
        const toastEl = this.el.querySelector(`[data-toast-id="${id}"]`);
        if (toastEl) {
            toastEl.style.animation = 'toast-out 200ms ease forwards';
            toastEl.addEventListener('animationend', () => {
                this.toasts = this.toasts.filter(t => t.id !== id);
            }, { once: true });
        }
        else {
            this.toasts = this.toasts.filter(t => t.id !== id);
        }
    }
    handleAction = (toast) => {
        // Fire the in-page callback (e.g. Undo) then dismiss the toast at once so it
        // doesn't linger after the action completes.
        toast.action?.onAction?.();
        this.dismiss(toast.id);
    };
    render() {
        return (h("div", { key: '0', class: { 'toast-container': true, 'toast-container--bottom-right': this.position === 'bottom-right' }, "aria-live": "assertive", "aria-atomic": "true" }, this.toasts.map(toast => (h("div", { class: `toast toast--${toast.type}`, "data-toast-id": toast.id, key: toast.id },
            toast.message,
            toast.action &&
                (toast.action.onAction ? (h("button", { type: "button", class: "toast__action", onClick: () => this.handleAction(toast) }, toast.action.label)) : (h("a", { href: toast.action.href, class: "toast__action" }, toast.action.label))))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-toast",
        "componentClassName": "Toast",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "position",
                "type": "string",
                "attribute": "position",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'bottom-center'",
                "complexType": {
                    "original": "'bottom-center' | 'bottom-right'",
                    "resolved": "\"bottom-center\" | \"bottom-right\"",
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
                "name": "duration",
                "type": "number",
                "attribute": "duration",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "5000",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
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
        "states": [{
                "name": "toasts"
            }],
        "methods": [{
                "name": "show",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "(message: string, type?: \"default\" | \"error\" | \"success\", action?: ToastAction, options?: ToastOptions) => Promise<any>",
                    "parameters": [{
                            "name": "message",
                            "type": "string",
                            "docs": ""
                        }, {
                            "name": "type",
                            "type": "\"default\" | \"error\" | \"success\"",
                            "docs": ""
                        }, {
                            "name": "action",
                            "type": "ToastAction | undefined",
                            "docs": ""
                        }, {
                            "name": "options",
                            "type": "ToastOptions | undefined",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        },
                        "ToastAction": {
                            "location": "local",
                            "path": "ui-kit/atoms/toast/toast.tsx",
                            "id": "ui-kit/atoms/toast/toast.tsx::ToastAction"
                        },
                        "ToastOptions": {
                            "location": "local",
                            "path": "ui-kit/atoms/toast/toast.tsx",
                            "id": "ui-kit/atoms/toast/toast.tsx::ToastOptions"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }, {
                "name": "hide",
                "docs": {
                    "text": "Dismiss all currently-shown toasts, cancelling any pending auto-dismiss\ntimers. The single programmatic way to clear a sticky (persistent) toast.",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<any>",
                    "parameters": [],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }],
        "listeners": [],
        "events": [],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-TOAST",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/atoms/toast/toast.css",
                        "relativePath": "toast.css",
                        "originalComponentPath": "toast.css"
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
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": true,
        "hasPropBoolean": false,
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
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "aria-live", "aria-atomic", "data-toast-id", "type", "onClick", "href"],
        "htmlTagNames": ["div", "button", "a"],
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
//# sourceMappingURL=toast.js.map