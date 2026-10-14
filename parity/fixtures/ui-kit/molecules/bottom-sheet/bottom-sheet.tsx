import { Component, Prop, Event, EventEmitter, Host, Listen, State, Element, h } from '@stencil/core';

/** Drag dead-zone (px) before a press becomes a drag — a tap must not move the sheet. */
const DRAG_SLOP = 4;

@Component({
  tag: 'pop-bottom-sheet',
  encapsulation: { type: 'scoped' },
  styleUrl: 'bottom-sheet.css',
})
export class BottomSheet {
  @Element() el!: HTMLElement;

  @Prop({ mutable: true, reflect: true }) open = false;
  @Prop() sheetTitle: string;
  // dvh (dynamic viewport height) tracks the phone's real visible area as the
  // URL bar / keyboard come and go; vh does not, which let a tall sheet push its
  // action bar below the fold. The CSS carries an 85vh fallback for old engines
  // (an unsupported inline dvh value is ignored → the stylesheet wins).
  @Prop() maxHeight = '85dvh';
  @Prop() fullScreen = false;

  @Event() popClose: EventEmitter<void>;

  /** Live drag offset (px) while the user swipes the sheet down. 0 = at rest. */
  @State() dragY = 0;
  /** True while a pointer drag is in progress (suppresses the snap transition). */
  @State() dragging = false;

  private startY = 0;
  private lastY = 0;
  private lastT = 0;
  private velocity = 0; // px/ms, positive = downward
  private sheetEl?: HTMLElement;
  private pointerId: number | null = null;

  @Listen('keydown', { target: 'window' })
  handleKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Escape' && this.open) {
      this.close();
    }
  }

  // The @Listen keydown above is Stencil-managed (auto-removed on teardown); only
  // the manually-added window pointer listeners below need explicit cleanup. If the
  // component unmounts mid-drag (route change / a swallowed pointerup), disconnect
  // pulls the three window listeners so the dead instance isn't held for the page
  // lifetime, and nulls the drag pointer so a stray late event is ignored.
  disconnectedCallback() {
    this.removeDragListeners();
    this.pointerId = null;
  }

  private removeDragListeners() {
    window.removeEventListener('pointermove', this.onDragMove);
    window.removeEventListener('pointerup', this.onDragEnd);
    window.removeEventListener('pointercancel', this.onDragEnd);
  }

  private close() {
    // Guard against a double close (e.g. Escape during an active drag closes the
    // sheet, then the eventual pointerup runs onDragEnd) so popClose emits once.
    if (!this.open) return;
    this.open = false;
    this.popClose.emit();
  }

  // ── drag-to-close (pointer-based, touch + mouse) ──
  // Grab the handle/title area and drag the sheet down; release past ~30% of the
  // sheet height (or with downward flick velocity) → close, else snap back.
  //
  // Standardized on the same robust drag shape as the hub tiles/rail/bar handles:
  //  · capture the pointer on the GRIP itself (currentTarget), not whichever child
  //    (handle bar / title) was pressed — capturing the child made routing flaky;
  //  · track on WINDOW listeners so a dropped capture / a node re-render mid-drag
  //    can't silently strand the gesture (the old element-bound moves did);
  //  · a SLOP dead-zone (DRAG_SLOP) before it starts translating, so a tap or a
  //    couple px of jitter never nudges the sheet ("finicky" fix).
  private onDragStart = (ev: PointerEvent) => {
    if (!this.open) return;
    // Ignore secondary buttons (right/middle click).
    if (ev.button !== undefined && ev.button > 0) return;
    this.pointerId = ev.pointerId;
    this.dragging = false; // true only once past the slop threshold
    this.startY = ev.clientY;
    this.lastY = ev.clientY;
    this.lastT = ev.timeStamp;
    this.velocity = 0;
    this.dragY = 0;
    try { (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId); } catch { /* ignore */ }
    window.addEventListener('pointermove', this.onDragMove);
    window.addEventListener('pointerup', this.onDragEnd);
    window.addEventListener('pointercancel', this.onDragEnd);
  };

  private onDragMove = (ev: PointerEvent) => {
    if (this.pointerId === null || ev.pointerId !== this.pointerId) return;
    const dy = ev.clientY - this.startY;
    // Slop: ignore tiny jitter so a tap doesn't move the sheet.
    if (!this.dragging) {
      if (Math.abs(dy) < DRAG_SLOP) return;
      this.dragging = true;
    }
    // Only follow downward drags; clamp upward to 0.
    this.dragY = Math.max(0, dy);
    const dt = ev.timeStamp - this.lastT;
    if (dt > 0) this.velocity = (ev.clientY - this.lastY) / dt;
    this.lastY = ev.clientY;
    this.lastT = ev.timeStamp;
  };

  private onDragEnd = (ev: PointerEvent) => {
    if (this.pointerId === null || ev.pointerId !== this.pointerId) return;
    this.removeDragListeners();
    const wasDragging = this.dragging;
    // Decide BEFORE resetting the offset.
    const height = this.sheetEl?.getBoundingClientRect().height || window.innerHeight * 0.85;
    const past = this.dragY > height * 0.3;
    const flick = this.velocity > 0.5; // fast downward flick
    this.dragging = false;
    this.pointerId = null;
    this.dragY = 0;
    if (wasDragging && (past || flick)) this.close();
  };

  render() {
    const sheetStyle: { [k: string]: string } = {};
    if (!this.fullScreen) sheetStyle.maxHeight = this.maxHeight;
    if (this.dragY > 0) sheetStyle.transform = `translateY(${this.dragY}px)`;

    return (
      <Host>
        <div
          class={{ 'bs-backdrop': true, 'bs-backdrop--open': this.open }}
          onClick={() => this.close()}
        ></div>
        <div
          class={{
            'bs-sheet': true,
            'bs-sheet--open': this.open,
            'bs-sheet--full': this.fullScreen,
            'bs-sheet--dragging': this.dragging,
          }}
          ref={(el) => (this.sheetEl = el as HTMLElement)}
          style={sheetStyle}
        >
          <div
            class="bs-grip"
            onPointerDown={this.onDragStart}
          >
            <div class="bs-handle"></div>
            {this.sheetTitle && <h2 class="bs-title">{this.sheetTitle}</h2>}
          </div>
          <div class="bs-body">
            <slot></slot>
          </div>
          <div class="bs-actions">
            <slot name="actions"></slot>
          </div>
        </div>
      </Host>
    );
  }
}
