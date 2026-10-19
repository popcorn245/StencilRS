import { HTMLElement } from "@stencil/core/runtime/client/standalone";
class Existing extends HTMLElement {
    constructor() {
        super();
    }
    fromExisting = true;
}
/** Returns an existing class by reference: Stencil can't see a class literal in it. */
export const byReference = (_Base) => Existing;
/** Implements, but extends nothing. */
export class Implementer extends HTMLElement {
    constructor() {
        super();
    }
    name = 'thing';
}
//# sourceMappingURL=factories.js.map