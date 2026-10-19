import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopChipGroupStyle0 from "./ui-kit/molecules/chip-group/chip-group.css?tag=pop-chip-group&encapsulation=scoped";
export class ChipGroup {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popChange = __stencil_createEvent(this, "popChange", 7);
    }
    get el() { return __stencil_getElement(this); }
    value = '';
    multiple = false;
    popChange;
    handleChipSelect(event) {
        event.stopPropagation();
        const chipValue = event.detail.value;
        if (this.multiple) {
            const values = this.value ? this.value.split(',') : [];
            const idx = values.indexOf(chipValue);
            if (idx >= 0)
                values.splice(idx, 1);
            else
                values.push(chipValue);
            this.value = values.join(',');
            this.popChange.emit({ value: this.value, values });
        }
        else {
            this.value = chipValue;
            this.popChange.emit({ value: chipValue, values: [chipValue] });
        }
        this.updateChildren();
    }
    componentDidLoad() { this.updateChildren(); }
    updateChildren() {
        const values = this.value ? this.value.split(',') : [];
        const chips = this.el.querySelectorAll('pop-chip');
        chips.forEach((chip) => {
            chip.selected = values.includes(chip.value);
        });
    }
    render() {
        return (h("div", { key: '0', class: "chip-group", role: this.multiple ? 'listbox' : 'radiogroup' },
            h("slot", { key: '1' })));
    }
    static get style() { return PopChipGroupStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 774,
        "$tagName$": "pop-chip-group",
        "$members$": {
            "value": [1537],
            "multiple": [4]
        },
        "$listeners$": [[0, "popChipSelect", "handleChipSelect"]],
        "$lazyBundleId$": "-",
        "$attrsToReflect$": [["value", "value"]]
    }; }
}
//# sourceMappingURL=chip-group.js.map