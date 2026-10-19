import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
import { PRESENTER_BREAKPOINTS, resolvePresenterTier } from './presenter-logic';
export const PopPresenter = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.tierChange = __stencil_createEvent(this, "tierChange", 7);
        this.popClose = __stencil_createEvent(this, "popClose", 7);
        this.popRedock = __stencil_createEvent(this, "popRedock", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Visibility — when false the presenter renders nothing (parent owns state). */
    open = false;
    /** Chrome heading (sheet title / dialog title / dock header). Omit when the
     *  slotted surface renders its own header. */
    heading;
    /** Breakpoint overrides. Defaults restore the quick-controls spec values. */
    sheetMax = PRESENTER_BREAKPOINTS.sheetMax;
    dockMin = PRESENTER_BREAKPOINTS.dockMin;
    /** Force a tier regardless of viewport (host-controlled mode — e.g. the host
     *  keeps a collapsed-dock preference by forcing 'dialog'). */
    tier;
    /** The resolved tier, emitted on open and whenever it changes while open. */
    tierChange;
    /** × / backdrop / Esc / dock close. */
    popClose;
    /** The dialog tier's "Dock to side" affordance was tapped (host flips its
     *  dock preference and re-presents). */
    popRedock;
    /** Re-render trigger for viewport-driven tier changes. */
    viewportWidth = typeof window !== 'undefined' ? window.innerWidth : PRESENTER_BREAKPOINTS.dockMin - 1;
    lastEmittedTier = null;
    get resolvedTier() {
        return resolvePresenterTier(this.viewportWidth, {
            sheetMax: this.sheetMax,
            dockMin: this.dockMin,
            tier: this.tier,
        });
    }
    onResize = () => {
        this.viewportWidth = typeof window !== 'undefined' ? window.innerWidth : this.viewportWidth;
        this.maybeEmitTier();
    };
    maybeEmitTier() {
        if (!this.open)
            return;
        const tier = this.resolvedTier;
        if (tier !== this.lastEmittedTier) {
            this.lastEmittedTier = tier;
            this.tierChange.emit(tier);
        }
    }
    connectedCallback() {
        if (typeof window !== 'undefined')
            window.addEventListener('resize', this.onResize, { passive: true });
        this.maybeEmitTier();
    }
    disconnectedCallback() {
        if (typeof window !== 'undefined')
            window.removeEventListener('resize', this.onResize);
    }
    onOpenChange(open) {
        if (open) {
            this.viewportWidth = typeof window !== 'undefined' ? window.innerWidth : this.viewportWidth;
            this.maybeEmitTier();
        }
        else {
            this.lastEmittedTier = null;
        }
    }
    onTierPropChange() {
        this.maybeEmitTier();
    }
    close = () => this.popClose.emit();
    /** Handler for the inner overlay's own popClose (sheet / dialog). Those events
     *  bubble (Stencil default), so without stopPropagation a listener on the
     *  presenter would receive both the bubbled inner event AND the presenter's
     *  re-emit — two popCloses per dismissal. Stop the inner one, then emit ours so
     *  exactly one popClose reaches the consumer. */
    onInnerClose = (ev) => {
        ev.stopPropagation();
        this.popClose.emit();
    };
    /** Whether the consumer slotted footer actions (light DOM query — scoped). */
    hasActions() {
        return !!this.el.querySelector('[slot="actions"]');
    }
    /** Whether the consumer slotted rich header content. */
    hasHeader() {
        return !!this.el.querySelector('[slot="header"]');
    }
    /** "Dock to side" is due when the tier resolved to dialog but the viewport
     *  qualifies for the dock — which only happens when the HOST forced 'dialog'
     *  (a collapsed dock). Tapping it emits popRedock. */
    showRedock() {
        return this.resolvedTier === 'dialog' && this.viewportWidth >= this.dockMin;
    }
    render() {
        if (!this.open)
            return null;
        const tier = this.resolvedTier;
        const hasActions = this.hasActions();
        const hasHeader = this.hasHeader();
        if (tier === 'sheet') {
            return (h("pop-bottom-sheet", { open: true, sheetTitle: this.heading, onPopClose: this.onInnerClose },
                hasHeader && (h("div", { class: "presenter__sheet-header" },
                    h("slot", { name: "header" }))),
                h("slot", null),
                hasActions && (h("div", { slot: "actions", class: "presenter__actions presenter__actions--sheet" },
                    h("slot", { name: "actions" })))));
        }
        if (tier === 'dock') {
            // PLAIN panel container — the host places this element in its layout.
            return (h("section", { class: "presenter-dock", "aria-label": this.heading },
                h("header", { class: "presenter-dock__header" },
                    h("div", { class: "presenter-dock__header-main" }, hasHeader ? (h("slot", { name: "header" })) : this.heading ? (h("span", { class: "presenter-dock__title" }, this.heading)) : null),
                    h("button", { type: "button", class: "presenter-dock__close", "aria-label": "Close", onClick: this.close },
                        h("pop-icon", { name: "close" }))),
                h("div", { class: "presenter-dock__body" },
                    h("slot", null)),
                hasActions && (h("footer", { class: "presenter__actions presenter__actions--dock" },
                    h("slot", { name: "actions" })))));
        }
        // dialog — footer-less pop-form-dialog; the actions slot renders below the
        // body so submission only ever flows through the slotted footer's events.
        const redock = this.showRedock();
        const useHeaderBar = hasHeader || redock;
        return (h("pop-form-dialog", { open: true, hideFooter: true, ...(useHeaderBar ? { headerBar: true } : this.heading ? { dialogTitle: this.heading } : {}), onPopClose: this.onInnerClose },
            useHeaderBar && (h("div", { slot: "header" }, hasHeader ? (h("slot", { name: "header" })) : this.heading ? (h("span", { class: "presenter__dialog-title" }, this.heading)) : null)),
            redock && (h("div", { slot: "header-actions" },
                h("button", { type: "button", class: "presenter__redock", title: "Dock to side", "aria-label": "Dock to side", onClick: () => this.popRedock.emit() },
                    h("pop-icon", { name: "enter-outline" })))),
            h("slot", null),
            hasActions && (h("div", { class: "presenter__actions presenter__actions--dialog" },
                h("slot", { name: "actions" })))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-presenter",
        "componentClassName": "PopPresenter",
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
                    "text": "Visibility \u2014 when false the presenter renders nothing (parent owns state)."
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
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Chrome heading (sheet title / dialog title / dock header). Omit when the\nslotted surface renders its own header."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "sheetMax",
                "type": "any",
                "attribute": "sheet-max",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "PRESENTER_BREAKPOINTS.sheetMax",
                "complexType": {
                    "original": "any",
                    "resolved": "any",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Breakpoint overrides. Defaults restore the quick-controls spec values."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "dockMin",
                "type": "any",
                "attribute": "dock-min",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "PRESENTER_BREAKPOINTS.dockMin",
                "complexType": {
                    "original": "any",
                    "resolved": "any",
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
                "name": "tier",
                "type": "any",
                "attribute": "tier",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "PresenterTier",
                    "resolved": "any",
                    "references": {
                        "PresenterTier": {
                            "location": "global",
                            "id": "global::PresenterTier"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Force a tier regardless of viewport (host-controlled mode \u2014 e.g. the host\nkeeps a collapsed-dock preference by forcing 'dialog')."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "viewportWidth"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "tierChange",
                "method": "tierChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "The resolved tier, emitted on open and whenever it changes while open."
                },
                "complexType": {
                    "original": "PresenterTier",
                    "resolved": "PresenterTier",
                    "references": {
                        "PresenterTier": {
                            "location": "global",
                            "id": "global::PresenterTier"
                        }
                    }
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
                    "text": "\u00D7 / backdrop / Esc / dock close."
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popRedock",
                "method": "popRedock",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "The dialog tier's \"Dock to side\" affordance was tapped (host flips its\ndock preference and re-presents)."
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
                "methodName": "onOpenChange",
                "handlerOptions": undefined
            }, {
                "propName": "tier",
                "methodName": "onTierPropChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-PRESENTER",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/presenter/presenter.css",
                        "relativePath": "presenter.css",
                        "originalComponentPath": "presenter.css"
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
        "hasConnectedCallbackFn": true,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": true,
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
        "hasSlot": true,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": true,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": true,
        "hasVdomRef": true,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["open", "sheetTitle", "onPopClose", "class", "name", "slot", "aria-label", "type", "onClick", "hideFooter", "title"],
        "htmlTagNames": ["pop-bottom-sheet", "div", "slot", "section", "header", "span", "button", "pop-icon", "footer", "pop-form-dialog"],
        "htmlParts": [],
        "htmlSlots": ["header", "", "actions"],
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
                "onOpenChange": 0
            }],
        "tier": [{
                "onTierPropChange": 0
            }]
    }; }
};
//# sourceMappingURL=presenter.js.map