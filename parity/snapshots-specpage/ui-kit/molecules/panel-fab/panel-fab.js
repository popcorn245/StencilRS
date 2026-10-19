import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopPanelFab = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popAction = __stencil_createEvent(this, "popAction", 7);
    }
    /** Primary action label. Empty → the FAB is a controls-tray toggle only. */
    action = '';
    /** Ionicon name for the primary action. */
    icon = 'add';
    /** Hide the label and render the primary action as an icon-only circle. */
    compact = false;
    /** Set when the panel has no list controls — suppresses the tray + chevron. */
    noControls = false;
    /** Disable the primary action (a busy panel, an incomplete precondition). */
    disabled = false;
    /** Accessible name for the tray toggle. */
    controlsLabel = 'List controls';
    /** The primary action was tapped. */
    popAction;
    get el() { return __stencil_getElement(this); }
    open = false;
    connectedCallback() {
        document.addEventListener('click', this.onDocClick);
        document.addEventListener('keydown', this.onKeyDown);
    }
    disconnectedCallback() {
        document.removeEventListener('click', this.onDocClick);
        document.removeEventListener('keydown', this.onKeyDown);
    }
    onDocClick = (e) => {
        if (this.open && !this.el.contains(e.target))
            this.open = false;
    };
    onKeyDown = (e) => {
        if (e.key === 'Escape' && this.open)
            this.open = false;
    };
    render() {
        const hasAction = !!this.action;
        const hasControls = !this.noControls;
        // The chevron only earns its place when there is BOTH an action and a tray;
        // otherwise the single thing present becomes the button itself.
        const showChevron = hasAction && hasControls;
        const trayIsPrimary = !hasAction && hasControls;
        return (h("div", { key: '0', class: { pfab: true, 'pfab--open': this.open } },
            hasControls && (h("div", { key: '1', class: "pfab__tray", role: "group", "aria-label": this.controlsLabel, ...(this.open ? {} : { inert: true }) },
                h("slot", { key: '2', name: "controls" }))),
            h("div", { key: '3', class: "pfab__row" },
                hasAction && (h("button", { key: '4', type: "button", class: { pfab__btn: true, 'pfab__btn--compact': this.compact }, disabled: this.disabled, "aria-label": this.action, title: this.action, onClick: () => this.popAction.emit() },
                    h("ion-icon", { key: '5', class: "pfab__icon", name: this.icon, "aria-hidden": "true" }),
                    !this.compact && h("span", { key: '6', class: "pfab__label" }, this.action))),
                (showChevron || trayIsPrimary) && (h("button", { key: '7', type: "button", class: {
                        pfab__toggle: true,
                        'pfab__toggle--solo': trayIsPrimary,
                    }, "aria-label": this.controlsLabel, title: this.controlsLabel, "aria-expanded": this.open ? 'true' : 'false', onClick: () => (this.open = !this.open) },
                    h("ion-icon", { key: '8', class: "pfab__icon", name: trayIsPrimary ? 'options-outline' : 'chevron-up', "aria-hidden": "true" }))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-panel-fab",
        "componentClassName": "PopPanelFab",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "action",
                "type": "string",
                "attribute": "action",
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
                    "text": "Primary action label. Empty \u2192 the FAB is a controls-tray toggle only."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "icon",
                "type": "string",
                "attribute": "icon",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'add'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Ionicon name for the primary action."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "compact",
                "type": "boolean",
                "attribute": "compact",
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
                    "text": "Hide the label and render the primary action as an icon-only circle."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "noControls",
                "type": "boolean",
                "attribute": "no-controls",
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
                    "text": "Set when the panel has no list controls \u2014 suppresses the tray + chevron."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "disabled",
                "type": "boolean",
                "attribute": "disabled",
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
                    "text": "Disable the primary action (a busy panel, an incomplete precondition)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "controlsLabel",
                "type": "string",
                "attribute": "controls-label",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'List controls'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Accessible name for the tray toggle."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "open"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popAction",
                "method": "popAction",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "The primary action was tapped."
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
                "styleId": "POP-PANEL-FAB",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/panel-fab/panel-fab.css",
                        "relativePath": "panel-fab.css",
                        "originalComponentPath": "panel-fab.css"
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
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "role", "aria-label", "name", "type", "disabled", "title", "onClick", "aria-hidden", "aria-expanded"],
        "htmlTagNames": ["div", "slot", "button", "ion-icon", "span"],
        "htmlParts": [],
        "htmlSlots": ["controls"],
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
//# sourceMappingURL=panel-fab.js.map