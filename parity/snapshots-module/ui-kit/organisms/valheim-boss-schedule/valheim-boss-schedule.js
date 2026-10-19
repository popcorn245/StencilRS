import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import ValheimBossScheduleStyle0 from "./ui-kit/organisms/valheim-base.css?tag=valheim-boss-schedule&encapsulation=scoped";
import ValheimBossScheduleStyle1 from "./ui-kit/organisms/valheim-boss-schedule/valheim-boss-schedule.css?tag=valheim-boss-schedule&encapsulation=scoped";
export const ValheimBossSchedule = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.valheimRsvp = __stencil_createEvent(this, "valheimRsvp", 7);
    }
    /** JSON array of ValheimBossItem, season order. */
    bosses = '[]';
    /** Admin view — full schedule, sealed rows included. */
    isAdmin = false;
    /** Raiders who answered the horn for the current boss night. */
    rsvpCount;
    /** Epoch ms of the next boss night (drives the countdown). */
    bossNightAt;
    /** Render the agenda list (false = the Overview "next trial" glance). */
    showList = true;
    /** Show the "Answer the horn" CTA on the RSVP row. Admin dashboards that
     *  only MONITOR the count (the RSVP flow is bot-run) pass false. */
    rsvpCta = true;
    heading = 'The trials';
    /** RSVP button — the HOST records the answer. */
    valheimRsvp;
    nowTick = Date.now();
    timer;
    connectedCallback() {
        this.syncTimer();
    }
    disconnectedCallback() {
        this.stopTimer();
    }
    onBossNightChange() {
        this.syncTimer();
    }
    /** Only tick (a re-render per second) while there's a countdown to show. */
    syncTimer() {
        this.stopTimer();
        if (this.bossNightAt) {
            this.timer = setInterval(() => (this.nowTick = Date.now()), 1000);
        }
    }
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
    get parsedBosses() {
        try {
            const v = JSON.parse(this.bosses);
            return Array.isArray(v) ? v : [];
        }
        catch {
            return [];
        }
    }
    /** Announced-to-players (independent of the admin override). */
    revealedToPlayers(b) {
        return b.status === 'done' || b.status === 'now' || b.revealed === true;
    }
    countdown() {
        if (!this.bossNightAt)
            return '';
        let s = Math.max(0, Math.floor((this.bossNightAt - this.nowTick) / 1000));
        const d = Math.floor(s / 86400);
        s -= d * 86400;
        const hh = Math.floor(s / 3600);
        s -= hh * 3600;
        const mm = Math.floor(s / 60);
        s -= mm * 60;
        const p = (n) => String(n).padStart(2, '0');
        return `${d}d ${p(hh)}:${p(mm)}:${p(s)}`;
    }
    renderTarget(current) {
        if (!current)
            return null;
        const cd = this.countdown();
        const isEvent = current.kind === 'event';
        // Event trials lead with the prize; bosses keep their biome flavor. NEXT-
        // ONLY: players never see week numbering.
        const meta = isEvent
            ? [this.isAdmin ? current.week : undefined, current.prize ? `Prize: ${current.prize}` : undefined]
            : [this.isAdmin ? current.week : undefined, current.biome];
        return (h("div", { class: { 'vbs-target': true, 'vbs-target--event': isEvent } },
            h("div", { class: "vbs-sigil" },
                h("pop-icon", { name: isEvent ? 'trophy-outline' : 'skull-outline' })),
            h("div", null,
                h("div", { class: "vbs-name" },
                    current.name,
                    isEvent && current.pvp && h("span", { class: "vbs-pvptag" }, "Opt-in PvP")),
                h("div", { class: "vbs-tag" }, meta.filter(Boolean).join(' · ') || 'The next trial')),
            cd && (h("div", { class: "vbs-countdown" },
                h("div", { class: "vbs-cd-lab" }, isEvent ? 'Event night in' : 'Boss night in'),
                h("div", { class: "vbs-cd-val" }, cd)))));
    }
    renderRsvp() {
        if (this.rsvpCount == null)
            return null;
        return (h("div", { class: "vbs-rsvp" },
            h("pop-icon", { name: "megaphone-outline" }),
            h("span", null,
                h("b", null, this.rsvpCount),
                " raiders answered the horn"),
            this.rsvpCta && (h("button", { class: "vlh-btn vlh-btn--sm vbs-rsvp-go", onClick: () => this.valheimRsvp.emit() }, "Answer the horn"))));
    }
    /** The single sealed teaser row players see in place of the rest of the
     *  agenda — ONE row regardless of what remains, so nothing about the
     *  season's length leaks. */
    renderSealedTeaser() {
        return (h("div", { class: "vbs-row vbs-row--sealed" },
            h("div", { class: "vbs-node" },
                h("pop-icon", { name: "lock-closed" })),
            h("div", { class: "vbs-rbody" },
                h("div", { class: "vbs-rname" }, "???"),
                h("div", { class: "vbs-rmeta" }, "Sealed \u2014 the gods reveal one trial at a time")),
            h("span", { class: "vlh-st vlh-st--sealed" }, "Sealed")));
    }
    renderRow(b) {
        // Defense in depth: player lists are pre-filtered to revealed rows in
        // render(), but a stray sealed row still never leaks name/biome/week.
        const open = this.isAdmin || this.revealedToPlayers(b);
        if (!open)
            return this.renderSealedTeaser();
        const isEvent = b.kind === 'event';
        const icon = isEvent
            ? b.status === 'done'
                ? 'checkmark'
                : 'trophy-outline'
            : b.status === 'done'
                ? 'checkmark'
                : b.status === 'now'
                    ? 'flame'
                    : b.status === 'finale'
                        ? 'sparkles'
                        : 'ellipse-outline';
        const pill = b.status === 'done' ? (h("span", { class: "vlh-st vlh-st--done" }, isEvent ? 'Held' : 'Fallen')) : b.status === 'now' ? (h("span", { class: "vlh-st vlh-st--now" }, isEvent ? 'Event' : 'This week')) : b.status === 'finale' ? (h("span", { class: "vlh-st vlh-st--sealed" }, "Finale")) : (h("span", { class: "vlh-st vlh-st--soon" }, isEvent ? 'Event' : 'Upcoming'));
        // Event trials lead with the prize; bosses keep their biome flavor.
        const meta = isEvent
            ? [this.isAdmin ? b.week : undefined, b.prize ? `Prize: ${b.prize}` : undefined]
            : [this.isAdmin ? b.week : undefined, b.biome];
        return (h("div", { class: { 'vbs-row': true, [`vbs-row--${b.status}`]: true, 'vbs-row--event': isEvent } },
            h("div", { class: "vbs-node" },
                h("pop-icon", { name: icon })),
            h("div", { class: "vbs-rbody" },
                h("div", { class: "vbs-rname" },
                    b.name,
                    isEvent && b.pvp && h("span", { class: "vbs-pvptag" }, "Opt-in PvP"),
                    this.isAdmin && b.slot2 && h("span", { class: "vbs-slot2" }, "2-week slot")),
                h("div", { class: "vbs-rmeta" }, meta.filter(Boolean).join(' · '))),
            pill));
    }
    render() {
        const bosses = this.parsedBosses;
        const current = bosses.find((b) => b.status === 'now');
        // NEXT-ONLY for players: only revealed/past trials render as rows; the
        // entire rest of the agenda is ONE sealed teaser (never a row per slot).
        const rows = this.isAdmin ? bosses : bosses.filter((b) => this.revealedToPlayers(b));
        const showAgenda = this.showList && (rows.length > 0 || !this.isAdmin);
        return (h("section", { key: '0', class: "vlh-block valheim-boss-schedule" },
            h("div", { key: '1', class: "vlh-block-h" },
                h("div", { key: '2', class: "vlh-ic vlh-ic--danger" },
                    h("pop-icon", { key: '3', name: "skull-outline" })),
                h("div", { key: '4', class: "vlh-grow" },
                    h("h3", { key: '5' }, this.heading))),
            this.renderTarget(current),
            this.renderRsvp(),
            showAgenda && (h("div", { key: '6', class: "vbs-list" },
                rows.map((b) => this.renderRow(b)),
                !this.isAdmin && this.renderSealedTeaser())),
            showAgenda && (h("div", { key: '7', class: { 'vlh-legend': true, 'vlh-legend--adm': this.isAdmin, 'vlh-legend--pub': !this.isAdmin } },
                h("pop-icon", { key: '8', name: this.isAdmin ? 'eye-outline' : 'lock-closed-outline' }),
                this.isAdmin
                    ? 'Admin view — the full agenda, including sealed trials. Players only ever see the next trial.'
                    : 'The gods reveal one trial at a time — the rest of the saga stays sealed.'))));
    }
    static get watchers() { return {
        "bossNightAt": [{
                "onBossNightChange": 0
            }]
    }; }
    static get style() { return ValheimBossScheduleStyle0() + ValheimBossScheduleStyle1(); }
};
__stencil_proxyCustomElement(ValheimBossSchedule, [514, "valheim-boss-schedule", {
        "bosses": [1],
        "isAdmin": [4, "is-admin"],
        "rsvpCount": [2, "rsvp-count"],
        "bossNightAt": [2, "boss-night-at"],
        "showList": [4, "show-list"],
        "rsvpCta": [4, "rsvp-cta"],
        "heading": [1],
        "nowTick": [32]
    }, undefined, {
        "bossNightAt": [{
                "onBossNightChange": 0
            }]
    }]);
//# sourceMappingURL=valheim-boss-schedule.js.map