import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopCaptureBarStyle0 from "./ui-kit/molecules/capture-bar/capture-bar.css?tag=pop-capture-bar&encapsulation=scoped";
/**
 * pop-capture-bar — zero-friction quick capture, pinned at the top of Home.
 *
 * "✎ Capture a thought… ↵". Pressing Enter (or the send button) emits
 * `capture` with the trimmed text and clears the field (the save-and-clear
 * loop). The page wires note creation via the NotesAdapter — the bar itself is
 * presentational, so it works in Storybook and stays reusable.
 *
 * Phase 2 keeps the input plain; inline `#tag` / `[[link]]` parsing
 * (pop-mention-input) is layered in by the Capture/Linking phases.
 *
 * See planned/notes-app-digital-brain/components.mdx §pop-capture-bar.
 */
export class PopCaptureBar {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.capture = __stencil_createEvent(this, "capture", 7);
    }
    get el() { return __stencil_getElement(this); }
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
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-capture-bar",
        "$members$": {
            "placeholder": [1],
            "autofocus": [4],
            "value": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=capture-bar.js.map