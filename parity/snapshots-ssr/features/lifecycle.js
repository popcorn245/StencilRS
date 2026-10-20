import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class LifecycleCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    value;
    connectedCallback() { }
    disconnectedCallback() { }
    componentWillLoad() { }
    componentDidLoad() { }
    componentWillRender() { }
    componentDidRender() { }
    componentWillUpdate() { }
    componentDidUpdate() { }
    render() {
        return h("div", { key: '0' }, this.value);
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "lifecycle-cmp",
        "$members$": {
            "value": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=lifecycle.js.map