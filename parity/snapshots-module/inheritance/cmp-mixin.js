import { proxyCustomElement as __stencil_proxyCustomElement } from "@stencil/core/runtime/client/standalone";
import { h, Mixin } from "@stencil/core/runtime/client/standalone";
import { withCount, withLabel, withTheme } from './bases/mixins';
export const CmpMixin = class extends Mixin(withCount, withLabel, withTheme) {
    constructor(registerHost) {
        super(false);
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    suffix = '!';
    render() {
        return (h("span", { key: '0', class: this.theme },
            this.label,
            ": ",
            this.count,
            this.suffix));
    }
    static get watchers() { return {
        "label": [{
                "labelChanged": 0
            }]
    }; }
};
__stencil_proxyCustomElement(CmpMixin, [512, "cmp-mixin", {
        "theme": [1],
        "label": [1025],
        "step": [2],
        "suffix": [1],
        "count": [32],
        "increment": [64]
    }, undefined, {
        "label": [{
                "labelChanged": 0
            }]
    }]);
//# sourceMappingURL=cmp-mixin.js.map