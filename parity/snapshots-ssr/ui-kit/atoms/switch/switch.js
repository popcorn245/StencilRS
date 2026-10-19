import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopSwitchStyle0 from "./ui-kit/atoms/switch/switch.css?tag=pop-switch&encapsulation=scoped";
/**
 * pop-switch — an accessible toggle switch (atom).
 *
 * The ARIA toggle extracted (behavior-verbatim) from bucket-hub's bespoke
 * `hub-switch` markup: a real <button role="switch">, `aria-checked`, Space/
 * Enter toggle (native button activation), token-driven focus ring.
 *
 *   <pop-switch label="Web only" checked onPopChange={e => (on = e.detail)} />
 *
 * Used standalone and by `pop-field type="boolean"`. The `label` prop is the
 * accessible name; render your own visible label row next to it when needed.
 */
export class PopSwitch {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-switch",
        "$members$": {
            "checked": [1028],
            "disabled": [4],
            "label": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=switch.js.map