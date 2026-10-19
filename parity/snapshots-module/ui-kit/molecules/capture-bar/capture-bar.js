import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopCaptureBarStyle0 from "./ui-kit/molecules/capture-bar/capture-bar.css?tag=pop-capture-bar&encapsulation=scoped";
export const PopCaptureBar = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.capture = __stencil_createEvent(this, "capture", 7);
    }
    get el() { return this; }
    /** Placeholder copy. */
    placeholder = 'Capture a thought…';
    /** Autofocus the field on mount (Home does; the topbar variant may not). */
    autofocus = false;
    /** Fired with the captured text when the user submits a non-empty thought. */
    capture;
    value = '';
    input;
    componentDidLoad() {
        if (this.autofocus)
            this.input?.focus();
    }
    submit = () => {
        const text = this.value.trim();
        if (!text)
            return;
        this.capture.emit({ text });
        this.value = '';
        // keep focus for the save-and-clear loop
        this.input?.focus();
    };
    onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.submit();
        }
    };
    onInput = (e) => {
        this.value = e.target.value;
    };
    render() {
        const hasText = this.value.trim().length > 0;
        return (h("div", { key: '0', class: { 'cb': true, 'is-active': hasText } },
            h("span", { key: '1', class: "cb__lead", "aria-hidden": "true" },
                h("pop-brand-icon", { key: '2', name: "edit" })),
            h("input", { key: '3', ref: (el) => (this.input = el), class: "cb__input", type: "text", enterkeyhint: "done", autocomplete: "off", value: this.value, placeholder: this.placeholder, "aria-label": this.placeholder, onInput: this.onInput, onKeyDown: this.onKeyDown }),
            h("button", { key: '4', type: "button", class: "cb__send", "aria-label": "Capture thought", title: "Capture (Enter)", disabled: !hasText, onClick: this.submit },
                h("svg", { key: '5', width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
                    h("path", { key: '6', d: "M5 12h14M13 6l6 6-6 6" })))));
    }
    static get style() { return PopCaptureBarStyle0(); }
};
__stencil_proxyCustomElement(PopCaptureBar, [514, "pop-capture-bar", {
        "placeholder": [1],
        "autofocus": [4],
        "value": [32]
    }]);
//# sourceMappingURL=capture-bar.js.map