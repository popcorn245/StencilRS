import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const BottomNav = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.centerpress = __stencil_createEvent(this, "centerpress", 7);
        this.tabselect = __stencil_createEvent(this, "tabselect", 7);
    }
    /** JSON array of the tab destinations ({id,label,icon,href?,badge?}).
     *  The first half renders left of the center button, the rest right (2+2
     *  with four tabs). */
    items = '[]';
    /** Which tab is current (drives the active style). */
    activeId;
    /** What the center button does — the PARENT decides ('scan' or 'add'). */
    centerAction = 'scan';
    /** Ionicon for the center button; defaults per `centerAction`
     *  (scan → camera, add → add). */
    centerIcon;
    /** Tiny label under the center button; defaults per `centerAction`.
     *  Pass '' to hide. */
    centerLabel;
    /** Disable the whole bar (e.g. offline). */
    disabled = false;
    /** Collapse tab labels when the BAR (container, not viewport) is under
     *  400px — the pop-tab-bar compact pattern. */
    compact = false;
    /** Detached-fixed (default) floats above the viewport bottom + safe area;
     *  `static` renders in place (Storybook frames / in-page use). */
    position = 'fixed';
    /** Center button pressed — parent opens the scanner / add sheet. */
    centerpress;
    /** Tab pressed — parent routes. */
    tabselect;
    get parsedItems() {
        try {
            const raw = JSON.parse(this.items);
            return Array.isArray(raw) ? raw.filter((i) => i && i.id) : [];
        }
        catch {
            return [];
        }
    }
    handleTab(id) {
        if (this.disabled)
            return;
        this.tabselect.emit({ id });
    }
    handleCenter = () => {
        if (this.disabled)
            return;
        this.centerpress.emit({ action: this.centerAction });
    };
    renderTab(item) {
        const active = item.id === this.activeId;
        return (h("button", { type: "button", class: { 'bn-tab': true, 'bn-tab--active': active }, disabled: this.disabled, "aria-label": item.label, "aria-current": active ? 'page' : undefined, onClick: () => this.handleTab(item.id) },
            h("span", { class: "bn-tab-ic" },
                h("pop-icon", { name: item.icon }),
                typeof item.badge === 'number' && item.badge > 0 && (h("span", { class: "bn-tab-badge" }, item.badge > 99 ? '99+' : item.badge))),
            h("span", { class: "bn-tab-label" }, item.label)));
    }
    render() {
        const items = this.parsedItems;
        const half = Math.ceil(items.length / 2);
        const left = items.slice(0, half);
        const right = items.slice(half);
        const centerIcon = this.centerIcon || (this.centerAction === 'add' ? 'add' : 'camera');
        const centerLabel = this.centerLabel ?? (this.centerAction === 'add' ? 'Add' : 'Scan');
        return (h("div", { key: '0', class: {
                'bn-wrap': true,
                'bn-wrap--fixed': this.position === 'fixed',
                'bn-wrap--compact': this.compact,
                'bn-wrap--disabled': this.disabled,
            } },
            h("nav", { key: '1', class: "bn-bar", "aria-label": "Primary" },
                h("div", { key: '2', class: "bn-side bn-side--left" }, left.map((i) => this.renderTab(i))),
                h("div", { key: '3', class: "bn-notch", "aria-hidden": "true" }),
                h("div", { key: '4', class: "bn-side bn-side--right" }, right.map((i) => this.renderTab(i))),
                h("div", { key: '5', class: "bn-centerwrap" },
                    h("button", { key: '6', type: "button", class: "bn-center", disabled: this.disabled, "aria-label": centerLabel || this.centerAction, onClick: this.handleCenter },
                        h("slot", { key: '7', name: "center" },
                            h("pop-icon", { key: '8', class: "bn-center-ic", name: centerIcon }))),
                    centerLabel && h("span", { key: '9', class: "bn-center-label" }, centerLabel)))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-bottom-nav",
        "componentClassName": "BottomNav",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "items",
                "type": "string",
                "attribute": "items",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON array of the tab destinations ({id,label,icon,href?,badge?}).\nThe first half renders left of the center button, the rest right (2+2\nwith four tabs)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "activeId",
                "type": "string",
                "attribute": "active-id",
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
                    "text": "Which tab is current (drives the active style)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "centerAction",
                "type": "string",
                "attribute": "center-action",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'scan'",
                "complexType": {
                    "original": "'scan' | 'add'",
                    "resolved": "\"add\" | \"scan\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "What the center button does \u2014 the PARENT decides ('scan' or 'add')."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "centerIcon",
                "type": "string",
                "attribute": "center-icon",
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
                    "text": "Ionicon for the center button; defaults per `centerAction`\n(scan \u2192 camera, add \u2192 add)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "centerLabel",
                "type": "string",
                "attribute": "center-label",
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
                    "text": "Tiny label under the center button; defaults per `centerAction`.\nPass '' to hide."
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
                    "text": "Disable the whole bar (e.g. offline)."
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
                    "text": "Collapse tab labels when the BAR (container, not viewport) is under\n400px \u2014 the pop-tab-bar compact pattern."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "position",
                "type": "string",
                "attribute": "position",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'fixed'",
                "complexType": {
                    "original": "'fixed' | 'static'",
                    "resolved": "\"fixed\" | \"static\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Detached-fixed (default) floats above the viewport bottom + safe area;\n`static` renders in place (Storybook frames / in-page use)."
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
                "name": "centerpress",
                "method": "centerpress",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Center button pressed \u2014 parent opens the scanner / add sheet."
                },
                "complexType": {
                    "original": "{ action: 'scan' | 'add' }",
                    "resolved": "{ action: \"scan\" | \"add\"; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "tabselect",
                "method": "tabselect",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Tab pressed \u2014 parent routes."
                },
                "complexType": {
                    "original": "{ id: string }",
                    "resolved": "{ id: string; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-BOTTOM-NAV",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/bottom-nav/bottom-nav.css",
                        "relativePath": "bottom-nav.css",
                        "originalComponentPath": "bottom-nav.css"
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
        "htmlAttrNames": ["type", "class", "disabled", "aria-label", "aria-current", "onClick", "name", "key", "aria-hidden"],
        "htmlTagNames": ["button", "span", "pop-icon", "div", "nav", "slot"],
        "htmlParts": [],
        "htmlSlots": ["center"],
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
//# sourceMappingURL=bottom-nav.js.map