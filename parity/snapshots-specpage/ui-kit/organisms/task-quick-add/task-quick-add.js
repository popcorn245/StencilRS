import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopTaskQuickAdd = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.taskCreate = __stencil_createEvent(this, "taskCreate", 7);
        this.quickAddClose = __stencil_createEvent(this, "quickAddClose", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Controls visibility */
    open = false;
    /** JSON array of {id, emoji, title} */
    quests = '[]';
    /** Pre-selected quest (when opened from quest detail) */
    defaultQuestId = null;
    /**
     * Optional mention sources keyed by group. When provided, the title input
     * is replaced by `<pop-mention-input>` so users can `@`-mention people /
     * `#`-tag etc. When absent, the existing plain-text input is rendered.
     */
    mentionSources;
    /** User submitted the form */
    taskCreate;
    /** Popover dismissed */
    quickAddClose;
    title = '';
    dueDate = '';
    questId = '';
    validationError = '';
    titleInput;
    parsedQuests = [];
    componentWillLoad() {
        this.parseQuests();
    }
    onQuestsChange() {
        this.parseQuests();
    }
    onOpenChange(isOpen) {
        if (isOpen) {
            this.title = '';
            this.dueDate = '';
            this.questId = this.defaultQuestId || '';
            this.validationError = '';
            requestAnimationFrame(() => {
                this.titleInput?.focus();
            });
        }
    }
    parseQuests() {
        try {
            this.parsedQuests = JSON.parse(this.quests);
        }
        catch {
            this.parsedQuests = [];
        }
    }
    handleSubmit = (e) => {
        e.preventDefault();
        const trimmedTitle = this.title.trim();
        if (!trimmedTitle) {
            this.validationError = 'Title is required';
            this.titleInput?.focus();
            return;
        }
        this.taskCreate.emit({
            title: trimmedTitle,
            dueDate: this.dueDate || null,
            questId: this.questId || null,
        });
        this.open = false;
        this.quickAddClose.emit();
    };
    handleDismiss = () => {
        this.open = false;
        this.quickAddClose.emit();
    };
    handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            this.handleDismiss();
        }
    };
    handleBackdropClick = (e) => {
        if (e.target.classList.contains('tqa-backdrop')) {
            this.handleDismiss();
        }
    };
    flatMentionSources() {
        if (!this.mentionSources)
            return [];
        const out = [];
        for (const arr of Object.values(this.mentionSources)) {
            for (const s of arr)
                out.push(s);
        }
        return out;
    }
    render() {
        if (!this.open)
            return null;
        const useMention = !!this.mentionSources && Object.keys(this.mentionSources).length > 0;
        return (h("div", { class: "tqa-backdrop", onClick: this.handleBackdropClick, onKeyDown: this.handleKeyDown },
            h("div", { class: "tqa-popover", role: "dialog", "aria-modal": "true", "aria-label": "Quick add task" },
                h("form", { class: "tqa-form", onSubmit: this.handleSubmit },
                    useMention ? (h("pop-mention-input", { class: { 'tqa-mention': true, 'tqa-input--error': !!this.validationError }, placeholder: "What needs doing?", sources: this.flatMentionSources(), onValueChanged: (e) => {
                            this.title = (e.detail?.text || '').trim();
                            if (this.validationError)
                                this.validationError = '';
                        }, onSubmitted: (e) => {
                            this.title = (e.detail?.text || '').trim();
                            const evt = document.createEvent('Event');
                            evt.initEvent('submit', false, true);
                            this.handleSubmit(evt);
                        } })) : (h("input", { type: "text", class: { 'tqa-input': true, 'tqa-input--error': !!this.validationError }, placeholder: "What needs doing?", value: this.title, onInput: (e) => {
                            this.title = e.target.value;
                            if (this.validationError)
                                this.validationError = '';
                        }, ref: el => { this.titleInput = el; }, autocomplete: "off" })),
                    this.validationError && (h("span", { class: "tqa-error" }, this.validationError)),
                    h("div", { class: "tqa-row" },
                        h("input", { type: "date", class: "tqa-date", value: this.dueDate, onInput: (e) => { this.dueDate = e.target.value; } }),
                        h("select", { class: "tqa-quest-select", onChange: (e) => { this.questId = e.target.value; } },
                            h("option", { value: "", selected: !this.questId }, "Inbox"),
                            this.parsedQuests.map(q => (h("option", { value: q.id, selected: this.questId === q.id },
                                q.emoji,
                                " ",
                                q.title))))),
                    h("button", { type: "submit", class: "tqa-submit" }, "Add Task")))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-task-quick-add",
        "componentClassName": "PopTaskQuickAdd",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "open",
                "type": "boolean",
                "attribute": "open",
                "reflect": true,
                "mutable": true,
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
                    "text": "Controls visibility"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "quests",
                "type": "string",
                "attribute": "quests",
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
                    "text": "JSON array of {id, emoji, title}"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "defaultQuestId",
                "type": "string",
                "attribute": "default-quest-id",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "null",
                "complexType": {
                    "original": "string | null",
                    "resolved": "null | string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Pre-selected quest (when opened from quest detail)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "mentionSources",
                "type": "any",
                "attribute": "mention-sources",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": true,
                "defaultValue": undefined,
                "complexType": {
                    "original": "Record<string, MentionSource[]>",
                    "resolved": "any",
                    "references": {
                        "Record": {
                            "location": "global",
                            "id": "global::Record"
                        },
                        "MentionSource": {
                            "location": "global",
                            "id": "global::MentionSource"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Optional mention sources keyed by group. When provided, the title input\nis replaced by `<pop-mention-input>` so users can `@`-mention people /\n`#`-tag etc. When absent, the existing plain-text input is rendered."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "title"
            }, {
                "name": "dueDate"
            }, {
                "name": "questId"
            }, {
                "name": "validationError"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "taskCreate",
                "method": "taskCreate",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "User submitted the form"
                },
                "complexType": {
                    "original": "{ title: string; dueDate: string | null; questId: string | null }",
                    "resolved": "{ title: string; dueDate: string | null; questId: string | null; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "quickAddClose",
                "method": "quickAddClose",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Popover dismissed"
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "quests",
                "methodName": "onQuestsChange",
                "handlerOptions": undefined
            }, {
                "propName": "open",
                "methodName": "onOpenChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-TASK-QUICK-ADD",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/task-quick-add/task-quick-add.css",
                        "relativePath": "task-quick-add.css",
                        "originalComponentPath": "task-quick-add.css"
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
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": true,
        "hasReflect": true,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": false,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": true,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "onClick", "onKeyDown", "role", "aria-modal", "aria-label", "onSubmit", "placeholder", "sources", "onValueChanged", "onSubmitted", "type", "value", "onInput", "ref", "autocomplete", "onChange", "selected"],
        "htmlTagNames": ["div", "form", "pop-mention-input", "input", "span", "select", "option", "button"],
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
        "quests": [{
                "onQuestsChange": 0
            }],
        "open": [{
                "onOpenChange": 0
            }]
    }; }
};
//# sourceMappingURL=task-quick-add.js.map