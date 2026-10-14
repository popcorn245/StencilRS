import { Component, Prop, Method, Event, EventEmitter, State, Listen, Host, h } from '@stencil/core';

@Component({
  tag: 'pop-confirm-dialog',
  encapsulation: { type: 'scoped' },
  styleUrl: 'confirm-dialog.css',
})
export class ConfirmDialog {
  @Prop() confirmTitle = 'Confirm';
  @Prop() message = 'Are you sure?';
  @Prop() confirmLabel = 'Delete';
  @Prop() cancelLabel = 'Cancel';
  @Prop() danger = true;

  @State() isOpen = false;

  @Event() popConfirm: EventEmitter<void>;
  @Event() popCancel: EventEmitter<void>;

  private resolvePromise: ((value: boolean) => void) | null = null;

  @Method()
  async confirm(): Promise<boolean> {
    this.isOpen = true;
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  private handleConfirm() {
    this.isOpen = false;
    this.popConfirm.emit();
    this.resolvePromise?.(true);
    this.resolvePromise = null;
  }

  @Listen('keydown', { target: 'window' })
  handleKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Escape' && this.isOpen) {
      this.handleCancel();
    }
  }

  private handleCancel() {
    this.isOpen = false;
    this.popCancel.emit();
    this.resolvePromise?.(false);
    this.resolvePromise = null;
  }

  render() {
    return (
      <Host>
        <div
          class={{ 'cd-backdrop': true, 'cd-backdrop--open': this.isOpen }}
          onClick={() => this.handleCancel()}
        ></div>
        <div class={{ 'cd-panel-wrap': true, 'cd-panel-wrap--open': this.isOpen }}>
          <div class={{ 'cd-panel': true, 'cd-panel--open': this.isOpen }}>
            <h3 class="cd-title">{this.confirmTitle}</h3>
            <p class="cd-message">{this.message}</p>
            <div class="cd-actions">
              <button class="outline" onClick={() => this.handleCancel()}>
                {this.cancelLabel}
              </button>
              <button
                class={{ 'cd-btn-danger': this.danger }}
                onClick={() => this.handleConfirm()}
              >
                {this.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </Host>
    );
  }
}
