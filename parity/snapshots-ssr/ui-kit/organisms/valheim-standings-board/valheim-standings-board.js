import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import ValheimStandingsBoardStyle0 from "./ui-kit/organisms/valheim-base.css?tag=valheim-standings-board&encapsulation=scoped";
import ValheimStandingsBoardStyle1 from "./ui-kit/organisms/valheim-standings-board/valheim-standings-board.css?tag=valheim-standings-board&encapsulation=scoped";
/**
 * `valheim-standings-board` — "The Pantheon", the hall-of-the-worthy standings
 * block of the Popcorn's Pantheon surfaces. Theme-agnostic via the `--vlh-*`
 * token layer.
 *
 * The Pantheon (default view) is CO-OP: bounties · coin · bosses · Falls
 * (deaths to the world — playful ribbing, never PvP kills), with medal ranks.
 * Juggernaut: the hidden FINALE bounty board — PvP banner, the current target
 * and their price. The Juggernaut toggle only renders once the finale is
 * `active` (or for admins) — PvP is never the everyday framing, and the
 * toggle's existence would leak the season-end twist to players.
 */
export class ValheimStandingsBoard {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /** JSON array of ValheimStandingRow, rank order. */
    standings = '[]';
    /** JSON ValheimJuggernautState ('' = no finale state yet). */
    juggernaut = '';
    /** Admins see the Juggernaut toggle even before the finale goes live. */
    isAdmin = false;
    heading = 'The Pantheon';
    mode = 'league';
    get parsedStandings() {
        try {
            const v = JSON.parse(this.standings);
            return Array.isArray(v) ? v : [];
        }
        catch {
            return [];
        }
    }
    get parsedJug() {
        if (!this.juggernaut)
            return null;
        try {
            const v = JSON.parse(this.juggernaut);
            return v && typeof v === 'object' ? v : null;
        }
        catch {
            return null;
        }
    }
    fmt(n) {
        return Number.isFinite(n) ? n.toLocaleString('en-US') : '0';
    }
    renderLeague(rows) {
        if (!rows.length) {
            return h("div", { class: "vsb-empty" }, "The Pantheon stands empty \u2014 the saga has not begun.");
        }
        return [
            h("table", { class: "vsb-board" },
                h("thead", null,
                    h("tr", null,
                        h("th", { class: "vsb-l" }, "#"),
                        h("th", { class: "vsb-l" }, "Warrior"),
                        h("th", null, "Bounties"),
                        h("th", null, "Coin"),
                        h("th", { title: "Bosses felled together" }, "Bosses"),
                        h("th", { title: "Deaths to the world \u2014 the monsters keep count" }, "Falls"))),
                h("tbody", null, rows.map((r, i) => (h("tr", { key: r.name },
                    h("td", { class: "vsb-l" },
                        h("span", { class: { 'vsb-rank': true, [`vsb-rank--g${i + 1}`]: i < 3 } }, i + 1)),
                    h("td", { class: "vsb-l" },
                        h("div", { class: "vsb-w" },
                            r.rune && h("span", { class: "vlh-rune vsb-rune" }, r.rune),
                            h("span", { class: "vsb-nm" }, r.name))),
                    h("td", null, this.fmt(r.bounties)),
                    h("td", { class: "vsb-coin" },
                        this.fmt(r.coin),
                        h("span", { class: "vlh-cn" }, "\u2B24")),
                    h("td", null, this.fmt(r.bosses ?? 0)),
                    h("td", { class: "vsb-falls" }, this.fmt(r.deaths))))))),
            h("div", { class: "vlh-legend vsb-coop" },
                h("pop-icon", { name: "people-outline" }),
                " Co-Op world with PvP events."),
        ];
    }
    renderJuggernaut(jug) {
        if (!jug?.active) {
            return (h("div", { class: "vsb-empty" }, "The Juggernaut finale has not begun. When the eighth boss falls, the truce breaks\u2026"));
        }
        return (h("div", { class: "vsb-jug" },
            h("div", { class: "vsb-jugbanner" },
                h("pop-icon", { class: "vsb-jb-ic", name: "flame" }),
                h("div", null,
                    h("div", { class: "vsb-jb-t" }, "Juggernaut finale"),
                    h("div", { class: "vsb-jb-s" }, "The truce is broken \u2014 every warrior is fair game.")),
                h("span", { class: { 'vsb-pvp': true, 'vsb-pvp--off': !jug.pvpOn } }, jug.pvpOn ? 'PvP ON' : 'PvP OFF')),
            jug.targetName && (h("div", { class: "vsb-target" },
                h("span", { class: "vlh-rune" }, "\u16A6"),
                h("div", null,
                    h("div", { class: "vsb-tc-name" }, jug.targetName),
                    h("div", { class: "vsb-tc-tag" }, "The Juggernaut \u2014 a price on their head")),
                jug.bounty != null && (h("div", { class: "vsb-bounty" },
                    h("div", { class: "vsb-b-lab" }, "Bounty"),
                    h("div", { class: "vsb-b-val" }, this.fmt(jug.bounty)))))),
            h("div", { class: "vsb-jugnote" },
                h("pop-icon", { name: "skull-outline" }),
                " Slay the leader to claim the crown. Most bounty kills wins the saga.")));
    }
    render() {
        const rows = this.parsedStandings;
        const jug = this.parsedJug;
        const showJugTab = !!jug?.active || this.isAdmin;
        const mode = showJugTab ? this.mode : 'league';
        return (h("section", { key: '0', class: "vlh-block valheim-standings-board" },
            h("div", { key: '1', class: "vlh-block-h" },
                h("div", { key: '2', class: "vlh-ic" },
                    h("pop-icon", { key: '3', name: "trophy-outline" })),
                h("div", { key: '4', class: "vlh-grow" },
                    h("h3", { key: '5' }, this.heading))),
            showJugTab && (h("div", { key: '6', class: "vsb-tabs" },
                h("button", { key: '7', class: { 'vsb-on': mode === 'league' }, onClick: () => (this.mode = 'league') },
                    h("pop-icon", { key: '8', name: "ribbon-outline" }),
                    " League"),
                h("button", { key: '9', class: { 'vsb-jugbtn': true, 'vsb-on': mode === 'jug' }, onClick: () => (this.mode = 'jug') },
                    h("pop-icon", { key: 'a', name: "skull-outline" }),
                    " Juggernaut"))),
            mode === 'league' ? this.renderLeague(rows) : this.renderJuggernaut(jug)));
    }
    static get style() { return ValheimStandingsBoardStyle0() + ValheimStandingsBoardStyle1(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "valheim-standings-board",
        "$members$": {
            "standings": [1],
            "juggernaut": [1],
            "isAdmin": [4, "is-admin"],
            "heading": [1],
            "mode": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=valheim-standings-board.js.map