import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
class LocalBase {
    local = 'local';
    ready = false;
    componentWillLoad() {
        this.ready = true;
    }
    static get properties() { return {
        "local": {
            "type": "string",
            "mutable": false,
            "complexType": {
                "original": "string",
                "resolved": "string",
                "references": {}
            },
            "required": false,
            "optional": false,
            "docs": {
                "tags": [],
                "text": ""
            },
            "getter": false,
            "setter": false,
            "reflect": false,
            "attribute": "local",
            "defaultValue": "'local'"
        }
    }; }
    static get states() { return {
        "ready": {}
    }; }
}
export const CmpExtendsSameFile = class extends LocalBase {
    constructor(hostRef) {
        super();
        __stencil_registerInstance(this, hostRef);
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
//# sourceMappingURL=cmp-extends-same-file.js.map