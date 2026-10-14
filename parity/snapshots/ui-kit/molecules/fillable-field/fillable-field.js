import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h, Host } from "@stencil/core/runtime/client/standalone";
import PopFillableFieldStyle0 from "./ui-kit/molecules/fillable-field/fillable-field.css?tag=pop-fillable-field&encapsulation=scoped";
const PopFillableField = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.valueChange = __stencil_createEvent(this, "valueChange", 7);
        this.askChange = __stencil_createEvent(this, "askChange", 7);
    }
    /** Field label shown above the control. */
    label;
    /** Optional secondary text shown next to the label (e.g. a unit hint). */
    hint;
    /** Value for the built-in text input (ignored when `useSlot` is set). */
    value = '';
    /** Placeholder for the built-in text input. */
    placeholder;
    /** Input type for the built-in text input (text, number, datetime-local…). */
    inputType = 'text';
    /** When set, render a <select> of these options instead of a text input.
     *  The selected option is whichever matches `value`. */
    options;
    /** Whether the field auto-fills on tap (true) or is baked (false). */
    askOnTap = false;
    /** Whether to show the auto-fill toggle at all. */
    askable = true;
    /** Render a slotted control instead of the built-in text input. */
    useSlot = false;
    /** Emitted when the built-in input value changes. */
    valueChange;
    /** Emitted when the auto-fill toggle flips. Detail is the new askOnTap. */
    askChange;
    onInput = (e) => {
        this.value = e.target.value;
        this.valueChange.emit(this.value);
    };
    toggle = () => {
        this.askOnTap = !this.askOnTap;
        this.askChange.emit(this.askOnTap);
    };
    render() {
        const on = this.askOnTap;
        return (h(Host, { key: '0' },
            h("label", { key: '1', class: "ff" },
                h("span", { key: '2', class: "ff__label" },
                    h("span", { key: '3', class: "ff__label-text" }, this.label),
                    this.hint && h("span", { key: '4', class: "ff__hint" }, this.hint)),
                h("div", { key: '5', class: { ff__row: true, 'ff__row--ask': on } },
                    this.options ? (h("select", { class: "ff__input", onInput: this.onInput }, this.options.map((o) => (h("option", { value: o.value, selected: o.value === this.value }, o.label))))) : this.useSlot ? (h("span", { class: "ff__control" },
                        h("slot", null))) : (h("input", { class: "ff__input", type: this.inputType, value: this.value, placeholder: this.placeholder, onInput: this.onInput })),
                    this.askable && (h("button", { key: '6', type: "button", class: { ff__toggle: true, 'ff__toggle--on': on }, "aria-pressed": on ? 'true' : 'false', "aria-label": on ? 'Auto-fill on tap: on' : 'Auto-fill on tap: off', title: on ? 'Asks you when the tag is tapped' : 'Baked into the tag', onClick: this.toggle }, on ? (h("svg", { viewBox: "0 0 24 24", width: "18", height: "18", "aria-hidden": "true" },
                        h("path", { fill: "currentColor", d: "M7 2v11h3v9l7-12h-4l4-8z" }))) : (h("svg", { viewBox: "0 0 24 24", width: "18", height: "18", "aria-hidden": "true" },
                        h("path", { fill: "currentColor", d: "M3.27 3 2 4.27l5 5V13h3v9l3.58-6.14L17.73 20 19 18.73 3.27 3zM17 10h-4l4-8H7v2.18l8.46 8.46L17 10z" })))))))));
    }
    static get style() { return PopFillableFieldStyle0(); }
};
__stencil_defineCustomElement(PopFillableField, [774, "pop-fillable-field", {
        "label": [1],
        "hint": [1],
        "value": [1025],
        "placeholder": [1],
        "inputType": [1, "input-type"],
        "options": [16],
        "askOnTap": [1028, "ask-on-tap"],
        "askable": [4],
        "useSlot": [4, "use-slot"]
    }]);
//# sourceMappingURL=fillable-field.js.map