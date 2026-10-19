import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopThreadSelectStyle0 from "./ui-kit/molecules/thread-select/thread-select.css?tag=pop-thread-select&encapsulation=scoped";
export const PopThreadSelect = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popThreadChange = __stencil_createEvent(this, "popThreadChange", 7);
    }
    /** Threads the user may post into. */
    threads = [];
    /** The currently selected thread id. */
    value = '';
    /** Pin the daily ("Today") threads above the topic threads. */
    showToday = true;
    disabled = false;
    /** Visible label for the control. */
    label = 'Post to';
    /** Emitted with the newly-picked thread id. The HOST persists it. */
    popThreadChange;
    options() {
        const list = Array.isArray(this.threads) ? this.threads.filter((t) => t && t.id) : [];
        if (!this.showToday)
            return list;
        // Stable partition: dailies first, everything else in the given order.
        return [...list.filter((t) => t.kind === 'daily'), ...list.filter((t) => t.kind !== 'daily')];
    }
    onChange = (ev) => {
        const threadId = ev.target.value;
        if (!threadId)
            return;
        this.popThreadChange.emit({ threadId });
    };
    render() {
        const options = this.options();
        const empty = options.length === 0;
        const daily = options.filter((t) => t.kind === 'daily');
        const topics = options.filter((t) => t.kind !== 'daily');
        const grouped = this.showToday && daily.length > 0 && topics.length > 0;
        return (h("label", { key: '0', class: "tsel" },
            h("span", { key: '1', class: "tsel__label" }, this.label),
            h("select", { key: '2', class: "tsel__select", disabled: this.disabled || empty, "aria-label": this.label, onChange: this.onChange }, empty ? (h("option", { value: "" }, "No threads yet")) : grouped ? ([
                h("optgroup", { label: "Today" }, daily.map((t) => (h("option", { key: t.id, value: t.id, selected: t.id === this.value }, t.title)))),
                h("optgroup", { label: "Topics" }, topics.map((t) => (h("option", { key: t.id, value: t.id, selected: t.id === this.value }, t.title)))),
            ]) : (options.map((t) => (h("option", { key: t.id, value: t.id, selected: t.id === this.value }, t.title)))))));
    }
};
PopThreadSelect.style = PopThreadSelectStyle0();
//# sourceMappingURL=thread-select.js.map