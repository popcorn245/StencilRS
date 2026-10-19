import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopStatStyle0 from "./ui-kit/atoms/stat/stat.css?tag=pop-stat&encapsulation=scoped";
export const Stat = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    value;
    label;
    color;
    size = 'md';
    render() {
        return (h("div", { key: '0', class: "stat" },
            h("span", { key: '1', class: { 'stat-value': true, [`stat-value--${this.size}`]: true }, style: { '--stat-color': this.color } }, this.value),
            this.label && h("span", { key: '2', class: "stat-label" }, this.label)));
    }
};
Stat.style = PopStatStyle0();
//# sourceMappingURL=stat.js.map