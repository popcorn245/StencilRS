import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopRadioGroupStyle0 from "./ui-kit/molecules/radio-group/radio-group.css?tag=pop-radio-group&encapsulation=scoped";
export class PopRadioGroup {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.valueChanged = __stencil_createEvent(this, "valueChanged", 7);
    }
    value = '';
    options = [];
    ariaLabel = '';
    disabled = false;
    valueChanged;
    select(id) {
        if (this.disabled || this.value === id)
            return;
        this.value = id;
        this.valueChanged.emit(id);
    }
    render() {
        return (h("div", { key: '0', class: "prg", role: "radiogroup", "aria-label": this.ariaLabel || undefined }, (this.options || []).map((opt) => {
            const selected = this.value === opt.id;
            return (h("button", { type: "button", key: opt.id, class: { prg__opt: true, 'prg__opt--selected': selected }, role: "radio", "aria-checked": selected ? 'true' : 'false', disabled: this.disabled, onClick: (e) => {
                    e.preventDefault();
                    this.select(opt.id);
                } },
                opt.icon && h("span", { class: "prg__icon", "aria-hidden": "true" }, opt.icon),
                h("span", { class: "prg__label" }, opt.label)));
        })));
    }
    static get style() { return PopRadioGroupStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-radio-group",
        "$members$": {
            "value": [1025],
            "options": [16],
            "ariaLabel": [1, "aria-label"],
            "disabled": [4]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=radio-group.js.map