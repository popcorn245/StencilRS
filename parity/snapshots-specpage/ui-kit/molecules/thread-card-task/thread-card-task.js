import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
import { CARD_FALLBACK_TEXT, readCard, visibleActions, } from '../thread-card/thread-card-types';
export const PopThreadCardTask = class {
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
    actionsFor(taskId) {
        const params = taskId ? { taskId } : undefined;
        return [
            { actionId: 'complete', label: 'Complete', icon: 'checkmark-circle-outline', mutating: true, params },
            { actionId: 'reassign', label: 'Reassign', icon: 'people-outline', mutating: true, params },
            { actionId: 'open', label: 'Open in Tasks', icon: 'open-outline', mutating: false, params },
        ];
    }
    fire(action) {
        this.popCardAction.emit({ actionId: action.actionId, params: action.params });
    }
    /** "Aug 3" / the raw string when it isn't parseable. Never throws. */
    static due(raw) {
        if (typeof raw !== 'string' || !raw.trim())
            return '';
        const ms = Date.parse(raw);
        if (Number.isNaN(ms))
            return raw.trim();
        return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    renderActions(frozen, taskId) {
        const actions = visibleActions(this.actionsFor(taskId), frozen ? 'frozen' : 'live', this.readonly);
        if (!actions.length)
            return null;
        return (h("div", { class: "tcta__actions" }, actions.map((a) => (h("button", { key: a.actionId, class: "pop-iconbtn tcta__btn", type: "button", title: a.label, "aria-label": a.label, onClick: () => this.fire(a) },
            h("ion-icon", { name: a.icon, "aria-hidden": "true" }))))));
    }
    renderCard() {
        const card = readCard(this.payload);
        if (!card.ok) {
            return h("div", { class: "tcta tcta--broken" }, CARD_FALLBACK_TEXT);
        }
        const data = card.data;
        const taskId = typeof data.taskId === 'string' ? data.taskId : '';
        const status = typeof data.status === 'string' ? data.status : '';
        const priority = typeof data.priority === 'string' && data.priority.trim() ? data.priority.trim() : '';
        const quest = typeof data.questTitle === 'string' && data.questTitle.trim() ? data.questTitle.trim() : '';
        const due = PopThreadCardTask.due(data.dueDate);
        const frozen = this.liveness === 'frozen';
        const title = card.title || 'Untitled task';
        return (h("div", { class: { tcta: true, 'tcta--frozen': frozen } },
            h("div", { class: "tcta__head" },
                h("ion-icon", { class: "tcta__glyph", name: frozen ? 'checkmark-circle' : 'ellipse-outline', "aria-hidden": "true" }),
                h("div", { class: "tcta__titles" },
                    h("span", { class: "tcta__title" }, title),
                    (card.subtitle || quest) && h("span", { class: "tcta__subtitle" }, card.subtitle || quest))),
            h("div", { class: "tcta__meta" },
                due && (h("span", { class: "tcta__chip tcta__chip--due" },
                    h("ion-icon", { name: "calendar-outline", "aria-hidden": "true" }),
                    due)),
                priority && h("span", { class: "tcta__chip tcta__chip--priority" }, priority),
                status && h("span", { class: "tcta__chip tcta__chip--status" }, status),
                card.assignees.map((p) => (h("span", { key: p.uid || p.displayName, class: "tcta__chip tcta__chip--person" }, p.displayName)))),
            this.renderActions(frozen, taskId)));
    }
    render() {
        // A single broken card must never blank the timeline it lives in.
        try {
            return this.renderCard();
        }
        catch {
            return h("div", { class: "tcta tcta--broken" }, CARD_FALLBACK_TEXT);
        }
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-thread-card-task",
        "componentClassName": "PopThreadCardTask",
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
                "styleId": "POP-THREAD-CARD-TASK",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/thread-card-task/thread-card-task.css",
                        "relativePath": "thread-card-task.css",
                        "originalComponentPath": "thread-card-task.css"
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
        "htmlTagNames": ["div", "button", "ion-icon", "span"],
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
//# sourceMappingURL=thread-card-task.js.map