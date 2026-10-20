import { HTMLElement } from "@stencil/core/runtime/client/standalone";
/** No decorators: lifecycle and helpers only. */
export class PlainBase extends HTMLElement {
    constructor() {
        super();
    }
    started = 0;
    connectedCallback() {
        this.started = Date.now();
    }
    elapsed() {
        return Date.now() - this.started;
    }
}
//# sourceMappingURL=plain-base.js.map