import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
const RUNES = ['ᚦ', 'ᛗ', 'ᚱ', 'ᛖ', 'ᚨ', 'ᛟ', 'ᚹ', 'ᛒ', 'ᚴ', 'ᛚ'];
export const ValheimWarriors = class {
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "valheim-warriors",
        "componentClassName": "ValheimWarriors",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "players",
                "type": "string",
                "attribute": "players",
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
                    "text": "JSON array of ValheimWarrior."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "maxPlayers",
                "type": "number",
                "attribute": "max-players",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "number",
                    "resolved": "number | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "health",
                "type": "string",
                "attribute": "health",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'{}'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON ValheimServerHealth."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "online",
                "type": "boolean",
                "attribute": "online",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "true",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Server reachability (drives the header tone; ops still render)."
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
                    "text": "Admin surfaces get the server-ops row."
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
                "defaultValue": "'Warriors online'",
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
                "name": "valheimServerAction",
                "method": "valheimServerAction",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Admin op tapped \u2014 the HOST performs it (outbox enqueue)."
                },
                "complexType": {
                    "original": "{ action: ValheimServerActionKind }",
                    "resolved": "{ action: ValheimServerActionKind; }",
                    "references": {
                        "ValheimServerActionKind": {
                            "location": "local",
                            "path": "ui-kit/organisms/valheim-warriors/valheim-warriors.tsx",
                            "id": "ui-kit/organisms/valheim-warriors/valheim-warriors.tsx::ValheimServerActionKind"
                        }
                    }
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "VALHEIM-WARRIORS",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/valheim-base.css",
                        "relativePath": "../valheim-base.css",
                        "originalComponentPath": "../valheim-base.css"
                    }, {
                        "absolutePath": "./ui-kit/organisms/valheim-warriors/valheim-warriors.css",
                        "relativePath": "valheim-warriors.css",
                        "originalComponentPath": "valheim-warriors.css"
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
        "hasPropNumber": true,
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
        "htmlAttrNames": ["key", "class", "name", "title", "onClick"],
        "htmlTagNames": ["section", "div", "pop-icon", "h3", "span", "b", "button"],
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
//# sourceMappingURL=valheim-warriors.js.map