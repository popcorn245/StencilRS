import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
import { CARD_FALLBACK_TEXT, formatDuration, readCard, visibleActions, } from '../thread-card/thread-card-types';
export const PopThreadCardTimer = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popCardAction = __stencil_createEvent(this, "popCardAction", 7);
    }
    /** The validated card payload object (set as a PROPERTY, not an attribute). */
    payload;
    /** `frozen` = historical snapshot: muted chrome, no mutating actions. */
    liveness = 'live';
    /** Viewer / public render — no action buttons at all. */
    readonly = false;
    /** Emitted when the user taps one of the card's actions. */
    popCardAction;
    /** Every action this card can offer, before liveness/readonly filtering. */
    static ACTIONS = [
        { actionId: 'snooze', label: 'Snooze', icon: 'alarm-outline', mutating: true },
        { actionId: 'plus5', label: 'Add 5 minutes', icon: 'add-circle-outline', mutating: true },
        { actionId: 'dismiss', label: 'Dismiss', icon: 'close-circle-outline', mutating: true },
    ];
    fire(action) {
        this.popCardAction.emit({ actionId: action.actionId, params: action.params });
    }
    renderActions(frozen) {
        const actions = visibleActions(PopThreadCardTimer.ACTIONS, frozen ? 'frozen' : 'live', this.readonly);
        if (!actions.length)
            return null;
        return (h("div", { class: "tct__actions" }, actions.map((a) => (h("button", { key: a.actionId, class: "pop-iconbtn tct__btn", type: "button", title: a.label, "aria-label": a.label, onClick: () => this.fire(a) },
            h("ion-icon", { name: a.icon, "aria-hidden": "true" }))))));
    }
    renderCard() {
        const card = readCard(this.payload);
        if (!card.ok) {
            return h("div", { class: "tct tct--broken" }, CARD_FALLBACK_TEXT);
        }
        const data = card.data;
        const fireAt = typeof data.fireAt === 'number' && Number.isFinite(data.fireAt) ? data.fireAt : 0;
        const mode = data.mode === 'reminder' ? 'reminder' : 'timer';
        const label = typeof data.label === 'string' && data.label.trim() ? data.label.trim() : '';
        const frozen = this.liveness === 'frozen';
        const heading = card.title || label || (mode === 'reminder' ? 'Reminder' : 'Timer');
        return (h("div", { class: { tct: true, 'tct--frozen': frozen } },
            h("div", { class: "tct__head" },
                h("ion-icon", { class: "tct__glyph", name: mode === 'reminder' ? 'notifications-outline' : 'timer-outline', "aria-hidden": "true" }),
                h("div", { class: "tct__titles" },
                    h("span", { class: "tct__title" }, heading),
                    card.subtitle && h("span", { class: "tct__subtitle" }, card.subtitle)),
                h("span", { class: "tct__mode" }, mode)),
            h("div", { class: "tct__face" }, frozen ? (h("span", { class: "tct__fired" },
                h("ion-icon", { name: "checkmark-done-outline", "aria-hidden": "true" }),
                "Timer fired",
                typeof data.durationMs === 'number' && (h("span", { class: "tct__duration" },
                    " \u00B7 ",
                    formatDuration(data.durationMs))))) : fireAt ? (h("pop-countdown", { deadline: fireAt, overdueText: "due" })) : (h("span", { class: "tct__idle" }, "No time set"))),
            card.assignees.length > 0 && (h("div", { class: "tct__people" }, card.assignees.map((p) => (h("span", { key: p.uid || p.displayName, class: "tct__chip" }, p.displayName))))),
            this.renderActions(frozen)));
    }
    render() {
        // A single broken card must never blank the timeline it lives in.
        try {
            return this.renderCard();
        }
        catch {
            return h("div", { class: "tct tct--broken" }, CARD_FALLBACK_TEXT);
        }
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-thread-card-timer",
        "componentClassName": "PopThreadCardTimer",
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
                    "text": "`frozen` = historical snapshot: muted chrome, no mutating actions."
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
                "styleId": "POP-THREAD-CARD-TIMER",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/thread-card-timer/thread-card-timer.css",
                        "relativePath": "thread-card-timer.css",
                        "originalComponentPath": "thread-card-timer.css"
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
        "htmlAttrNames": ["class", "key", "type", "title", "aria-label", "onClick", "name", "aria-hidden", "deadline", "overdueText"],
        "htmlTagNames": ["div", "button", "ion-icon", "span", "pop-countdown"],
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
//# sourceMappingURL=thread-card-timer.js.map