import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopCafeteriaPanelStyle0 from "./ui-kit/organisms/cafeteria-panel/cafeteria-panel.css?tag=pop-cafeteria-panel&encapsulation=scoped";
export const PopCafeteriaPanel = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.actionSelected = __stencil_createEvent(this, "actionSelected", 7);
        this.contextSubmitted = __stencil_createEvent(this, "contextSubmitted", 7);
        this.panelToggled = __stencil_createEvent(this, "panelToggled", 7);
        this.cycleNpc = __stencil_createEvent(this, "cycleNpc", 7);
    }
    /** One-liner summary of the active NPC's request */
    summary = '';
    /** Full paragraph description */
    paragraph = '';
    /** NPC agent role (exploration, planning, codegen, orchestrator) */
    agentRole = '';
    /** NPC ID for display */
    npcId = '';
    /** Available food actions as JSON string (array of CafeteriaPanelAction) */
    actions = '[]';
    /** Queue position (1-indexed) */
    queuePosition = 0;
    /** Total queue size */
    queueTotal = 0;
    /** Whether game is paused (panel expanded) */
    paused = false;
    /** Review time in seconds */
    reviewTime = 0;
    /** Whether there's an active NPC at the counter */
    hasActiveNpc = false;
    parsedActions = [];
    chatText = '';
    expanded = false;
    /** Fired when the user clicks an action card */
    actionSelected;
    /** Fired when the user submits chat context */
    contextSubmitted;
    /** Fired when user toggles the expanded/paused state */
    panelToggled;
    /** Fired when user clicks Tab/cycle */
    cycleNpc;
    chatInputEl;
    parseActions() {
        try {
            this.parsedActions = JSON.parse(this.actions);
        }
        catch {
            this.parsedActions = [];
        }
    }
    componentWillLoad() {
        this.parseActions();
    }
    handleActionClick(key) {
        this.actionSelected.emit({ key });
    }
    handleChatSubmit() {
        const text = this.chatText.trim();
        if (!text)
            return;
        this.chatText = '';
        this.contextSubmitted.emit({ text });
    }
    handleChatKeyDown(e) {
        e.stopPropagation(); // prevent game from eating keys
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleChatSubmit();
        }
    }
    toggleExpanded() {
        this.expanded = !this.expanded;
        this.paused = this.expanded;
        this.panelToggled.emit({ expanded: this.expanded });
    }
    handleCycleClick() {
        this.cycleNpc.emit();
    }
    /** Public method to toggle expanded state (called from game) */
    async toggle() {
        this.toggleExpanded();
    }
    /** Public method to set chat text (for autoplay typing animation) */
    async setChatText(text) {
        this.chatText = text;
    }
    /** Public method to focus the chat input */
    async focusChat() {
        if (!this.expanded) {
            this.toggleExpanded();
        }
        this.chatInputEl?.focus();
    }
    getRoleColor(role) {
        switch (role) {
            case 'exploration': return '#3498db';
            case 'planning': return '#9b59b6';
            case 'codegen': return '#2ecc71';
            case 'orchestrator': return '#e67e22';
            default: return '#888';
        }
    }
    getRoleLabel(role) {
        switch (role) {
            case 'exploration': return 'Explorer';
            case 'planning': return 'Architect';
            case 'codegen': return 'Developer';
            case 'orchestrator': return 'Manager';
            default: return 'Agent';
        }
    }
    render() {
        if (!this.hasActiveNpc) {
            return (h("div", { class: "cp-empty" },
                h("span", { class: "cp-empty-text" }, "Waiting for agents to arrive at the counter...")));
        }
        const roleColor = this.getRoleColor(this.agentRole);
        const roleLabel = this.getRoleLabel(this.agentRole);
        return (h("div", { class: { 'cp-container': true, 'cp-expanded': this.expanded } },
            h("div", { class: "cp-header", onClick: () => this.toggleExpanded() },
                h("div", { class: "cp-header-left" },
                    h("span", { class: "cp-role-dot", style: { background: roleColor } }),
                    h("span", { class: "cp-role-label" }, roleLabel),
                    h("span", { class: "cp-npc-id" }, this.npcId),
                    h("span", { class: "cp-queue-info" },
                        "(",
                        this.queuePosition,
                        "/",
                        this.queueTotal,
                        ")"),
                    h("button", { class: "cp-cycle-btn", onClick: (e) => { e.stopPropagation(); this.handleCycleClick(); }, title: "Next NPC (Tab)" }, "Tab \u2192")),
                h("div", { class: "cp-header-right" },
                    this.expanded && this.reviewTime > 0 && (h("span", { class: "cp-review-timer" },
                        "Review: ",
                        this.reviewTime,
                        "s")),
                    this.expanded && h("span", { class: "cp-paused-badge" }, "PAUSED"),
                    h("span", { class: "cp-expand-hint" }, this.expanded ? '\u25BC Close' : '\u25B2 Details [D]'))),
            h("div", { class: "cp-summary" }, this.summary),
            this.expanded && (h("div", { class: "cp-details" },
                this.paragraph && (h("div", { class: "cp-paragraph" }, this.paragraph)),
                h("div", { class: "cp-actions" }, this.parsedActions
                    .filter(a => a.key !== 2) // "Add Context" is the chat input, not a card
                    .map(action => (h("div", { class: "cp-action-row", onClick: () => this.handleActionClick(action.key) },
                    h("span", { class: "cp-action-emoji" }, action.emoji),
                    h("span", { class: "cp-action-key" }, action.key),
                    h("span", { class: "cp-action-title" }, action.title),
                    h("span", { class: "cp-action-desc" },
                        "\u2014 ",
                        action.description))))),
                h("div", { class: "cp-chat" },
                    h("textarea", { ref: el => this.chatInputEl = el, class: "cp-chat-input", rows: 2, placeholder: "Add context... [Enter to send]", value: this.chatText, onInput: (e) => this.chatText = e.target.value, onKeyDown: (e) => this.handleChatKeyDown(e) }))))));
    }
    static get watchers() { return {
        "actions": [{
                "parseActions": 0
            }]
    }; }
    static get style() { return PopCafeteriaPanelStyle0(); }
};
__stencil_proxyCustomElement(PopCafeteriaPanel, [514, "pop-cafeteria-panel", {
        "summary": [1],
        "paragraph": [1],
        "agentRole": [1, "agent-role"],
        "npcId": [1, "npc-id"],
        "actions": [1],
        "queuePosition": [2, "queue-position"],
        "queueTotal": [2, "queue-total"],
        "paused": [1540],
        "reviewTime": [2, "review-time"],
        "hasActiveNpc": [4, "has-active-npc"],
        "parsedActions": [32],
        "chatText": [32],
        "expanded": [32],
        "toggle": [64],
        "setChatText": [64],
        "focusChat": [64]
    }, undefined, {
        "actions": [{
                "parseActions": 0
            }]
    }]);
//# sourceMappingURL=cafeteria-panel.js.map