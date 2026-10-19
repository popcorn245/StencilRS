import { registerInstance as __stencil_registerInstance } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const ValheimStandingsBoard = class {
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "valheim-standings-board",
        "componentClassName": "ValheimStandingsBoard",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "standings",
                "type": "string",
                "attribute": "standings",
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
                    "text": "JSON array of ValheimStandingRow, rank order."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "juggernaut",
                "type": "string",
                "attribute": "juggernaut",
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
                    "text": "JSON ValheimJuggernautState ('' = no finale state yet)."
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
                    "text": "Admins see the Juggernaut toggle even before the finale goes live."
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
                "defaultValue": "'The Pantheon'",
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
        "states": [{
                "name": "mode"
            }],
        "methods": [],
        "listeners": [],
        "events": [],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "VALHEIM-STANDINGS-BOARD",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/valheim-base.css",
                        "relativePath": "../valheim-base.css",
                        "originalComponentPath": "../valheim-base.css"
                    }, {
                        "absolutePath": "./ui-kit/organisms/valheim-standings-board/valheim-standings-board.css",
                        "relativePath": "valheim-standings-board.css",
                        "originalComponentPath": "valheim-standings-board.css"
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
        "hasEvent": false,
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
        "hasState": true,
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
        "htmlAttrNames": ["class", "title", "key", "name", "onClick"],
        "htmlTagNames": ["div", "table", "thead", "tr", "th", "tbody", "td", "span", "pop-icon", "section", "h3", "button"],
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
//# sourceMappingURL=valheim-standings-board.js.map