import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopIntentActionsStyle0 from "./ui-kit/organisms/intent-actions/intent-actions.css?tag=pop-intent-actions&encapsulation=scoped";
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
    static get watchers() { return {
        "intents": [{
                "onIntentsChange": 0
            }],
        "otherIntents": [{
                "onOtherIntentsChange": 0
            }]
    }; }
};
PopIntentActions.style = PopIntentActionsStyle0();
//# sourceMappingURL=intent-actions.js.map