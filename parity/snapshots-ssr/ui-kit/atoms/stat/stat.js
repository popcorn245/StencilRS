import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopStatStyle0 from "./ui-kit/atoms/stat/stat.css?tag=pop-stat&encapsulation=scoped";
export class Stat {
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
    static get style() { return PopStatStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-stat",
        "$members$": {
            "value": [1],
            "label": [1],
            "color": [1],
            "size": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=stat.js.map