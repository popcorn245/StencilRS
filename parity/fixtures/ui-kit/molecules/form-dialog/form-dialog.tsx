import { Component, Host, Prop, Event, EventEmitter, Listen, Watch, Element, h } from '@stencil/core';

@Component({
  tag: 'pop-form-dialog',
  encapsulation: { type: 'scoped' },
  styleUrl: 'form-dialog.css',
})
export class FormDialog {
  @Element() el: HTMLElement;

  @Prop({ mutable: true, reflect: true }) open = false;
  @Prop() dialogTitle: string;
  @Prop() description: string;
  @Prop() submitLabel = 'Save';
  @Prop() cancelLabel = 'Cancel';
  /**
   * Hide the footer (Cancel/Submit) entirely — for dialogs that are dismissed by
   * the × / backdrop and have no explicit confirm action (e.g. the Weather panel).
   */
  @Prop() hideFooter = false;
  /**
   * Opt into a slotted HEADER BAR: a single flex row laid out as
   *   `[ slot="header" …flex-grows… ] [ slot="header-actions" ] [ × close ]`
   * so the consumer supplies its OWN title + right-side control (a list-select, a
   * room switcher, …) INLINE with the close/action buttons — nothing overlaps the
   * ×, and the consumer's control can't be clipped in the top-right corner.
   *
   * When false (the default) the dialog keeps its legacy chrome: the absolutely
   * positioned round × plus an optional `dialogTitle` heading. Existing consumers
   * that pass `dialogTitle` are unaffected — this is purely additive.
   */
  @Prop() headerBar = false;

  @Event() popSubmit: EventEmitter<void>;
  @Event() popClose: EventEmitter<void>;

  @Listen('keydown', { target: 'window' })
  handleKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Escape' && this.open) {
      this.handleClose();
    }
  }

  @Watch('open')
  handleOpenChange() {
    if (this.open) {
      requestAnimationFrame(() => {
        const firstInput = this.el.querySelector<HTMLElement>('input, textarea, select, button:not(.fd-close)');
        if (firstInput) firstInput.focus();
      });
    }
  }

  private handleClose() {
    this.open = false;
    this.popClose.emit();
  }

  /**
   * The content lives in a <form> so consumers WITH a footer keep Enter-to-submit
   * (e.g. type a thread name → Enter creates it). But ANY slotted <button> without
   * type="button" defaults to type=submit and would otherwise submit the form.
   * To prevent unintended close/submit:
   *   - We ALWAYS preventDefault (the form never navigates).
   *   - We only emit popSubmit when a footer is shown (an explicit submit action
   *     exists). With hideFooter there is NO submit semantics, so a stray slotted
   *     button can never trigger popSubmit — only ×/backdrop/Esc close the dialog.
   * The explicit footer submit button is type="submit" so Enter + click both
   * route through here; the close stays on × / backdrop / Esc, never on submit.
   */
  private handleSubmit(e: Event) {
    e.preventDefault();
    if (!this.hideFooter) this.popSubmit.emit();
  }

  render() {
    return (
      <Host>
        <div class={{ 'fd-backdrop': true, 'fd-backdrop--open': this.open }} onClick={() => this.handleClose()}></div>
        <div class={{ 'fd-card': true }} style={{ display: this.open ? 'flex' : 'none' }}>
          <div class={{ 'fd-panel': true, 'fd-panel--open': this.open, 'fd-panel--headerbar': this.headerBar }}>
            {this.headerBar ? (
              // Slotted header bar: [ title/controls …grow… ] [ actions ] [ × ].
              // The × lives INLINE at the end of the row (not absolutely
              // positioned), so a consumer's right-side control can't collide
              // with or hide it.
              <div class="fd-header">
                <div class="fd-header-main">
                  <slot name="header"></slot>
                </div>
                <div class="fd-header-actions">
                  <slot name="header-actions"></slot>
                  <button
                    type="button"
                    class="fd-close fd-close--inline"
                    aria-label="Close"
                    onClick={() => this.handleClose()}
                  >
                    &times;
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" class="fd-close" aria-label="Close" onClick={() => this.handleClose()}>&times;</button>
            )}
            {this.dialogTitle && <h2 class="fd-title">{this.dialogTitle}</h2>}
            {this.description && <p class="fd-description">{this.description}</p>}
            <form onSubmit={(e) => this.handleSubmit(e)}>
              <div class="fd-body">
                <slot></slot>
              </div>
              {!this.hideFooter && (
                <div class="fd-footer">
                  <slot name="footer">
                    <button type="button" class="outline" onClick={() => this.handleClose()}>{this.cancelLabel}</button>
                    {/* The ONLY submit-typed control: Enter-in-an-input AND a click
                        both route through the form's onSubmit → popSubmit (once). */}
                    <button type="submit">{this.submitLabel}</button>
                  </slot>
                </div>
              )}
            </form>
          </div>
        </div>
      </Host>
    );
  }
}
