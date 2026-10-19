import { HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export default class DefaultExport extends HTMLElement {
    constructor() {
        super();
    }
    value;
    render() {
        return h("div", null, this.value);
    }
}
//# sourceMappingURL=default-export.js.map