import { HTMLElement } from "@stencil/core/runtime/client/standalone";
/** A decorated base class: every member decorator, plus lifecycle. */
export class BaseProps extends HTMLElement {
    constructor() {
        super();
    }
    el;
    /** Shown before the name. */
    greeting = 'Hello';
    size = 'small';
    disabled = false;
    clicks = 0;
    baseClicked;
    greetingChanged(next) {
        console.log('greeting', next);
    }
    onClick() {
        this.clicks++;
        this.baseClicked.emit(this.clicks);
    }
    async reset() {
        this.clicks = 0;
    }
    componentDidLoad() {
        console.log('base loaded');
    }
    label() {
        return `${this.greeting} (${this.clicks})`;
    }
}
//# sourceMappingURL=base-props.js.map