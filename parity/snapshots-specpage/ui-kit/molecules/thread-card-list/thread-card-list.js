import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
import { CARD_FALLBACK_TEXT, readCard, visibleActions, } from '../thread-card/thread-card-types';
export const PopThreadCardList = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-thread-card-list",
        "componentClassName": "PopThreadCardList",
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
                    "text": "`frozen` = historical snapshot: muted chrome, read-only lines."
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
                    "text": "Viewer / public render \u2014 no action buttons, no line taps."
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
                    "text": "Emitted when the user taps a line or one of the card's actions."
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
                "styleId": "POP-THREAD-CARD-LIST",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/thread-card-list/thread-card-list.css",
                        "relativePath": "thread-card-list.css",
                        "originalComponentPath": "thread-card-list.css"
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
        "htmlAttrNames": ["class", "key", "type", "title", "aria-label", "onClick", "name", "aria-hidden", "aria-pressed"],
        "htmlTagNames": ["div", "button", "ion-icon", "span", "p", "ul", "li"],
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
//# sourceMappingURL=thread-card-list.js.map