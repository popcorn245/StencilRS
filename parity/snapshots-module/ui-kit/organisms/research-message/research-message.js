import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { marked } from 'marked';
import PopResearchMessageStyle0 from "./ui-kit/organisms/research-message/research-message.css?tag=pop-research-message&encapsulation=scoped";
export const PopResearchMessage = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    /** Who sent the message */
    role = 'user';
    /** Message text content (may stream in) */
    content = '';
    /** Whether the message is still streaming */
    streaming = false;
    /** Avatar URL for user messages */
    avatarUrl = '';
    /** Avatar initials fallback */
    avatarInitials = '';
    /** JSON string of IntentChip[] — shown on assistant messages after streaming */
    intents = '[]';
    parsedIntents = [];
    onIntentsChange(val) {
        try {
            this.parsedIntents = JSON.parse(val);
        }
        catch {
            this.parsedIntents = [];
        }
    }
    componentWillLoad() {
        try {
            this.parsedIntents = JSON.parse(this.intents);
        }
        catch {
            this.parsedIntents = [];
        }
    }
    intentColor(type) {
        const map = {
            task: '#3b82f6',
            event: '#22c55e',
            note: '#f59e0b',
            research: '#a855f7',
            quest: '#ec4899',
            unknown: '#6b7280',
        };
        return map[type] ?? map.unknown;
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
    render() {
        const isUser = this.role === 'user';
        return (h("div", { key: '0', class: { 'rm-root': true, 'rm-role--user': isUser, 'rm-role--assistant': !isUser } },
            isUser && (h("div", { key: '1', class: "rm-avatar" }, this.avatarUrl ? (h("img", { src: this.avatarUrl, alt: "", class: "rm-avatar-img" })) : (h("div", { class: "rm-avatar-fallback" }, this.avatarInitials.slice(0, 2).toUpperCase())))),
            h("div", { key: '2', class: "rm-body" },
                h("div", { key: '3', class: { 'rm-bubble': true, 'rm-bubble--streaming': this.streaming }, innerHTML: marked.parse(this.content || (this.streaming ? '' : '…')) }),
                this.streaming && h("span", { key: '4', class: "rm-cursor", "aria-hidden": "true" }),
                !isUser && !this.streaming && this.parsedIntents.length > 0 && (h("div", { key: '5', class: "rm-intents", role: "list", "aria-label": "Detected intents" }, this.parsedIntents.map((chip, i) => (h("span", { key: i, class: "rm-chip", role: "listitem", style: { '--chip-color': this.intentColor(chip.type) }, title: chip.type },
                    h("span", { class: "rm-chip-icon", "aria-hidden": "true" }, this.intentIcon(chip.type)),
                    chip.label))))))));
    }
    static get watchers() { return {
        "intents": [{
                "onIntentsChange": 0
            }]
    }; }
    static get style() { return PopResearchMessageStyle0(); }
};
__stencil_proxyCustomElement(PopResearchMessage, [514, "pop-research-message", {
        "role": [1],
        "content": [1],
        "streaming": [4],
        "avatarUrl": [1, "avatar-url"],
        "avatarInitials": [1, "avatar-initials"],
        "intents": [1],
        "parsedIntents": [32]
    }, undefined, {
        "intents": [{
                "onIntentsChange": 0
            }]
    }]);
//# sourceMappingURL=research-message.js.map