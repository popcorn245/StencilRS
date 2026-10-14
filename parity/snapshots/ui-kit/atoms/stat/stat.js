import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopStatStyle0 from "./ui-kit/atoms/stat/stat.css?tag=pop-stat&encapsulation=scoped";
const Stat = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
    static get style() { return PopStatStyle0(); }
};
__stencil_defineCustomElement(Stat, [514, "pop-stat", {
        "value": [1],
        "label": [1],
        "color": [1],
        "size": [1]
    }]);
//# sourceMappingURL=stat.js.map