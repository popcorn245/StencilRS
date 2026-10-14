import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { CARD_FALLBACK_TEXT, readCard, visibleActions, } from '../thread-card/thread-card-types';
import PopThreadCardListStyle0 from "./ui-kit/molecules/thread-card-list/thread-card-list.css?tag=pop-thread-card-list&encapsulation=scoped";
const PopThreadCardList = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popCardAction = __stencil_createEvent(this, "popCardAction", 7);
    }
    /** The validated card payload object (set as a PROPERTY, not an attribute). */
    payload;
    /** `frozen` = historical snapshot: muted chrome, read-only lines. */
    liveness = 'live';
    /** Viewer / public render — no action buttons, no line taps. */
    readonly = false;
    /** Emitted when the user taps a line or one of the card's actions. */
    popCardAction;
    footerActions(listId) {
        const params = listId ? { listId } : undefined;
        return [
            { actionId: 'add', label: 'Add an item', icon: 'add-outline', mutating: true, params },
            { actionId: 'open', label: 'Open panel', icon: 'open-outline', mutating: false, params },
        ];
    }
    /** Coerce `data.lines` into renderable rows. Never throws. */
    static lines(raw) {
        if (!Array.isArray(raw))
            return [];
        const out = [];
        raw.forEach((entry, i) => {
            if (typeof entry !== 'object' || entry === null)
                return;
            const line = entry;
            const label = typeof line.label === 'string' ? line.label.trim() : '';
            if (!label)
                return;
            out.push({
                id: typeof line.id === 'string' && line.id ? line.id : `line-${i}`,
                label,
                checked: line.checked === true,
                qty: typeof line.qty === 'string' && line.qty.trim() ? line.qty.trim() : undefined,
            });
        });
        return out;
    }
    fire(actionId, params) {
        this.popCardAction.emit({ actionId, params });
    }
    renderActions(frozen, listId) {
        const actions = visibleActions(this.footerActions(listId), frozen ? 'frozen' : 'live', this.readonly);
        if (!actions.length)
            return null;
        return (h("div", { class: "tcl__actions" }, actions.map((a) => (h("button", { key: a.actionId, class: "pop-iconbtn tcl__btn", type: "button", title: a.label, "aria-label": a.label, onClick: () => this.fire(a.actionId, a.params) },
            h("ion-icon", { name: a.icon, "aria-hidden": "true" }))))));
    }
    renderCard() {
        const card = readCard(this.payload);
        if (!card.ok) {
            return h("div", { class: "tcl tcl--broken" }, CARD_FALLBACK_TEXT);
        }
        const data = card.data;
        const lines = PopThreadCardList.lines(data.lines);
        const listId = typeof data.listId === 'string' ? data.listId : '';
        const frozen = this.liveness === 'frozen';
        // Lines are only tappable on a live, non-readonly card.
        const interactive = !frozen && !this.readonly;
        const left = lines.filter((l) => !l.checked).length;
        const title = card.title || 'List';
        return (h("div", { class: { tcl: true, 'tcl--frozen': frozen } },
            h("div", { class: "tcl__head" },
                h("ion-icon", { class: "tcl__glyph", name: "list-outline", "aria-hidden": "true" }),
                h("div", { class: "tcl__titles" },
                    h("span", { class: "tcl__title" }, title),
                    card.subtitle && h("span", { class: "tcl__subtitle" }, card.subtitle)),
                h("span", { class: "tcl__count" },
                    left,
                    " left")),
            lines.length === 0 ? (h("p", { class: "tcl__empty" }, "Nothing on this list yet.")) : (h("ul", { class: "tcl__lines" }, lines.map((line) => interactive ? (h("li", { key: line.id, class: { tcl__line: true, 'tcl__line--checked': line.checked } },
                h("button", { class: "pop-iconbtn tcl__tap", type: "button", "aria-label": `${line.checked ? 'Uncheck' : 'Check'} ${line.label}`, "aria-pressed": line.checked ? 'true' : 'false', onClick: () => this.fire('check', { lineId: line.id, checked: !line.checked }) },
                    h("ion-icon", { name: line.checked ? 'checkbox-outline' : 'square-outline', "aria-hidden": "true" }),
                    h("span", { class: "tcl__label" }, line.label),
                    line.qty && h("span", { class: "tcl__qty" }, line.qty)))) : (h("li", { key: line.id, class: { tcl__line: true, 'tcl__line--checked': line.checked } },
                h("span", { class: "tcl__static" },
                    h("ion-icon", { name: line.checked ? 'checkbox-outline' : 'square-outline', "aria-hidden": "true" }),
                    h("span", { class: "tcl__label" }, line.label),
                    line.qty && h("span", { class: "tcl__qty" }, line.qty))))))),
            card.assignees.length > 0 && (h("div", { class: "tcl__people" }, card.assignees.map((p) => (h("span", { key: p.uid || p.displayName, class: "tcl__chip" }, p.displayName))))),
            this.renderActions(frozen, listId)));
    }
    render() {
        // A single broken card must never blank the timeline it lives in.
        try {
            return this.renderCard();
        }
        catch {
            return h("div", { class: "tcl tcl--broken" }, CARD_FALLBACK_TEXT);
        }
    }
    static get style() { return PopThreadCardListStyle0(); }
};
__stencil_defineCustomElement(PopThreadCardList, [514, "pop-thread-card-list", {
        "payload": [8],
        "liveness": [8],
        "readonly": [4]
    }]);
//# sourceMappingURL=thread-card-list.js.map