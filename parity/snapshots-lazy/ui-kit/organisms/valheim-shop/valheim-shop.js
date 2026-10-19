import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import ValheimShopStyle0 from "./ui-kit/organisms/valheim-base.css?tag=valheim-shop&encapsulation=scoped";
import ValheimShopStyle1 from "./ui-kit/organisms/valheim-shop/valheim-shop.css?tag=valheim-shop&encapsulation=scoped";
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
};
ValheimShop.style = ValheimShopStyle0() + ValheimShopStyle1();
//# sourceMappingURL=valheim-shop.js.map