import { Component, Prop, Method, State, Element, h } from '@stencil/core';

/**
 * A toast action is either a navigation link (`href`) OR an in-page callback
 * (`onAction`, e.g. an Undo). When `onAction` is present it renders a button and
 * dismisses the toast on click; otherwise `href` renders a link.
 */
export interface ToastAction {
  label: string;
  href?: string;
  onAction?: () => void;
}

/**
 * Per-call overrides for `show()`. Appended as an optional trailing arg so
 * existing positional callers (`show(msg, type, action)`) are unaffected.
 */
export interface ToastOptions {
  /**
   * Override the component's default `duration` (ms) for THIS toast only.
   * `<= 0` (or `persistent: true`) makes it sticky — it never auto-dismisses
   * and must be cleared via `hide()` or a subsequent `show()`.
   */
  duration?: number;
  /** Sticky toast: do not auto-dismiss. Equivalent to `duration <= 0`. */
  persistent?: boolean;
}

interface ToastItem {
  id: number;
  message: string;
  type: string;
  action?: ToastAction;
}

@Component({
  tag: 'pop-toast',
  encapsulation: { type: 'scoped' },
  styleUrl: 'toast.css',
})
export class Toast {
  @Element() el: HTMLElement;

  @Prop() position: 'bottom-center' | 'bottom-right' = 'bottom-center';
  @Prop() duration = 5000;

  @State() toasts: ToastItem[] = [];

  private nextId = 0;
  /** Pending auto-dismiss timers, keyed by toast id, so a replacing `show` or an
   *  explicit `hide()` can cancel them (a sticky toast has no entry here). */
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  @Method()
  async show(
    message: string,
    type: 'default' | 'error' | 'success' = 'default',
    action?: ToastAction,
    options?: ToastOptions,
  ) {
    const id = this.nextId++;
    this.toasts = [...this.toasts, { id, message, type, action }];

    // A `duration <= 0` or `persistent: true` toast is sticky — it never
    // auto-dismisses and must be cleared via hide() (or a caller re-showing).
    // Otherwise arm a per-toast timer (tracked so hide() can cancel it).
    const ms = options?.duration ?? this.duration;
    const persistent = options?.persistent === true || ms <= 0;
    if (!persistent) {
      this.timers.set(
        id,
        setTimeout(() => {
          this.timers.delete(id);
          this.dismiss(id);
        }, ms),
      );
    }
  }

  /**
   * Dismiss all currently-shown toasts, cancelling any pending auto-dismiss
   * timers. The single programmatic way to clear a sticky (persistent) toast.
   */
  @Method()
  async hide() {
    for (const t of [...this.toasts]) this.dismiss(t.id);
  }

  private dismiss(id: number) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    const toastEl = this.el.querySelector(`[data-toast-id="${id}"]`) as HTMLElement;
    if (toastEl) {
      toastEl.style.animation = 'toast-out 200ms ease forwards';
      toastEl.addEventListener('animationend', () => {
        this.toasts = this.toasts.filter(t => t.id !== id);
      }, { once: true });
    } else {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }
  }

  private handleAction = (toast: ToastItem) => {
    // Fire the in-page callback (e.g. Undo) then dismiss the toast at once so it
    // doesn't linger after the action completes.
    toast.action?.onAction?.();
    this.dismiss(toast.id);
  };

  render() {
    return (
      <div
        class={{ 'toast-container': true, 'toast-container--bottom-right': this.position === 'bottom-right' }}
        aria-live="assertive"
        aria-atomic="true"
      >
        {this.toasts.map(toast => (
          <div class={`toast toast--${toast.type}`} data-toast-id={toast.id} key={toast.id}>
            {toast.message}
            {toast.action &&
              (toast.action.onAction ? (
                <button
                  type="button"
                  class="toast__action"
                  onClick={() => this.handleAction(toast)}
                >
                  {toast.action.label}
                </button>
              ) : (
                <a href={toast.action.href} class="toast__action">{toast.action.label}</a>
              ))}
          </div>
        ))}
      </div>
    );
  }
}
