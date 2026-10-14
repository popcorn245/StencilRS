import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopViewToggleStyle0 from "./ui-kit/molecules/view-toggle/view-toggle.css?tag=pop-view-toggle";
const PopViewToggle = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popViewChange = __stencil_createEvent(this, "popViewChange", 7);
    }
    /** Current active view: 'card' or 'list' */
    value = 'card';
    /** Emitted when the view changes. `event.detail` is the new value ('card' | 'list'). */
    popViewChange;
    select(next) {
        if (this.value === next)
            return;
        this.value = next;
        this.popViewChange.emit(next);
    }
    render() {
        return (h("div", { key: '0', class: "pvt-root", role: "group", "aria-label": "View toggle" },
            h("button", { key: '1', class: `pvt-btn ${this.value === 'card' ? 'pvt-btn--active' : ''}`, "aria-pressed": this.value === 'card' ? 'true' : 'false', "aria-label": "Card view", title: "Card view", type: "button", onClick: () => this.select('card') },
                h("svg", { key: '2', width: "16", height: "16", viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" },
                    h("rect", { key: '3', x: "3", y: "3", width: "8", height: "8", rx: "1.5" }),
                    h("rect", { key: '4', x: "13", y: "3", width: "8", height: "8", rx: "1.5" }),
                    h("rect", { key: '5', x: "3", y: "13", width: "8", height: "8", rx: "1.5" }),
                    h("rect", { key: '6', x: "13", y: "13", width: "8", height: "8", rx: "1.5" }))),
            h("button", { key: '7', class: `pvt-btn ${this.value === 'list' ? 'pvt-btn--active' : ''}`, "aria-pressed": this.value === 'list' ? 'true' : 'false', "aria-label": "List view", title: "List view", type: "button", onClick: () => this.select('list') },
                h("svg", { key: '8', width: "16", height: "16", viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" },
                    h("rect", { key: '9', x: "3", y: "5", width: "18", height: "2.5", rx: "1.25" }),
                    h("rect", { key: 'a', x: "3", y: "11", width: "18", height: "2.5", rx: "1.25" }),
                    h("rect", { key: 'b', x: "3", y: "17", width: "18", height: "2.5", rx: "1.25" })))));
    }
    static get style() { return PopViewToggleStyle0(); }
};
__stencil_defineCustomElement(PopViewToggle, [512, "pop-view-toggle", {
        "value": [1537]
    }]);
//# sourceMappingURL=view-toggle.js.map