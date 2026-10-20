import { BaseProps } from './base-props';
/** The middle of a chain: adds members on top of BaseProps. */
export class ChainMiddle extends BaseProps {
    constructor() {
        super();
    }
    middle = 2;
    open = false;
    toggle() {
        this.open = !this.open;
    }
}
//# sourceMappingURL=chain-middle.js.map