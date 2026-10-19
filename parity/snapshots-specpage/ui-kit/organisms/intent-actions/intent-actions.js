import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopIntentActions = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.intentsConfirm = __stencil_createEvent(this, "intentsConfirm", 7);
        this.intentsDismiss = __stencil_createEvent(this, "intentsDismiss", 7);
    }
    /** JSON string of ParsedIntent[] — recommended items (checked by default) */
    intents = '[]';
    /** JSON string of ParsedIntent[] — other/supplemental items (unchecked by default) */
    otherIntents = '[]';
    /** Goal statement from AI goal inference */
    goal = '';
    /** Plan summary from AI */
    summary = '';
    /** Emitted when user confirms selected intents — detail is accepted ParsedIntent[] */
    intentsConfirm;
    /** Emitted when user dismisses the sheet */
    intentsDismiss;
    recommendedItems = [];
    otherItems = [];
    otherExpanded = false;
    onIntentsChange(val) {
        this.recommendedItems = this.parseList(val, 'accepted');
    }
    onOtherIntentsChange(val) {
        this.otherItems = this.parseList(val, 'rejected');
    }
    componentWillLoad() {
        this.recommendedItems = this.parseList(this.intents, 'accepted');
        this.otherItems = this.parseList(this.otherIntents, 'rejected');
    }
    parseList(raw, defaultState) {
        try {
            const parsed = JSON.parse(raw);
            return parsed.map((i) => ({ ...i, state: defaultState }));
        }
        catch {
            return [];
        }
    }
    toggle(id, list) {
        if (list === 'recommended') {
            this.recommendedItems = this.recommendedItems.map((item) => item.id === id
                ? { ...item, state: item.state === 'rejected' ? 'accepted' : 'rejected' }
                : item);
        }
        else {
            this.otherItems = this.otherItems.map((item) => item.id === id
                ? { ...item, state: item.state === 'accepted' ? 'rejected' : 'accepted' }
                : item);
        }
    }
    confirm() {
        const accepted = [
            ...this.recommendedItems.filter((i) => i.state === 'accepted'),
            ...this.otherItems.filter((i) => i.state === 'accepted'),
        ];
        this.intentsConfirm.emit(accepted);
    }
    get acceptedCount() {
        return (this.recommendedItems.filter((i) => i.state === 'accepted').length +
            this.otherItems.filter((i) => i.state === 'accepted').length);
    }
    intentIcon(type) {
        const map = {
            task: '✓',
            event: '📅',
            note: '📝',
            research: '🔬',
            quest: '🗺️',
            unknown: '?',
        };
        return map[type] ?? '?';
    }
    intentLabel(type) {
        const map = {
            task: 'Task',
            event: 'Event',
            note: 'Note',
            research: 'Research',
            quest: 'Quest',
            unknown: 'Item',
        };
        return map[type] ?? 'Item';
    }
    intentAccentColor(type) {
        const map = {
            task: '#3b82f6',
            event: '#22c55e',
            note: '#f59e0b',
            research: '#a855f7',
            quest: '#ec4899',
            unknown: '#6b7280',
        };
        return map[type] ?? '#6b7280';
    }
    renderItem(item, list) {
        const isActive = item.state === 'accepted';
        return (h("li", { key: item.id, class: {
                'ia-item': true,
                'ia-item--active': isActive,
                'ia-item--rejected': !isActive,
            }, style: { '--intent-color': this.intentAccentColor(item.type) } },
            h("button", { class: "ia-checkbox", type: "button", onClick: () => this.toggle(item.id, list), "aria-label": isActive ? 'Exclude this action' : 'Include this action', "aria-pressed": String(isActive) }, isActive ? '✓' : ''),
            h("div", { class: "ia-item-body" },
                h("div", { class: "ia-item-type" },
                    h("span", { class: "ia-type-icon" }, this.intentIcon(item.type)),
                    h("span", { class: "ia-type-label" }, this.intentLabel(item.type))),
                h("div", { class: "ia-item-label" }, item.label))));
    }
    render() {
        const count = this.acceptedCount;
        const hasOther = this.otherItems.length > 0;
        const totalItems = this.recommendedItems.length + this.otherItems.length;
        if (totalItems === 0) {
            return (h("div", { class: "ia-root" },
                h("p", { class: "ia-empty" }, "No actions detected in this conversation."),
                h("div", { class: "ia-footer" },
                    h("button", { class: "ia-btn ia-btn--ghost", type: "button", onClick: () => this.intentsDismiss.emit() }, "Dismiss"))));
        }
        return (h("div", { class: "ia-root" },
            this.goal && (h("div", { class: "ia-goal" },
                h("span", { class: "ia-goal-icon" }, "\uD83C\uDFAF"),
                h("span", { class: "ia-goal-text" }, this.goal))),
            this.summary && h("p", { class: "ia-summary" }, this.summary),
            this.recommendedItems.length > 0 && (h("div", { class: "ia-section" },
                h("div", { class: "ia-section-header" },
                    h("span", { class: "ia-section-label" }, "Recommended"),
                    h("span", { class: "ia-section-count" }, this.recommendedItems.filter(i => i.state === 'accepted').length)),
                h("ul", { class: "ia-list" }, this.recommendedItems.map((item) => this.renderItem(item, 'recommended'))))),
            hasOther && (h("details", { class: "ia-other-section", open: this.otherExpanded, onToggle: (e) => { this.otherExpanded = e.target.open; } },
                h("summary", { class: "ia-other-toggle" },
                    h("span", { class: "ia-other-chevron" }, this.otherExpanded ? '▾' : '▸'),
                    "Other actions (",
                    this.otherItems.length,
                    ")"),
                h("ul", { class: "ia-list ia-list--other" }, this.otherItems.map((item) => this.renderItem(item, 'other'))))),
            h("div", { class: "ia-footer" },
                h("button", { class: "ia-btn ia-btn--confirm", type: "button", disabled: count === 0, onClick: () => this.confirm() },
                    "Save ",
                    count > 0 ? `${count} ` : '',
                    "action",
                    count !== 1 ? 's' : ''),
                h("button", { class: "ia-btn ia-btn--ghost", type: "button", onClick: () => this.intentsDismiss.emit() }, "Dismiss"))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-intent-actions",
        "componentClassName": "PopIntentActions",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "intents",
                "type": "string",
                "attribute": "intents",
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
                    "text": "JSON string of ParsedIntent[] \u2014 recommended items (checked by default)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "otherIntents",
                "type": "string",
                "attribute": "other-intents",
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
                    "text": "JSON string of ParsedIntent[] \u2014 other/supplemental items (unchecked by default)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "goal",
                "type": "string",
                "attribute": "goal",
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
                    "text": "Goal statement from AI goal inference"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "summary",
                "type": "string",
                "attribute": "summary",
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
                    "text": "Plan summary from AI"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "recommendedItems"
            }, {
                "name": "otherItems"
            }, {
                "name": "otherExpanded"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "intentsConfirm",
                "method": "intentsConfirm",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when user confirms selected intents \u2014 detail is accepted ParsedIntent[]"
                },
                "complexType": {
                    "original": "ParsedIntent[]",
                    "resolved": "ParsedIntent[]",
                    "references": {
                        "ParsedIntent": {
                            "location": "local",
                            "path": "ui-kit/organisms/intent-actions/intent-actions.tsx",
                            "id": "ui-kit/organisms/intent-actions/intent-actions.tsx::ParsedIntent"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "intentsDismiss",
                "method": "intentsDismiss",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when user dismisses the sheet"
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "intents",
                "methodName": "onIntentsChange",
                "handlerOptions": undefined
            }, {
                "propName": "otherIntents",
                "methodName": "onOtherIntentsChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-INTENT-ACTIONS",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/intent-actions/intent-actions.css",
                        "relativePath": "intent-actions.css",
                        "originalComponentPath": "intent-actions.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": true,
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
        "hasLifecycle": true,
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
        "hasPropBoolean": false,
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
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "style", "type", "onClick", "aria-label", "aria-pressed", "open", "onToggle", "disabled"],
        "htmlTagNames": ["li", "button", "div", "span", "p", "ul", "details", "summary"],
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
    static get watchers() { return {
        "intents": [{
                "onIntentsChange": 0
            }],
        "otherIntents": [{
                "onOtherIntentsChange": 0
            }]
    }; }
};
//# sourceMappingURL=intent-actions.js.map