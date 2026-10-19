import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopThreadSummaryStyle0 from "./ui-kit/molecules/thread-summary/thread-summary.css?tag=pop-thread-summary&encapsulation=scoped";
export class PopThreadSummary {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-thread-summary",
        "$members$": {
            "messageId": [1, "message-id"],
            "threadCount": [2, "thread-count"],
            "threadPreview": [1, "thread-preview"],
            "threadAvatarUrl": [1, "thread-avatar-url"],
            "threadLastAt": [2, "thread-last-at"]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=thread-summary.js.map