import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
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
export class CmpExtendsSameFile extends LocalBase {
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
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "cmp-extends-same-file",
        "$members$": {
            "local": [1],
            "own": [2],
            "ready": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=cmp-extends-same-file.js.map