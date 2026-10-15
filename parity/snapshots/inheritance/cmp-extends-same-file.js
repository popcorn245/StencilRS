import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
class LocalBase extends HTMLElement {
    constructor() {
        super();
    }
    local = 'local';
    ready = false;
    componentWillLoad() {
        this.ready = true;
    }
}
const CmpExtendsSameFile = class extends LocalBase {
    constructor(registerHost) {
        super(false);
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    own = 1;
    render() {
        return h("p", { key: '0' },
            this.local,
            " ",
            this.own,
            " ",
            String(this.ready));
    }
};
__stencil_defineCustomElement(CmpExtendsSameFile, [512, "cmp-extends-same-file", {
        "local": [1],
        "own": [2],
        "ready": [32]
    }]);
//# sourceMappingURL=cmp-extends-same-file.js.map