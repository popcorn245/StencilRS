import { Component, Prop, Event, EventEmitter, State, Element, Watch, h } from '@stencil/core';
import { type PresenterTier, PRESENTER_BREAKPOINTS, resolvePresenterTier } from './presenter-logic';

/**
 * pop-presenter — the generic presentation-tier resolver (organism).
 *
 * One surface (form fields / panel body / anything slotted) presented as:
 *   • sheet  (viewport < 768)      → renders `pop-bottom-sheet` itself
 *   • dialog (768 … dockMin-1)     → renders `pop-form-dialog` itself
 *   • dock   (viewport ≥ 1200)     → renders a PLAIN panel container that the
 *                                    HOST places in its layout ("controlled
 *                                    tier + slot": dock pushes layout, it is
 *                                    not an overlay — placement is host work)
 *
 * The host learns the resolved tier via `tierChange` (emitted on open and on
 * every resize across a breakpoint while open; content is re-slotted, not
 * lost). Dock-collapse preference/persistence is the HOST's job — to keep a
 * collapsed dock, force `tier="dialog"`; the dialog then shows a "Dock to
 * side" affordance (viewport permitting) which emits `popRedock` so the host
 * can flip its preference back.
 *
 * Slots:
 *   (default) — the surface content
 *   header    — rich header content (title + bespoke right-side control, e.g. a
 *               list select or room switcher). Rendered inline with the ×/dock
 *               buttons in dialog + dock tiers, and at the top of the sheet
 *               body. Omit to use the plain `heading` chrome instead.
 *   actions   — footer, typically a `pop-actions-footer` (rendered by the
 *               sheet's actions area / below the dialog body / dock footer).
 *               Submission is driven by the footer's own events — the dialog
 *               tier renders footer-less (`hideFooter`), so a stray implicit
 *               submit can never fire.
 */
@Component({
  tag: 'pop-presenter',
  encapsulation: { type: 'scoped' },
  styleUrl: 'presenter.css',
})
export class PopPresenter {
  @Element() el!: HTMLElement;

  /** Visibility — when false the presenter renders nothing (parent owns state). */
  @Prop() open = false;
  /** Chrome heading (sheet title / dialog title / dock header). Omit when the
   *  slotted surface renders its own header. */
  @Prop() heading?: string;
  /** Breakpoint overrides. Defaults restore the quick-controls spec values. */
  @Prop() sheetMax = PRESENTER_BREAKPOINTS.sheetMax;
  @Prop() dockMin = PRESENTER_BREAKPOINTS.dockMin;
  /** Force a tier regardless of viewport (host-controlled mode — e.g. the host
   *  keeps a collapsed-dock preference by forcing 'dialog'). */
  @Prop() tier?: PresenterTier;

  /** The resolved tier, emitted on open and whenever it changes while open. */
  @Event() tierChange!: EventEmitter<PresenterTier>;
  /** × / backdrop / Esc / dock close. */
  @Event() popClose!: EventEmitter<void>;
  /** The dialog tier's "Dock to side" affordance was tapped (host flips its
   *  dock preference and re-presents). */
  @Event() popRedock!: EventEmitter<void>;

  /** Re-render trigger for viewport-driven tier changes. */
  @State() private viewportWidth =
    typeof window !== 'undefined' ? window.innerWidth : PRESENTER_BREAKPOINTS.dockMin - 1;

  private lastEmittedTier: PresenterTier | null = null;

  private get resolvedTier(): PresenterTier {
    return resolvePresenterTier(this.viewportWidth, {
      sheetMax: this.sheetMax,
      dockMin: this.dockMin,
      tier: this.tier,
    });
  }

  private onResize = () => {
    this.viewportWidth = typeof window !== 'undefined' ? window.innerWidth : this.viewportWidth;
    this.maybeEmitTier();
  };

  private maybeEmitTier() {
    if (!this.open) return;
    const tier = this.resolvedTier;
    if (tier !== this.lastEmittedTier) {
      this.lastEmittedTier = tier;
      this.tierChange.emit(tier);
    }
  }

  connectedCallback() {
    if (typeof window !== 'undefined') window.addEventListener('resize', this.onResize, { passive: true });
    this.maybeEmitTier();
  }

  disconnectedCallback() {
    if (typeof window !== 'undefined') window.removeEventListener('resize', this.onResize);
  }

  @Watch('open')
  onOpenChange(open: boolean) {
    if (open) {
      this.viewportWidth = typeof window !== 'undefined' ? window.innerWidth : this.viewportWidth;
      this.maybeEmitTier();
    } else {
      this.lastEmittedTier = null;
    }
  }

  @Watch('tier')
  onTierPropChange() {
    this.maybeEmitTier();
  }

  private close = () => this.popClose.emit();

  /** Handler for the inner overlay's own popClose (sheet / dialog). Those events
   *  bubble (Stencil default), so without stopPropagation a listener on the
   *  presenter would receive both the bubbled inner event AND the presenter's
   *  re-emit — two popCloses per dismissal. Stop the inner one, then emit ours so
   *  exactly one popClose reaches the consumer. */
  private onInnerClose = (ev: Event) => {
    ev.stopPropagation();
    this.popClose.emit();
  };

  /** Whether the consumer slotted footer actions (light DOM query — scoped). */
  private hasActions(): boolean {
    return !!this.el.querySelector('[slot="actions"]');
  }

  /** Whether the consumer slotted rich header content. */
  private hasHeader(): boolean {
    return !!this.el.querySelector('[slot="header"]');
  }

  /** "Dock to side" is due when the tier resolved to dialog but the viewport
   *  qualifies for the dock — which only happens when the HOST forced 'dialog'
   *  (a collapsed dock). Tapping it emits popRedock. */
  private showRedock(): boolean {
    return this.resolvedTier === 'dialog' && this.viewportWidth >= this.dockMin;
  }

  render() {
    if (!this.open) return null;
    const tier = this.resolvedTier;
    const hasActions = this.hasActions();
    const hasHeader = this.hasHeader();

    if (tier === 'sheet') {
      return (
        <pop-bottom-sheet open sheetTitle={this.heading} onPopClose={this.onInnerClose}>
          {/* Rich header content renders at the top of the sheet body so its
              bespoke control stays reachable on mobile. */}
          {hasHeader && (
            <div class="presenter__sheet-header">
              <slot name="header"></slot>
            </div>
          )}
          <slot></slot>
          {hasActions && (
            <div slot="actions" class="presenter__actions presenter__actions--sheet">
              <slot name="actions"></slot>
            </div>
          )}
        </pop-bottom-sheet>
      );
    }

    if (tier === 'dock') {
      // PLAIN panel container — the host places this element in its layout.
      return (
        <section class="presenter-dock" aria-label={this.heading}>
          <header class="presenter-dock__header">
            <div class="presenter-dock__header-main">
              {hasHeader ? (
                <slot name="header"></slot>
              ) : this.heading ? (
                <span class="presenter-dock__title">{this.heading}</span>
              ) : null}
            </div>
            <button type="button" class="presenter-dock__close" aria-label="Close" onClick={this.close}>
              <pop-icon name="close" />
            </button>
          </header>
          <div class="presenter-dock__body">
            <slot></slot>
          </div>
          {hasActions && (
            <footer class="presenter__actions presenter__actions--dock">
              <slot name="actions"></slot>
            </footer>
          )}
        </section>
      );
    }

    // dialog — footer-less pop-form-dialog; the actions slot renders below the
    // body so submission only ever flows through the slotted footer's events.
    const redock = this.showRedock();
    const useHeaderBar = hasHeader || redock;
    return (
      <pop-form-dialog
        open
        hideFooter
        {...(useHeaderBar ? { headerBar: true } : this.heading ? { dialogTitle: this.heading } : {})}
        onPopClose={this.onInnerClose}
      >
        {useHeaderBar && (
          <div slot="header">
            {hasHeader ? (
              <slot name="header"></slot>
            ) : this.heading ? (
              <span class="presenter__dialog-title">{this.heading}</span>
            ) : null}
          </div>
        )}
        {redock && (
          <div slot="header-actions">
            <button
              type="button"
              class="presenter__redock"
              title="Dock to side"
              aria-label="Dock to side"
              onClick={() => this.popRedock.emit()}
            >
              <pop-icon name="enter-outline" />
            </button>
          </div>
        )}
        <slot></slot>
        {hasActions && (
          <div class="presenter__actions presenter__actions--dialog">
            <slot name="actions"></slot>
          </div>
        )}
      </pop-form-dialog>
    );
  }
}
