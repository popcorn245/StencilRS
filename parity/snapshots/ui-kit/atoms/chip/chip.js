import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopChipStyle0 from "./ui-kit/atoms/chip/chip.css?tag=pop-chip&encapsulation=scoped";
const Chip = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
};
__stencil_defineCustomElement(Chip, [774, "pop-chip", {
        "value": [1],
        "color": [1],
        "selected": [1540],
        "removable": [4]
    }]);
//# sourceMappingURL=chip.js.map