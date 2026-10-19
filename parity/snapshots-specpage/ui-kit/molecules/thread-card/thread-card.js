import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
import { CARD_FALLBACK_TEXT, readAssignees, readCard, visibleActions, } from './thread-card-types';
export const PopThreadCard = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popCardAction = __stencil_createEvent(this, "popCardAction", 7);
    }
    /** The card's type key (`timer`, `task`, …). Shown as the chrome's type label. */
    cardType = '';
    /**
     * The validated card payload object (set as a PROPERTY, not an attribute).
     * Optional on purpose: a missing or broken payload is a supported state that
     * renders the fallback face, so hosts never have to pre-validate.
     */
    payload;
    /** `frozen` = historical snapshot: muted chrome, mutating actions dropped. */
    liveness = 'live';
    /** Wrapper-level actions, before liveness/readonly filtering. */
    actions = [];
    /** People the card is assigned to; falls back to `payload.assignees`. */
    assignees = [];
    /** Viewer / public render — no action buttons at all. */
    readonly = false;
    /** The `pop-*` tag to mount inside. Unknown/missing ⇒ fallback face. */
    renderer;
    /**
     * Emitted when one of the WRAPPER's actions is tapped.
     *
     * The inner renderer emits its own `popCardAction` with
     * `{ composed: true, bubbles: true }`, so renderer actions reach the same
     * listener by natural propagation — the wrapper deliberately does not
     * intercept and re-dispatch them, which would double-fire every action.
     */
    popCardAction;
    /** Only a real custom-element tag in our namespace may be mounted. */
    rendererTag() {
        const tag = typeof this.renderer === 'string' ? this.renderer.trim().toLowerCase() : '';
        return /^pop-[a-z0-9-]+$/.test(tag) ? tag : '';
    }
    /** Push the object props onto the dynamically-created renderer element. */
    hydrate = (el) => {
        if (!el)
            return;
        const target = el;
        target.payload = this.payload;
        target.liveness = this.liveness;
        target.readonly = this.readonly;
    };
    fire(action) {
        this.popCardAction.emit({ actionId: action.actionId, params: action.params });
    }
    renderChips(people) {
        if (!people.length)
            return null;
        return (h("div", { class: "tcw__people" }, people.map((p) => (h("span", { key: p.uid || p.displayName, class: "tcw__chip" }, p.displayName)))));
    }
    renderActions() {
        const actions = visibleActions(Array.isArray(this.actions) ? this.actions : [], this.liveness, this.readonly);
        if (!actions.length)
            return null;
        return (h("div", { class: "tcw__actions" }, actions.map((a) => (h("button", { key: a.actionId, class: "pop-iconbtn tcw__btn", type: "button", title: a.label, "aria-label": a.label, onClick: () => this.fire(a) },
            h("ion-icon", { name: a.icon, "aria-hidden": "true" }))))));
    }
    renderCard() {
        const card = readCard(this.payload);
        const frozen = this.liveness === 'frozen';
        const tag = this.rendererTag();
        const people = readAssignees(this.assignees).length
            ? readAssignees(this.assignees)
            : card.assignees;
        const Renderer = tag;
        return (h("div", { class: { tcw: true, 'tcw--frozen': frozen, 'tcw--readonly': this.readonly } },
            h("div", { class: "tcw__head" },
                h("div", { class: "tcw__titles" },
                    h("span", { class: "tcw__title" }, card.title || 'Card'),
                    card.subtitle && h("span", { class: "tcw__subtitle" }, card.subtitle)),
                this.cardType && h("span", { class: "tcw__type" }, this.cardType),
                frozen && (h("span", { class: "tcw__frozen", title: "Historical snapshot" },
                    h("ion-icon", { name: "snow-outline", "aria-hidden": "true" }),
                    "frozen"))),
            h("div", { class: "tcw__body" }, tag && card.ok ? (h(Renderer, { class: "tcw__renderer", ref: this.hydrate })) : (h("p", { class: "tcw__fallback" }, CARD_FALLBACK_TEXT))),
            this.renderChips(people),
            this.renderActions()));
    }
    render() {
        // A single broken card must never blank the timeline it lives in.
        try {
            return this.renderCard();
        }
        catch {
            return h("div", { class: "tcw tcw--broken" }, CARD_FALLBACK_TEXT);
        }
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-thread-card",
        "componentClassName": "PopThreadCard",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "cardType",
                "type": "string",
                "attribute": "card-type",
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
                    "text": "The card's type key (`timer`, `task`, \u2026). Shown as the chrome's type label."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "payload",
                "type": "any",
                "attribute": "payload",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "CardPayload",
                    "resolved": "any",
                    "references": {
                        "CardPayload": {
                            "location": "global",
                            "id": "global::CardPayload"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "The validated card payload object (set as a PROPERTY, not an attribute).\nOptional on purpose: a missing or broken payload is a supported state that\nrenders the fallback face, so hosts never have to pre-validate."
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
                    "text": "`frozen` = historical snapshot: muted chrome, mutating actions dropped."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "actions",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "CardAction[]",
                    "resolved": "CardAction[]",
                    "references": {
                        "CardAction": {
                            "location": "global",
                            "id": "global::CardAction"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Wrapper-level actions, before liveness/readonly filtering."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "assignees",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "CardAssignee[]",
                    "resolved": "CardAssignee[]",
                    "references": {
                        "CardAssignee": {
                            "location": "global",
                            "id": "global::CardAssignee"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "People the card is assigned to; falls back to `payload.assignees`."
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
            }, {
                "name": "renderer",
                "type": "string",
                "attribute": "renderer",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "string",
                    "resolved": "string | undefined",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The `pop-*` tag to mount inside. Unknown/missing \u21D2 fallback face."
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
                    "text": "Emitted when one of the WRAPPER's actions is tapped.\n\nThe inner renderer emits its own `popCardAction` with\n`{ composed: true, bubbles: true }`, so renderer actions reach the same\nlistener by natural propagation \u2014 the wrapper deliberately does not\nintercept and re-dispatch them, which would double-fire every action."
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
                "styleId": "POP-THREAD-CARD",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/thread-card/thread-card.css",
                        "relativePath": "thread-card.css",
                        "originalComponentPath": "thread-card.css"
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
        "hasVdomFunctional": true,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": true,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["class", "key", "type", "title", "aria-label", "onClick", "name", "aria-hidden", "ref"],
        "htmlTagNames": ["div", "span", "button", "ion-icon", "p"],
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
//# sourceMappingURL=thread-card.js.map