import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopSwitchStyle0 from "./ui-kit/atoms/switch/switch.css?tag=pop-switch&encapsulation=scoped";
export const PopSwitch = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popChange = __stencil_createEvent(this, "popChange", 7);
    }
    /** Whether the switch is on. */
    checked = false;
    disabled = false;
    /** Accessible name (aria-label); visually optional. */
    label;
    /** Emitted with the NEW checked state whenever the switch toggles. */
    popChange;
    toggle = () => {
        if (this.disabled)
            return;
        this.checked = !this.checked;
        this.popChange.emit(this.checked);
    };
    render() {
        return (h("button", { key: '0', type: "button", class: { sw: true, 'sw--on': this.checked }, role: "switch", "aria-checked": this.checked ? 'true' : 'false', "aria-label": this.label, disabled: this.disabled, onClick: this.toggle },
            h("span", { key: '1', class: "sw__knob", "aria-hidden": "true" })));
    }
    static get style() { return PopSwitchStyle0(); }
};
__stencil_proxyCustomElement(PopSwitch, [514, "pop-switch", {
        "checked": [1028],
        "disabled": [4],
        "label": [1]
    }]);
//# sourceMappingURL=switch.js.map