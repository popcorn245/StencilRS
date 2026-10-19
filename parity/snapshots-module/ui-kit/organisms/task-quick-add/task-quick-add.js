import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopTaskQuickAddStyle0 from "./ui-kit/organisms/task-quick-add/task-quick-add.css?tag=pop-task-quick-add&encapsulation=scoped";
export const PopTaskQuickAdd = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.taskCreate = __stencil_createEvent(this, "taskCreate", 7);
        this.quickAddClose = __stencil_createEvent(this, "quickAddClose", 7);
    }
    get el() { return this; }
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
    static get watchers() { return {
        "quests": [{
                "onQuestsChange": 0
            }],
        "open": [{
                "onOpenChange": 0
            }]
    }; }
    static get style() { return PopTaskQuickAddStyle0(); }
};
__stencil_proxyCustomElement(PopTaskQuickAdd, [514, "pop-task-quick-add", {
        "open": [1540],
        "quests": [1],
        "defaultQuestId": [1, "default-quest-id"],
        "mentionSources": [8, "mention-sources"],
        "title": [32],
        "dueDate": [32],
        "questId": [32],
        "validationError": [32]
    }, undefined, {
        "quests": [{
                "onQuestsChange": 0
            }],
        "open": [{
                "onOpenChange": 0
            }]
    }]);
//# sourceMappingURL=task-quick-add.js.map