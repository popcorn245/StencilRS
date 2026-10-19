/** No decorators: lifecycle and helpers only. */
export class PlainBase {
    started = 0;
    connectedCallback() {
        this.started = Date.now();
    }
    elapsed() {
        return Date.now() - this.started;
    }
}
//# sourceMappingURL=plain-base.js.map