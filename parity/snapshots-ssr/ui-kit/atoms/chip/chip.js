import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopChipStyle0 from "./ui-kit/atoms/chip/chip.css?tag=pop-chip&encapsulation=scoped";
export class Chip {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popChipSelect = __stencil_createEvent(this, "popChipSelect", 7);
        this.popChipRemove = __stencil_createEvent(this, "popChipRemove", 7);
    }
    value;
    color;
    selected = false;
    removable = false;
    popChipSelect;
    popChipRemove;
    handleClick() {
        this.popChipSelect.emit({ value: this.value });
    }
    handleRemove(e) {
        e.stopPropagation();
        this.popChipRemove.emit({ value: this.value });
    }
    render() {
        return (h("span", { key: '0', class: { chip: true, 'chip--selected': this.selected }, style: { '--chip-color': this.color }, onClick: () => this.handleClick() },
            h("slot", { key: '1' }),
            this.removable && (h("button", { key: '2', class: "chip-remove", onClick: (e) => this.handleRemove(e) }, "\u00D7"))));
    }
    static get style() { return PopChipStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 774,
        "$tagName$": "pop-chip",
        "$members$": {
            "value": [1],
            "color": [1],
            "selected": [1540],
            "removable": [4]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": [["selected", "selected"]]
    }; }
}
//# sourceMappingURL=chip.js.map