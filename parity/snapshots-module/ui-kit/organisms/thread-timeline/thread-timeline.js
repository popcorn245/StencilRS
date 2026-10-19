import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopThreadTimelineStyle0 from "./ui-kit/organisms/thread-timeline/thread-timeline.css?tag=pop-thread-timeline&encapsulation=scoped";
/** Distance (px) from the top that triggers an upward "load older" fetch. */
const LOAD_OLDER_THRESHOLD = 48;
export const PopThreadTimeline = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popItemAction = __stencil_createEvent(this, "popItemAction", 7);
        this.popItemReply = __stencil_createEvent(this, "popItemReply", 7);
        this.popItemStatus = __stencil_createEvent(this, "popItemStatus", 7);
        this.popItemPromote = __stencil_createEvent(this, "popItemPromote", 7);
        this.popLoadOlder = __stencil_createEvent(this, "popLoadOlder", 7);
    }
    get el() { return this; }
    /** Items in SERVER order — oldest first. Never re-sorted here. */
    items = [];
    /** The viewing user; drives own-vs-other bubble rendering. */
    currentUid = '';
    /** False ⇒ viewer mode: no action buttons, no reply/check-off affordances. */
    canParticipate = true;
    /** cardType → `pop-*` renderer tag. Injected; ui-kit holds no registry. */
    renderers = {};
    /** Shows the top spinner while older items are being fetched. */
    loadingOlder = false;
    /** Items appended live over SSE, kept out of `items` so no full re-render. */
    appended = [];
    /** A card action fired from inside an item. */
    popItemAction;
    /** The user wants to reply to an item. */
    popItemReply;
    /** Check-off: open → done → open, or dismissed. */
    popItemStatus;
    /** Promote a message into a card / task. */
    popItemPromote;
    /** Infinite scroll upward — cursor is the oldest rendered item id. */
    popLoadOlder;
    /** Guards the scroll handler so one scroll-to-top fires one request. */
    olderRequested = false;
    componentDidLoad() {
        // Card actions bubble out of `pop-thread-card`; catch them once at the root
        // and re-emit as `popItemAction` tagged with the owning item's id. Doing it
        // here (rather than per-card) means live-appended cards are covered too.
        this.el.addEventListener('popCardAction', this.onCardAction);
    }
    disconnectedCallback() {
        this.el.removeEventListener('popCardAction', this.onCardAction);
    }
    onCardAction = (ev) => {
        const host = ev.target?.closest?.('[data-item-id]');
        const itemId = host?.getAttribute('data-item-id');
        if (!itemId)
            return;
        // stopImmediatePropagation, not stopPropagation: consumers bind to THIS
        // element, so the raw card event has to be swallowed here or every action
        // would surface twice (once raw, once as popItemAction).
        ev.stopImmediatePropagation();
        this.popItemAction.emit({ itemId, actionId: ev.detail?.actionId, params: ev.detail?.params });
    };
    /** Scroll a given item into view — used by search and back-reference stubs. */
    async scrollToItem(id) {
        // Match by attribute VALUE rather than building a selector — item ids come
        // from Firestore and must never have to survive CSS selector escaping.
        const target = Array.from(this.el.querySelectorAll('[data-item-id]')).find((n) => n.getAttribute('data-item-id') === id);
        if (!target)
            return;
        target.classList.add('ttl__item--flash');
        if (typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }
    /** Append a live (SSE) item without asking the host to rebuild `items`. */
    async appendItem(item) {
        if (!item || typeof item.id !== 'string')
            return;
        if (this.rows().some((i) => i.id === item.id))
            return;
        this.appended = [...this.appended, item];
    }
    /** The rendered list: server items first, then anything appended live. */
    rows() {
        const base = Array.isArray(this.items) ? this.items : [];
        const seen = new Set(base.map((i) => i?.id));
        // NOTE: no sort. The server's order is the truth.
        return [...base, ...this.appended.filter((i) => i && !seen.has(i.id))];
    }
    onScroll = (ev) => {
        const box = ev.currentTarget;
        if (box.scrollTop > LOAD_OLDER_THRESHOLD) {
            this.olderRequested = false;
            return;
        }
        if (this.olderRequested || this.loadingOlder)
            return;
        this.olderRequested = true;
        this.requestOlder();
    };
    requestOlder = () => {
        const rows = this.rows();
        this.popLoadOlder.emit({ cursor: rows.length ? rows[0].id : null });
    };
    label(item) {
        if (item.authorKind === 'bot')
            return 'Bucket';
        if (item.authorKind === 'system')
            return 'System';
        if (item.authorKind === 'panel')
            return item.sourcePanel || 'Panel';
        return item.authorUid === this.currentUid ? 'You' : item.authorUid || 'Someone';
    }
    /** A short preview of the item a reply points at, for the back-reference stub. */
    replyPreview(item) {
        const target = this.rows().find((i) => i.id === item.replyToItemId);
        if (!target)
            return 'earlier in this thread';
        const text = (target.text || target.card?.title || target.cardType || '').trim();
        if (!text)
            return 'earlier in this thread';
        return text.length > 60 ? `${text.slice(0, 57)}…` : text;
    }
    renderReplyStub(item) {
        if (!item.replyToItemId)
            return null;
        return (h("button", { type: "button", class: "ttl__replyref", title: "Jump to the replied-to item", onClick: () => this.scrollToItem(item.replyToItemId) },
            h("ion-icon", { name: "return-up-back-outline", "aria-hidden": "true" }),
            h("span", { class: "ttl__replyref-text" }, this.replyPreview(item))));
    }
    renderAttribution(item) {
        if (!item.sourcePanel)
            return null;
        return h("span", { class: "ttl__from" },
            "from ",
            item.sourcePanel);
    }
    renderControls(item) {
        if (!this.canParticipate)
            return null;
        const done = item.itemStatus === 'done';
        return (h("div", { class: "ttl__controls" },
            item.checkable && (h("button", { type: "button", class: "pop-iconbtn ttl__btn", title: done ? 'Reopen' : 'Mark done', "aria-label": done ? 'Reopen' : 'Mark done', onClick: () => this.popItemStatus.emit({ itemId: item.id, status: done ? 'open' : 'done' }) },
                h("ion-icon", { name: done ? 'refresh-outline' : 'checkmark-outline', "aria-hidden": "true" }))),
            h("button", { type: "button", class: "pop-iconbtn ttl__btn", title: "Reply", "aria-label": "Reply", onClick: () => this.popItemReply.emit({ itemId: item.id }) },
                h("ion-icon", { name: "arrow-undo-outline", "aria-hidden": "true" })),
            h("button", { type: "button", class: "pop-iconbtn ttl__btn", title: "Promote", "aria-label": "Promote", onClick: () => this.popItemPromote.emit({ itemId: item.id }) },
                h("ion-icon", { name: "arrow-up-circle-outline", "aria-hidden": "true" }))));
    }
    /**
     * Resolve the renderer tag for an item: an explicit `item.renderer` wins,
     * otherwise the INJECTED map. A miss yields '' and `pop-thread-card` shows its
     * fallback face rather than a blank row.
     */
    rendererFor(item) {
        return item.renderer || this.renderers?.[item.cardType || ''] || '';
    }
    renderItem(item) {
        const own = !!item.authorUid && item.authorUid === this.currentUid;
        const dismissed = item.itemStatus === 'dismissed';
        const done = item.itemStatus === 'done';
        if (dismissed) {
            // Collapsed: one muted line, still addressable by scrollToItem().
            return (h("article", { key: item.id, class: "ttl__item ttl__item--dismissed", "data-item-id": item.id },
                h("ion-icon", { name: "eye-off-outline", "aria-hidden": "true" }),
                h("span", { class: "ttl__dismissed-text" }, "Dismissed")));
        }
        return (h("article", { key: item.id, class: {
                ttl__item: true,
                'ttl__item--own': own,
                'ttl__item--other': !own,
                'ttl__item--done': done,
                'ttl__item--card': item.kind === 'card',
            }, "data-item-id": item.id },
            h("div", { class: "ttl__meta" },
                h("span", { class: "ttl__author" }, this.label(item)),
                this.renderAttribution(item)),
            this.renderReplyStub(item),
            item.kind === 'card' ? (h("pop-thread-card", { class: "ttl__card", cardType: item.cardType || '', payload: item.card || undefined, liveness: item.liveness || 'live', actions: this.canParticipate ? item.actions || [] : [], readonly: !this.canParticipate, renderer: this.rendererFor(item) })) : (h("div", { class: "ttl__bubble" }, item.text || '')),
            this.renderControls(item)));
    }
    render() {
        const rows = this.rows();
        return (h("div", { key: '0', class: "ttl", onScroll: this.onScroll },
            this.loadingOlder ? (h("div", { class: "ttl__spinner", role: "status", "aria-live": "polite" },
                h("ion-icon", { name: "hourglass-outline", "aria-hidden": "true" }),
                "Loading older\u2026")) : (rows.length > 0 && (h("button", { type: "button", class: "ttl__older", onClick: this.requestOlder }, "Load older"))),
            rows.length === 0 && !this.loadingOlder ? (h("p", { class: "ttl__empty" }, "Nothing here yet.")) : (rows.map((item) => this.renderItem(item)))));
    }
    static get style() { return PopThreadTimelineStyle0(); }
};
__stencil_proxyCustomElement(PopThreadTimeline, [514, "pop-thread-timeline", {
        "items": [16],
        "currentUid": [1, "current-uid"],
        "canParticipate": [4, "can-participate"],
        "renderers": [8],
        "loadingOlder": [4, "loading-older"],
        "appended": [32],
        "scrollToItem": [64],
        "appendItem": [64]
    }]);
//# sourceMappingURL=thread-timeline.js.map