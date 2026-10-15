import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';
import {
  CARD_FALLBACK_TEXT,
  CardAction,
  CardActionDetail,
  CardAssignee,
  CardLiveness,
  CardPayload,
  readAssignees,
  readCard,
  visibleActions,
} from './thread-card-types';

/**
 * pop-thread-card — the Thread Model v2 card WRAPPER.
 *
 * Every card renderer (`pop-thread-card-timer|task|list|showtimes`, and anything
 * added later) sits INSIDE this component. The wrapper owns the shared chrome:
 * the header, the assignee chips, the action row and the frozen treatment; the
 * renderer owns only the card's own face.
 *
 * The renderer is INJECTED as a tag name (`renderer="pop-thread-card-timer"`) so
 * ui-kit never needs a registry of card types — the host maps cardType → tag and
 * a MISS in that map simply yields no `renderer`. A missing tag, a tag outside
 * the `pop-*` namespace, or a payload too broken to read all degrade to the
 * fallback face (title + subtitle + "couldn't render this card"). The wrapper
 * must NEVER render blank.
 *
 * Props in, `popCardAction` out. No Firebase, no fetch, no Astro.
 */
@Component({
  tag: 'pop-thread-card',
  encapsulation: { type: 'scoped' },
  styleUrl: 'thread-card.css',
})
export class PopThreadCard {
  /** The card's type key (`timer`, `task`, …). Shown as the chrome's type label. */
  @Prop() cardType = '';
  /**
   * The validated card payload object (set as a PROPERTY, not an attribute).
   * Optional on purpose: a missing or broken payload is a supported state that
   * renders the fallback face, so hosts never have to pre-validate.
   */
  @Prop() payload?: CardPayload;
  /** `frozen` = historical snapshot: muted chrome, mutating actions dropped. */
  @Prop() liveness: CardLiveness = 'live';
  /** Wrapper-level actions, before liveness/readonly filtering. */
  @Prop() actions: CardAction[] = [];
  /** People the card is assigned to; falls back to `payload.assignees`. */
  @Prop() assignees: CardAssignee[] = [];
  /** Viewer / public render — no action buttons at all. */
  @Prop() readonly = false;
  /** The `pop-*` tag to mount inside. Unknown/missing ⇒ fallback face. */
  @Prop() renderer?: string;

  /**
   * Emitted when one of the WRAPPER's actions is tapped.
   *
   * The inner renderer emits its own `popCardAction` with
   * `{ composed: true, bubbles: true }`, so renderer actions reach the same
   * listener by natural propagation — the wrapper deliberately does not
   * intercept and re-dispatch them, which would double-fire every action.
   */
  @Event({ composed: true, bubbles: true }) popCardAction!: EventEmitter<CardActionDetail>;

  /** Only a real custom-element tag in our namespace may be mounted. */
  private rendererTag(): string {
    const tag = typeof this.renderer === 'string' ? this.renderer.trim().toLowerCase() : '';
    return /^pop-[a-z0-9-]+$/.test(tag) ? tag : '';
  }

  /** Push the object props onto the dynamically-created renderer element. */
  private hydrate = (el: HTMLElement | null) => {
    if (!el) return;
    const target = el as HTMLElement & {
      payload?: unknown;
      liveness?: CardLiveness;
      readonly?: boolean;
    };
    target.payload = this.payload;
    target.liveness = this.liveness;
    target.readonly = this.readonly;
  };

  private fire(action: CardAction) {
    this.popCardAction.emit({ actionId: action.actionId, params: action.params });
  }

  private renderChips(people: CardAssignee[]) {
    if (!people.length) return null;
    return (
      <div class="tcw__people">
        {people.map((p) => (
          <span key={p.uid || p.displayName} class="tcw__chip">
            {p.displayName}
          </span>
        ))}
      </div>
    );
  }

  private renderActions() {
    const actions = visibleActions(
      Array.isArray(this.actions) ? this.actions : [],
      this.liveness,
      this.readonly,
    );
    if (!actions.length) return null;
    return (
      <div class="tcw__actions">
        {actions.map((a) => (
          <button
            key={a.actionId}
            class="pop-iconbtn tcw__btn"
            type="button"
            title={a.label}
            aria-label={a.label}
            onClick={() => this.fire(a)}
          >
            <ion-icon name={a.icon} aria-hidden="true" />
          </button>
        ))}
      </div>
    );
  }

  private renderCard() {
    const card = readCard(this.payload);
    const frozen = this.liveness === 'frozen';
    const tag = this.rendererTag();
    const people = readAssignees(this.assignees).length
      ? readAssignees(this.assignees)
      : card.assignees;
    const Renderer = tag as any;

    return (
      <div class={{ tcw: true, 'tcw--frozen': frozen, 'tcw--readonly': this.readonly }}>
        <div class="tcw__head">
          <div class="tcw__titles">
            <span class="tcw__title">{card.title || 'Card'}</span>
            {card.subtitle && <span class="tcw__subtitle">{card.subtitle}</span>}
          </div>
          {this.cardType && <span class="tcw__type">{this.cardType}</span>}
          {frozen && (
            <span class="tcw__frozen" title="Historical snapshot">
              <ion-icon name="snow-outline" aria-hidden="true" />
              frozen
            </span>
          )}
        </div>

        <div class="tcw__body">
          {tag && card.ok ? (
            <Renderer class="tcw__renderer" ref={this.hydrate} />
          ) : (
            <p class="tcw__fallback">{CARD_FALLBACK_TEXT}</p>
          )}
        </div>

        {this.renderChips(people)}
        {this.renderActions()}
      </div>
    );
  }

  render() {
    // A single broken card must never blank the timeline it lives in.
    try {
      return this.renderCard();
    } catch {
      return <div class="tcw tcw--broken">{CARD_FALLBACK_TEXT}</div>;
    }
  }
}
