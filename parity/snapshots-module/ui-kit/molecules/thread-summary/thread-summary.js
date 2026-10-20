import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopThreadSummaryStyle0 from "./ui-kit/molecules/thread-summary/thread-summary.css?tag=pop-thread-summary&encapsulation=scoped";
export const PopThreadSummary = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popThreadOpened = __stencil_createEvent(this, "popThreadOpened", 7);
    }
    messageId = '';
    threadCount = 0;
    threadPreview = '';
    threadAvatarUrl = '';
    threadLastAt = 0;
    popThreadOpened;
    formatShortTime(ts) {
        if (!ts)
            return '';
        const date = new Date(ts);
        const diff = (Date.now() - date.getTime()) / 1000;
        if (diff < 60)
            return 'Just now';
        if (diff < 3600)
            return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400)
            return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800)
            return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString();
    }
    render() {
        if (this.threadCount <= 0)
            return null;
        return (h("div", { class: "mb-thread-summary", onClick: () => this.popThreadOpened.emit({ id: this.messageId }) },
            h("div", { class: "mb-thread-spine" }),
            h("div", { class: "mb-thread-info" },
                this.threadAvatarUrl && (h("img", { src: this.threadAvatarUrl, alt: "", class: "mb-thread-avatar" })),
                h("span", { class: "mb-thread-preview" }, this.threadPreview || 'Thread reply...'),
                this.threadLastAt > 0 && (h("span", { class: "mb-thread-time" }, this.formatShortTime(this.threadLastAt))))));
    }
    static get style() { return PopThreadSummaryStyle0(); }
};
__stencil_proxyCustomElement(PopThreadSummary, [514, "pop-thread-summary", {
        "messageId": [1, "message-id"],
        "threadCount": [2, "thread-count"],
        "threadPreview": [1, "thread-preview"],
        "threadAvatarUrl": [1, "thread-avatar-url"],
        "threadLastAt": [2, "thread-last-at"]
    }]);
//# sourceMappingURL=thread-summary.js.map