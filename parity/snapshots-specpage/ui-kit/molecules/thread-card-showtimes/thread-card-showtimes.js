import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
import { CARD_FALLBACK_TEXT, readCard, visibleActions, } from '../thread-card/thread-card-types';
export const PopThreadCardShowtimes = class {
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-thread-card-showtimes",
        "componentClassName": "PopThreadCardShowtimes",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "payload",
                "type": "any",
                "attribute": "payload",
                "reflect": false,
                "mutable": false,
                "required": true,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "CardPayload",
                    "resolved": "CardPayload",
                    "references": {
                        "CardPayload": {
                            "location": "global",
                            "id": "global::CardPayload"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "The validated card payload object (set as a PROPERTY, not an attribute)."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "liveness",
                "type": "any",
                "attribute": "liveness",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'live'",
                "complexType": {
                    "original": "CardLiveness",
                    "resolved": "CardLiveness",
                    "references": {
                        "CardLiveness": {
                            "location": "global",
                            "id": "global::CardLiveness"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "`frozen` = historical snapshot (a past date): muted chrome."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "readonly",
                "type": "boolean",
                "attribute": "readonly",
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
                    "text": "Viewer / public render \u2014 no action buttons at all."
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
                "name": "popCardAction",
                "method": "popCardAction",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the user taps one of the card's actions."
                },
                "complexType": {
                    "original": "CardActionDetail",
                    "resolved": "CardActionDetail",
                    "references": {
                        "CardActionDetail": {
                            "location": "global",
                            "id": "global::CardActionDetail"
                        }
                    }
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-THREAD-CARD-SHOWTIMES",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/thread-card-showtimes/thread-card-showtimes.css",
                        "relativePath": "thread-card-showtimes.css",
                        "originalComponentPath": "thread-card-showtimes.css"
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
        "hasPropString": false,
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
        "htmlAttrNames": ["class", "key", "type", "title", "aria-label", "onClick", "name", "aria-hidden"],
        "htmlTagNames": ["div", "button", "ion-icon", "span", "p", "ul", "li", "h4"],
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
//# sourceMappingURL=thread-card-showtimes.js.map