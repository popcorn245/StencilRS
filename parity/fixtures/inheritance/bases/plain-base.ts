/** No decorators: lifecycle and helpers only. */
export class PlainBase {
  protected started = 0;

  connectedCallback() {
    this.started = Date.now();
  }

  protected elapsed() {
    return Date.now() - this.started;
  }
}
