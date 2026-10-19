import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopProgressBarStyle0 from "./ui-kit/atoms/progress-bar/progress-bar.css?tag=pop-progress-bar&encapsulation=scoped";
export class ProgressBar {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    value = 0;
    max = 100;
    color;
    size = 'md';
    label;
    get percentage() {
        return Math.min(100, Math.max(0, (this.value / this.max) * 100));
    }
    render() {
        return (h("div", { key: '0', class: { 'pb-track': true, [`pb-track--${this.size}`]: true }, role: "progressbar", "aria-valuenow": this.value, "aria-valuemin": 0, "aria-valuemax": this.max, "aria-label": this.label },
            h("div", { key: '1', class: "pb-fill", style: { width: `${this.percentage}%`, '--pb-color': this.color } })));
    }
    static get style() { return PopProgressBarStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-progress-bar",
        "$members$": {
            "value": [2],
            "max": [2],
            "color": [1],
            "size": [1],
            "label": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=progress-bar.js.map