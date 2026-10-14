import { Component, h, Prop, State, Event, EventEmitter, Element, Watch } from '@stencil/core';
import {
  CARD_CONDITIONS,
  CardContainerOption,
  CardDetailModel,
  formatPrice,
  identityParts,
  isResolving,
  parseCardModel,
  parseContainers,
  relativeTime,
} from './card-detail-logic';

/**
 * `pop-card-detail` — the tap-a-card bottom sheet: the ONE place for
 * everything about a collection card. Composed on `pop-bottom-sheet`, fully
 * PRESENTATIONAL: the host passes a plain `card` view-model (JSON attr or
 * property) and owns every API call — the sheet only emits ONE
 * `popCardAction` CustomEvent per user intent (`{ action, payload }`), the
 * same host-owns-IO seam as `pop-list-filter-sort` / `pop-user-select`.
 *
 * Layout (phone-first, one column): large art (with a thumbnail toggle to the
 * user's own photo) → identity block (name · set code · rarity · edition ·
 * condition, needs-review badge) → quantity stepper → price row + refresh →
 * printing row (chevron → the `printing-picker` slot the HOST fills with its
 * printings list) → action list (Move to binder · Split stack when quantity
 * ≥ 2 · Delete with confirm).
 *
 * States: `card.scanState === 'scanning'` renders the READ-ONLY resolving
 * state (art + name + "resolving printing & price…" + Delete only) — the
 * worker may merge-and-delete the placeholder at any moment. A needs-review
 * card leads with the badge + reason and a "Pick the printing" CTA
 * (`hasPasscode: false` swaps it for Rescan).
 *
 * Actions emitted (host route mapping lives in the host):
 *   `qty` {delta} · `refresh-price` · `open-printings` · `set-condition`
 *   {condition} · `move` {containerId} · `split` {condition} · `delete` ·
 *   `rescan`
 *
 * Slots:
 *   • printing-picker — the host's printings list UI (shown while
 *     `printingsOpen`; the host lazy-fetches on `open-printings`).
 *   • actions — host-specific extras appended to the action list.
 */
@Component({
  tag: 'pop-card-detail',
  encapsulation: { type: 'scoped' },
  styleUrl: 'card-detail.css',
})
export class PopCardDetail {
  @Element() el!: HTMLElement;

  /** Whether the sheet is open (host-controlled). */
  @Prop() open = false;

  /** The card view-model — JSON attr or object property (see CardDetailModel). */
  @Prop() card: string | CardDetailModel | null = null;

  /** Binder/container options for Move — JSON attr or array property. */
  @Prop() containers: string | CardContainerOption[] = '[]';

  /** Condition grades offered by the condition + split pickers (JSON array). */
  @Prop() conditions: string | string[] = JSON.stringify(CARD_CONDITIONS);

  /** Host is mid-request → mutation controls disable (optional). */
  @Prop() busy = false;

  /** The printing picker area is expanded (host may also drive this, e.g. the
   *  needs-review deep-link). Toggled by the printing row / review CTA. */
  @Prop({ mutable: true }) printingsOpen = false;

  /** ONE event per user intent; the host owns the API call + revalidate. */
  @Event({ composed: true, bubbles: true }) popCardAction!: EventEmitter<{ action: string; payload?: Record<string, unknown> }>;

  /** Re-emitted when the sheet closes (backdrop / swipe / Esc / host). */
  @Event({ composed: true, bubbles: true }) popCardClose!: EventEmitter<void>;

  /** Showing the user's own photo instead of the canonical art. */
  @State() showPhoto = false;
  /** The Move-to-binder chooser row is expanded. */
  @State() moveOpen = false;
  /** The Split-stack condition chooser is expanded. */
  @State() splitOpen = false;

  /** The delete-confirm dialog element (typed structurally — the generated
   *  HTMLPopConfirmDialogElement global only exists post-build). */
  private confirmEl?: HTMLElement & { confirm(): Promise<boolean> };

  @Watch('open')
  onOpenChange(open: boolean) {
    if (!open) this.resetTransient();
  }

  @Watch('card')
  onCardChange() {
    // A different card (or a revalidated model) → drop per-card view state.
    this.showPhoto = false;
  }

  private resetTransient() {
    this.showPhoto = false;
    this.moveOpen = false;
    this.splitOpen = false;
    this.printingsOpen = false;
  }

  private get model(): CardDetailModel | null {
    return parseCardModel(this.card);
  }

  private get containerOptions(): CardContainerOption[] {
    return parseContainers(this.containers);
  }

  private get conditionOptions(): string[] {
    if (Array.isArray(this.conditions)) return this.conditions.filter((c) => typeof c === 'string' && c);
    try {
      const arr = JSON.parse(this.conditions);
      return Array.isArray(arr) ? arr.filter((c: unknown): c is string => typeof c === 'string' && !!c) : CARD_CONDITIONS;
    } catch {
      return CARD_CONDITIONS;
    }
  }

  private emit(action: string, payload?: Record<string, unknown>) {
    this.popCardAction.emit(payload ? { action, payload } : { action });
  }

  private onClose = () => {
    this.resetTransient();
    this.popCardClose.emit();
  };

  private togglePrintings = () => {
    const next = !this.printingsOpen;
    this.printingsOpen = next;
    if (next) this.emit('open-printings');
  };

  private async onDelete() {
    const ok = await this.confirmEl?.confirm();
    if (ok) this.emit('delete');
  }

  // ── render pieces ──────────────────────────────────────────────────────────

  private renderArt(m: CardDetailModel) {
    const canonical = m.imageUrl || null;
    const photo = m.photoUrl || null;
    // No canonical art → the user photo (if any) is primary.
    const primary = canonical ?? photo;
    const src = this.showPhoto && photo ? photo : primary;
    return (
      <div class="pcd__art">
        {src ? (
          <img class="pcd__art-img" src={src} alt={m.name} loading="lazy" />
        ) : (
          <div class="pcd__art-ph" aria-hidden="true">🃏</div>
        )}
        {canonical && photo && (
          <button
            type="button"
            class={{ 'pcd__photo-toggle': true, 'pcd__photo-toggle--on': this.showPhoto }}
            aria-pressed={String(this.showPhoto)}
            aria-label={this.showPhoto ? 'Show the card art' : 'Show your photo'}
            title={this.showPhoto ? 'Show the card art' : 'Show your photo'}
            onClick={() => (this.showPhoto = !this.showPhoto)}
          >
            <img src={this.showPhoto ? canonical : photo} alt="" loading="lazy" />
          </button>
        )}
      </div>
    );
  }

  private renderIdentity(m: CardDetailModel, resolving: boolean) {
    const parts = identityParts(m);
    return (
      <div class="pcd__identity">
        <h3 class="pcd__name">{m.name}</h3>
        {m.needsReview && !resolving && (
          <div class="pcd__review" role="status">
            <span class="pcd__review-badge">⚠️ needs review</span>
            {m.reviewReason && <span class="pcd__review-reason">{m.reviewReason}</span>}
          </div>
        )}
        {(parts.length > 0 || m.containerName) && (
          <div class="pcd__meta">
            {parts.map((p, i) => [i > 0 && <span class="pcd__dot" aria-hidden="true">·</span>, <span class="pcd__meta-part">{p}</span>])}
            {m.containerName && [parts.length > 0 && <span class="pcd__dot" aria-hidden="true">·</span>, <span class="pcd__meta-part">📦 {m.containerName}</span>]}
          </div>
        )}
        {!resolving && this.renderCondition(m)}
      </div>
    );
  }

  private renderCondition(m: CardDetailModel) {
    const current = (m.condition ?? '').toUpperCase();
    const options = this.conditionOptions;
    return (
      <label class="pcd__condition">
        <span class="pcd__label">Condition</span>
        <select
          class="pcd__select"
          disabled={this.busy}
          onChange={(e) => {
            const condition = (e.target as HTMLSelectElement).value;
            if (condition && condition !== current) this.emit('set-condition', { condition });
          }}
        >
          {!current && <option value="" selected>—</option>}
          {options.map((c) => (
            <option value={c} selected={c === current}>{c}</option>
          ))}
          {current && !options.includes(current) && <option value={current} selected>{current}</option>}
        </select>
      </label>
    );
  }

  private renderQuantity(m: CardDetailModel) {
    return (
      <div class="pcd__row pcd__qty-row">
        <span class="pcd__label">Quantity</span>
        <div class="pcd__stepper">
          <button
            type="button"
            class="pcd__iconbtn"
            aria-label={`Decrease quantity of ${m.name}`}
            disabled={this.busy || m.quantity <= 0}
            onClick={() => this.emit('qty', { delta: -1 })}
          >
            <pop-icon name="remove" />
          </button>
          <span class="pcd__qty" aria-live="polite">{m.quantity}</span>
          <button
            type="button"
            class="pcd__iconbtn"
            aria-label={`Increase quantity of ${m.name}`}
            disabled={this.busy}
            onClick={() => this.emit('qty', { delta: 1 })}
          >
            <pop-icon name="add" />
          </button>
        </div>
      </div>
    );
  }

  private renderPrice(m: CardDetailModel) {
    const unpriced = typeof m.price !== 'number';
    const asOf = relativeTime(m.priceUpdatedAt);
    return (
      <div class="pcd__row pcd__price-row">
        <span class="pcd__label">Price</span>
        <span class={{ pcd__price: true, 'pcd__price--none': unpriced }}>{formatPrice(m.price)}</span>
        {!unpriced && asOf && <span class="pcd__asof">as of {asOf}</span>}
        <button
          type="button"
          class={{ pcd__iconbtn: true, 'pcd__refresh--cta': unpriced }}
          aria-label="Refresh price"
          title="Refresh price"
          disabled={this.busy}
          onClick={() => this.emit('refresh-price')}
        >
          <pop-icon name="refresh-outline" />
        </button>
      </div>
    );
  }

  private renderPrinting(m: CardDetailModel) {
    return (
      <div class="pcd__printing">
        <button
          type="button"
          class="pcd__row pcd__rowbtn"
          aria-expanded={String(this.printingsOpen)}
          disabled={this.busy || m.hasPasscode === false}
          onClick={this.togglePrintings}
        >
          <span class="pcd__label">Printing</span>
          <span class="pcd__printing-code">{m.setCode || '—'}</span>
          <pop-icon class="pcd__chev" name={this.printingsOpen ? 'chevron-down' : 'chevron-forward'} />
        </button>
        {/* The slot stays rendered (scoped-slot rule) — visibility via CSS so
            late host projection still lands. */}
        <div class={{ 'pcd__printing-body': true, 'pcd__printing-body--open': this.printingsOpen }}>
          <slot name="printing-picker" />
        </div>
      </div>
    );
  }

  /** Needs-review lead CTA: Pick the printing (passcode) or Rescan (none). */
  private renderReviewCta(m: CardDetailModel) {
    if (!m.needsReview) return null;
    if (m.hasPasscode === false) {
      return (
        <button type="button" class="pcd__cta" disabled={this.busy} onClick={() => this.emit('rescan')}>
          <pop-icon name="camera-outline" /> Rescan this card
        </button>
      );
    }
    if (this.printingsOpen) return null;
    return (
      <button type="button" class="pcd__cta" disabled={this.busy} onClick={this.togglePrintings}>
        <pop-icon name="albums-outline" /> Pick the printing
      </button>
    );
  }

  private renderActions(m: CardDetailModel) {
    const containers = this.containerOptions;
    return (
      <div class="pcd__actions">
        {containers.length > 0 && (
          <div class="pcd__action">
            <button
              type="button"
              class="pcd__row pcd__rowbtn"
              aria-expanded={String(this.moveOpen)}
              disabled={this.busy}
              onClick={() => (this.moveOpen = !this.moveOpen)}
            >
              <pop-icon name="file-tray-outline" />
              <span class="pcd__action-label">Move to binder</span>
              <pop-icon class="pcd__chev" name={this.moveOpen ? 'chevron-down' : 'chevron-forward'} />
            </button>
            {this.moveOpen && (
              <div class="pcd__action-body">
                {containers.map((c) => (
                  <button
                    type="button"
                    class="pcd__choice"
                    key={c.id}
                    disabled={this.busy}
                    onClick={() => {
                      this.moveOpen = false;
                      this.emit('move', { containerId: c.id });
                    }}
                  >
                    📦 {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {m.quantity >= 2 && (
          <div class="pcd__action">
            <button
              type="button"
              class="pcd__row pcd__rowbtn"
              aria-expanded={String(this.splitOpen)}
              disabled={this.busy}
              onClick={() => (this.splitOpen = !this.splitOpen)}
            >
              <pop-icon name="copy-outline" />
              <span class="pcd__action-label">Split stack</span>
              <pop-icon class="pcd__chev" name={this.splitOpen ? 'chevron-down' : 'chevron-forward'} />
            </button>
            {this.splitOpen && (
              <div class="pcd__action-body">
                <span class="pcd__hint">Peel one copy off as…</span>
                <div class="pcd__choices">
                  {this.conditionOptions.map((c) => (
                    <button
                      type="button"
                      class="pcd__choice pcd__choice--chip"
                      key={c}
                      disabled={this.busy}
                      onClick={() => {
                        this.splitOpen = false;
                        this.emit('split', { condition: c });
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <slot name="actions" />
        <div class="pcd__action">
          <button type="button" class="pcd__row pcd__rowbtn pcd__rowbtn--danger" disabled={this.busy} onClick={() => void this.onDelete()}>
            <pop-icon name="trash-outline" />
            <span class="pcd__action-label">Delete</span>
          </button>
        </div>
      </div>
    );
  }

  render() {
    const m = this.model;
    if (!this.open || !m) return null;
    const resolving = isResolving(m);
    return (
      <pop-bottom-sheet open sheetTitle={m.name} onPopClose={this.onClose}>
        <div class={{ pcd: true, 'pcd--resolving': resolving }}>
          {this.renderArt(m)}
          {this.renderIdentity(m, resolving)}
          {resolving ? (
            <div class="pcd__resolving" role="status">
              <pop-icon name="hourglass-outline" /> resolving printing &amp; price…
            </div>
          ) : (
            [this.renderQuantity(m), this.renderPrice(m), this.renderReviewCta(m), this.renderPrinting(m)]
          )}
          {resolving ? (
            <div class="pcd__actions">
              <div class="pcd__action">
                <button type="button" class="pcd__row pcd__rowbtn pcd__rowbtn--danger" onClick={() => void this.onDelete()}>
                  <pop-icon name="trash-outline" />
                  <span class="pcd__action-label">Delete</span>
                </button>
              </div>
            </div>
          ) : (
            this.renderActions(m)
          )}
        </div>
        <pop-confirm-dialog
          ref={(el) => (this.confirmEl = el as HTMLElement & { confirm(): Promise<boolean> })}
          confirmTitle="Delete card"
          message={`Delete "${m.name}"${m.quantity > 1 ? ` (all ${m.quantity} copies)` : ''}?`}
          confirmLabel="Delete"
          danger
        />
      </pop-bottom-sheet>
    );
  }
}
