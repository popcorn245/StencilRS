import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import ValheimWarriorsStyle0 from "./ui-kit/organisms/valheim-base.css?tag=valheim-warriors&encapsulation=scoped";
import ValheimWarriorsStyle1 from "./ui-kit/organisms/valheim-warriors/valheim-warriors.css?tag=valheim-warriors&encapsulation=scoped";
const RUNES = ['ᚦ', 'ᛗ', 'ᚱ', 'ᛖ', 'ᚨ', 'ᛟ', 'ᚹ', 'ᛒ', 'ᚴ', 'ᛚ'];
/**
 * `valheim-warriors` — the online-roster + server-health block of the Valheim
 * raid-league surfaces (hub panel + public event page). Theme-agnostic: ALL
 * color/shape rides the `--vlh-*` token layer (styles/valheim-skins.css) so
 * the same component renders hub-native under `.vlh-skin--hub` and in-universe
 * under `.vlh-skin--norse`.
 *
 * Admin server ops (restart / stop / backup) render only when `isAdmin`; the
 * component never talks to a backend — it emits `valheimServerAction` and the
 * host (hub-valheim) enqueues the real `valheimCommands` outbox doc.
 */
export class ValheimWarriors {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.valheimServerAction = __stencil_createEvent(this, "valheimServerAction", 7);
    }
    /** JSON array of ValheimWarrior. */
    players = '[]';
    maxPlayers;
    /** JSON ValheimServerHealth. */
    health = '{}';
    /** Server reachability (drives the header tone; ops still render). */
    online = true;
    /** Admin surfaces get the server-ops row. */
    isAdmin = false;
    heading = 'Warriors online';
    /** Admin op tapped — the HOST performs it (outbox enqueue). */
    valheimServerAction;
    get parsedPlayers() {
        try {
            const v = JSON.parse(this.players);
            return Array.isArray(v) ? v : [];
        }
        catch {
            return [];
        }
    }
    get parsedHealth() {
        try {
            const v = JSON.parse(this.health);
            return v && typeof v === 'object' ? v : {};
        }
        catch {
            return {};
        }
    }
    runeFor(w, i) {
        if (w.rune)
            return w.rune;
        let hash = i;
        for (const ch of w.name || '')
            hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
        return RUNES[hash % RUNES.length];
    }
    uptime(sec) {
        if (!sec || sec <= 0)
            return '—';
        const d = Math.floor(sec / 86400);
        const hLeft = Math.floor((sec - d * 86400) / 3600);
        if (d > 0)
            return `${d}d ${hLeft}h`;
        const m = Math.floor((sec % 3600) / 60);
        return hLeft > 0 ? `${hLeft}h ${m}m` : `${m}m`;
    }
    backupAgo(at) {
        if (!at)
            return '';
        const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
        return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
    }
    render() {
        const players = this.parsedPlayers;
        const health = this.parsedHealth;
        const cap = this.maxPlayers ? ` / ${this.maxPlayers}` : '';
        const backup = this.backupAgo(health.lastBackupAt);
        return (h("section", { key: '0', class: "vlh-block valheim-warriors" },
            h("div", { key: '1', class: "vlh-block-h" },
                h("div", { key: '2', class: "vlh-ic" },
                    h("pop-icon", { key: '3', name: "people-outline" })),
                h("div", { key: '4', class: "vlh-grow" },
                    h("h3", { key: '5' }, this.heading)),
                h("span", { key: '6', class: { 'vlh-count': true, 'vw-count--down': !this.online } }, this.online ? `${players.length}${cap}` : 'offline')),
            h("div", { key: '7', class: "vw-health" },
                h("span", { key: '8', class: this.online ? 'vw-ok' : 'vw-down' },
                    h("pop-icon", { key: '9', name: "pulse-outline" }),
                    this.online ? (h("span", null,
                        "Uptime ",
                        h("b", null, this.uptime(health.uptimeSec)))) : (h("span", null, "Server unreachable"))),
                this.online && Number.isFinite(health.tps) && [
                    h("span", { key: 'a', class: "vw-sep" }),
                    h("span", { key: 'b' },
                        h("b", { key: 'c' }, health.tps),
                        " TPS"),
                ],
                this.online && Number.isFinite(health.pingMs) && [
                    h("span", { key: 'd', class: "vw-sep" }),
                    h("span", { key: 'e' },
                        "ping ",
                        h("b", { key: 'f' },
                            health.pingMs,
                            " ms")),
                ]),
            players.length ? (h("div", { class: "vlh-rows" }, players.map((w, i) => (h("div", { class: "vlh-row", key: w.name },
                h("div", { class: "vlh-rune" }, this.runeFor(w, i)),
                h("div", { class: "vw-body" },
                    h("div", { class: "vw-name" },
                        h("span", { class: "vw-live" }),
                        w.name),
                    w.class && h("div", { class: "vw-class" }, w.class)),
                Number.isFinite(w.level) && h("span", { class: "vw-lvl" },
                    "Lv ",
                    w.level)))))) : (h("div", { class: "vw-empty" }, "The halls are quiet \u2014 no warriors online.")),
            this.isAdmin && (h("div", { key: 'g', class: "vw-ops" },
                h("span", { key: 'h', class: "vw-ops-lbl" }, "Server"),
                h("button", { key: 'i', class: "vlh-iconbtn", title: "Restart server", onClick: () => this.valheimServerAction.emit({ action: 'restart' }) },
                    h("pop-icon", { key: 'j', name: "refresh-outline" })),
                h("button", { key: 'k', class: "vlh-iconbtn vlh-iconbtn--danger", title: "Stop server", onClick: () => this.valheimServerAction.emit({ action: 'stop' }) },
                    h("pop-icon", { key: 'l', name: "stop-outline" })),
                h("button", { key: 'm', class: "vlh-iconbtn", title: "Backup now", onClick: () => this.valheimServerAction.emit({ action: 'backup' }) },
                    h("pop-icon", { key: 'n', name: "save-outline" })),
                backup && h("span", { key: 'o', class: "vw-ops-hint" },
                    "last backup ",
                    backup)))));
    }
    static get style() { return ValheimWarriorsStyle0() + ValheimWarriorsStyle1(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "valheim-warriors",
        "$members$": {
            "players": [1],
            "maxPlayers": [2, "max-players"],
            "health": [1],
            "online": [4],
            "isAdmin": [4, "is-admin"],
            "heading": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=valheim-warriors.js.map