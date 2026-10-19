import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const ValheimShop = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.valheimShopAction = __stencil_createEvent(this, "valheimShopAction", 7);
    }
    /** JSON ValheimShopTier ('' = no tier yet). */
    tier = '';
    /** JSON array of ValheimShopWare. */
    items = '[]';
    /** JSON ValheimShopProposal ('' = no pending proposal). */
    proposal = '';
    /** Admin surfaces get the approve/tweak actions on the proposal. */
    isAdmin = false;
    heading = "Haldor's shop";
    /** Approve/tweak tapped — the HOST performs it. */
    valheimShopAction;
    parse(raw, fallback) {
        if (!raw)
            return fallback;
        try {
            const v = JSON.parse(raw);
            return (v ?? fallback);
        }
        catch {
            return fallback;
        }
    }
    fmt(n) {
        return Number.isFinite(n) ? n.toLocaleString('en-US') : '';
    }
    renderWare(w) {
        return (h("div", { class: { 'vsh-item': true, 'vsh-item--locked': !!w.locked } },
            h("div", { class: "vsh-ic" },
                h("pop-icon", { name: w.locked ? 'lock-closed-outline' : 'pricetag-outline' })),
            h("div", { class: "vsh-name" },
                w.name,
                w.desc && h("span", { class: "vsh-desc" },
                    " \u2014 ",
                    w.desc)),
            w.locked ? (h("span", { class: "vsh-lock" }, w.lockNote || 'Locked')) : (w.price != null && (h("span", { class: "vsh-price" },
                this.fmt(w.price),
                h("span", { class: "vlh-cn" }, "\u2B24"))))));
    }
    renderProposal(p) {
        if (!p || !p.lines?.length)
            return null;
        const iconFor = { add: 'add-circle-outline', raise: 'trending-up-outline', unlock: 'key-outline' };
        return (h("div", { class: "vsh-proposal" },
            h("div", { class: "vsh-pr-h" },
                h("div", { class: "vsh-pr-bot" },
                    h("pop-icon", { name: "sparkles-outline" })),
                h("div", { class: "vsh-pr-t" },
                    p.title || "Bot proposes next week's shop",
                    p.subtitle && h("small", null, p.subtitle))),
            p.lines.map((line) => (h("div", { class: "vsh-pr-line" },
                h("pop-icon", { class: `vsh-pr-ic--${line.kind}`, name: iconFor[line.kind] ?? 'ellipse-outline' }),
                h("span", { class: "vsh-pr-text" }, line.text),
                line.value && h("span", { class: "vsh-pr-val" }, line.value)))),
            this.isAdmin && (h("div", { class: "vsh-pr-actions" },
                h("button", { class: "vlh-btn vlh-btn--primary", onClick: () => this.valheimShopAction.emit({ action: 'approve' }) },
                    h("pop-icon", { name: "checkmark-circle-outline" }),
                    " Approve"),
                h("button", { class: "vlh-btn", onClick: () => this.valheimShopAction.emit({ action: 'tweak' }) },
                    h("pop-icon", { name: "create-outline" }),
                    " Tweak"))),
            h("div", { class: "vsh-pr-note" }, p.note || "Awaiting the Jarl's word · players are notified once approved.")));
    }
    render() {
        const tier = this.parse(this.tier, null);
        const items = this.parse(this.items, []);
        const proposal = this.parse(this.proposal, null);
        const inStock = items.filter((w) => !w.locked);
        return (h("section", { key: '0', class: "vlh-block valheim-shop" },
            h("div", { key: '1', class: "vlh-block-h" },
                h("div", { key: '2', class: "vlh-ic" },
                    h("pop-icon", { key: '3', name: "cash-outline" })),
                h("div", { key: '4', class: "vlh-grow" },
                    h("h3", { key: '5' }, this.heading)),
                inStock.length > 0 && h("span", { key: '6', class: "vlh-count" },
                    inStock.length,
                    " wares")),
            tier && (h("div", { key: '7', class: "vsh-tier" },
                h("pop-icon", { key: '8', class: "vsh-tier-ic", name: "ribbon-outline" }),
                h("div", { key: '9' },
                    h("div", { key: 'a', class: "vsh-tier-name" },
                        "Current tier: ",
                        tier.name),
                    tier.tag && h("div", { key: 'b', class: "vsh-tier-tag" }, tier.tag)))),
            items.length ? ([h("div", { class: "vlh-group-head" }, "In stock"), h("div", null, items.map((w) => this.renderWare(w)))]) : (h("div", { class: "vsh-empty" }, "Haldor's cart is empty \u2014 the merchant awaits the first unlock.")),
            this.renderProposal(proposal)));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "valheim-shop",
        "componentClassName": "ValheimShop",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "tier",
                "type": "string",
                "attribute": "tier",
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
                    "text": "JSON ValheimShopTier ('' = no tier yet)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
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
                    "text": "JSON array of ValheimShopWare."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "proposal",
                "type": "string",
                "attribute": "proposal",
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
                    "text": "JSON ValheimShopProposal ('' = no pending proposal)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "isAdmin",
                "type": "boolean",
                "attribute": "is-admin",
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
                    "text": "Admin surfaces get the approve/tweak actions on the proposal."
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
                "defaultValue": "\"Haldor's shop\"",
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
            }],
        "virtualProperties": [],
        "states": [],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "valheimShopAction",
                "method": "valheimShopAction",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Approve/tweak tapped \u2014 the HOST performs it."
                },
                "complexType": {
                    "original": "{ action: ValheimShopActionKind }",
                    "resolved": "{ action: ValheimShopActionKind; }",
                    "references": {
                        "ValheimShopActionKind": {
                            "location": "local",
                            "path": "ui-kit/organisms/valheim-shop/valheim-shop.tsx",
                            "id": "ui-kit/organisms/valheim-shop/valheim-shop.tsx::ValheimShopActionKind"
                        }
                    }
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "VALHEIM-SHOP",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/valheim-base.css",
                        "relativePath": "../valheim-base.css",
                        "originalComponentPath": "../valheim-base.css"
                    }, {
                        "absolutePath": "./ui-kit/organisms/valheim-shop/valheim-shop.css",
                        "relativePath": "valheim-shop.css",
                        "originalComponentPath": "valheim-shop.css"
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
        "htmlAttrNames": ["class", "name", "onClick", "key"],
        "htmlTagNames": ["div", "pop-icon", "span", "small", "button", "section", "h3"],
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
//# sourceMappingURL=valheim-shop.js.map