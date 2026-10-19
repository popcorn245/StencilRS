import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
export class PlainCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    greeting = 'hello';
    render() {
        return this.greeting;
    }
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "plain-cmp",
        "$members$": undefined,
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=plain.js.map