import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import { CARD_FALLBACK_TEXT, readCard, visibleActions, } from '../thread-card/thread-card-types';
import PopThreadCardShowtimesStyle0 from "./ui-kit/molecules/thread-card-showtimes/thread-card-showtimes.css?tag=pop-thread-card-showtimes&encapsulation=scoped";
/**
 * pop-thread-card-showtimes — the Thread Model v2 renderer for a movie
 * showtimes card.
 *
 * THEATER-FIRST by design: the theater name is the heading of each group and
 * the showtimes hang under it as chips. This card NEVER renders ticket links.
 *
 * Both actions ("Open theater", "Add to calendar") are navigational, so they
 * survive a freeze; `readonly` still removes them.
 *
 *   payload.data = { date: string; movie: string;
 *                    theaters: { name, times[], address? }[]; timezone?: string }
 */
export class PopThreadCardShowtimes {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popCardAction = __stencil_createEvent(this, "popCardAction", 7);
    }
    /** The validated card payload object (set as a PROPERTY, not an attribute). */
    payload;
    /** `frozen` = historical snapshot (a past date): muted chrome. */
    liveness = 'live';
    /** Viewer / public render — no action buttons at all. */
    readonly = false;
    /** Emitted when the user taps one of the card's actions. */
    popCardAction;
    /** Coerce `data.theaters` into renderable groups. Never throws. */
    static theaters(raw) {
        if (!Array.isArray(raw))
            return [];
        const out = [];
        for (const entry of raw) {
            if (typeof entry !== 'object' || entry === null)
                continue;
            const t = entry;
            const name = typeof t.name === 'string' ? t.name.trim() : '';
            if (!name)
                continue;
            const times = Array.isArray(t.times)
                ? t.times.filter((x) => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
                : [];
            out.push({
                name,
                times,
                address: typeof t.address === 'string' && t.address.trim() ? t.address.trim() : undefined,
            });
        }
        return out;
    }
    fire(actionId, params) {
        this.popCardAction.emit({ actionId, params });
    }
    /** Navigational actions only — nothing here mutates, so a freeze keeps them. */
    footerActions(movie, date) {
        return [
            {
                actionId: 'add_to_calendar',
                label: 'Add to calendar',
                icon: 'calendar-outline',
                mutating: false,
                params: { movie, date },
            },
        ];
    }
    renderActions(frozen, movie, date) {
        const actions = visibleActions(this.footerActions(movie, date), frozen ? 'frozen' : 'live', this.readonly);
        if (!actions.length)
            return null;
        return (h("div", { class: "tcs__actions" }, actions.map((a) => (h("button", { key: a.actionId, class: "pop-iconbtn tcs__btn", type: "button", title: a.label, "aria-label": a.label, onClick: () => this.fire(a.actionId, a.params) },
            h("ion-icon", { name: a.icon, "aria-hidden": "true" }))))));
    }
    renderCard() {
        const card = readCard(this.payload);
        if (!card.ok) {
            return h("div", { class: "tcs tcs--broken" }, CARD_FALLBACK_TEXT);
        }
        const data = card.data;
        const date = typeof data.date === 'string' ? data.date.trim() : '';
        const movie = typeof data.movie === 'string' && data.movie.trim() ? data.movie.trim() : '';
        const timezone = typeof data.timezone === 'string' && data.timezone.trim() ? data.timezone.trim() : '';
        const theaters = PopThreadCardShowtimes.theaters(data.theaters);
        const frozen = this.liveness === 'frozen';
        const title = movie || card.title || 'Showtimes';
        // "Open theater" is navigational too, so it only depends on `readonly`.
        const showTheaterLink = !this.readonly;
        return (h("div", { class: { tcs: true, 'tcs--frozen': frozen } },
            h("div", { class: "tcs__head" },
                h("ion-icon", { class: "tcs__glyph", name: "film-outline", "aria-hidden": "true" }),
                h("div", { class: "tcs__titles" },
                    h("span", { class: "tcs__title" }, title),
                    h("span", { class: "tcs__subtitle" }, [date, timezone, card.subtitle].filter(Boolean).join(' · ')))),
            theaters.length === 0 ? (h("p", { class: "tcs__empty" }, "No showtimes found.")) : (h("ul", { class: "tcs__theaters" }, theaters.map((t) => (h("li", { key: t.name, class: "tcs__theater" },
                h("div", { class: "tcs__theater-head" },
                    h("h4", { class: "tcs__theater-name" }, t.name),
                    showTheaterLink && (h("button", { class: "pop-iconbtn tcs__btn tcs__btn--inline", type: "button", title: `Open ${t.name}`, "aria-label": `Open ${t.name}`, onClick: () => this.fire('open_theater', { theater: t.name, address: t.address }) },
                        h("ion-icon", { name: "location-outline", "aria-hidden": "true" })))),
                t.address && h("span", { class: "tcs__address" }, t.address),
                t.times.length === 0 ? (h("span", { class: "tcs__no-times" }, "No times listed")) : (h("div", { class: "tcs__times" }, t.times.map((time) => (h("span", { key: time, class: "tcs__time" }, time)))))))))),
            this.renderActions(frozen, movie, date)));
    }
    render() {
        // A single broken card must never blank the timeline it lives in.
        try {
            return this.renderCard();
        }
        catch {
            return h("div", { class: "tcs tcs--broken" }, CARD_FALLBACK_TEXT);
        }
    }
    static get style() { return PopThreadCardShowtimesStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-thread-card-showtimes",
        "$members$": {
            "payload": [8],
            "liveness": [8],
            "readonly": [4]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=thread-card-showtimes.js.map