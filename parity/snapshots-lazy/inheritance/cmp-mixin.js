import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h, Mixin } from "@stencil/core/runtime/client/standalone";
import { withCount, withLabel, withTheme } from './bases/mixins';
export const CmpMixin = class extends Mixin(withCount, withLabel, withTheme) {
    constructor(hostRef) {
        super();
        __stencil_registerInstance(this, hostRef);
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
//# sourceMappingURL=cmp-mixin.js.map