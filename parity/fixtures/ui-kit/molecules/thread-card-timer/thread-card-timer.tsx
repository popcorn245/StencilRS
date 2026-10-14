import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';
import {
  CARD_FALLBACK_TEXT,
  CardAction,
  CardActionDetail,
  CardLiveness,
  CardPayload,
  formatDuration,
  readCard,
  visibleActions,
} from '../thread-card/thread-card-types';

/**
 * pop-thread-card-timer — the Thread Model v2 renderer for a timer / reminder
 * card.
 *
 * Live cards compose the shipped `pop-countdown` atom (this component NEVER
 * reimplements a ticking clock); frozen cards show the finished face instead.
 * Props in, `popCardAction` out — no Firebase, no fetch.
 *
 *   payload.data = { fireAt: number; mode: 'timer'|'reminder';
 *                    durationMs?: number; label?: string }
 */
@Component({
  tag: 'pop-thread-card-timer',
  encapsulation: { type: 'scoped' },
  styleUrl: 'thread-card-timer.css',
})
export class PopThreadCardTimer {
  /** The validated card payload object (set as a PROPERTY, not an attribute). */
  @Prop() payload!: CardPayload;
  /** `frozen` = historical snapshot: muted chrome, no mutating actions. */
  @Prop() liveness: CardLiveness = 'live';
  /** Viewer / public render — no action buttons at all. */
  @Prop() readonly = false;

  /** Emitted when the user taps one of the card's actions. */
  @Event({ composed: true, bubbles: true }) popCardAction!: EventEmitter<CardActionDetail>;

  /** Every action this card can offer, before liveness/readonly filtering. */
  private static readonly ACTIONS: CardAction[] = [
    { actionId: 'snooze', label: 'Snooze', icon: 'alarm-outline', mutating: true },
    { actionId: 'plus5', label: 'Add 5 minutes', icon: 'add-circle-outline', mutating: true },
    { actionId: 'dismiss', label: 'Dismiss', icon: 'close-circle-outline', mutating: true },
  ];

  private fire(action: CardAction) {
    this.popCardAction.emit({ actionId: action.actionId, params: action.params });
  }

  private renderActions(frozen: boolean) {
    const actions = visibleActions(PopThreadCardTimer.ACTIONS, frozen ? 'frozen' : 'live', this.readonly);
    if (!actions.length) return null;
    return (
      <div class="tct__actions">
        {actions.map((a) => (
          <button
            key={a.actionId}
            class="pop-iconbtn tct__btn"
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
    if (!card.ok) {
      return <div class="tct tct--broken">{CARD_FALLBACK_TEXT}</div>;
    }

    const data = card.data as {
      fireAt?: unknown;
      mode?: unknown;
      durationMs?: unknown;
      label?: unknown;
    };
    const fireAt = typeof data.fireAt === 'number' && Number.isFinite(data.fireAt) ? data.fireAt : 0;
    const mode = data.mode === 'reminder' ? 'reminder' : 'timer';
    const label = typeof data.label === 'string' && data.label.trim() ? data.label.trim() : '';
    const frozen = this.liveness === 'frozen';
    const heading = card.title || label || (mode === 'reminder' ? 'Reminder' : 'Timer');

    return (
      <div class={{ tct: true, 'tct--frozen': frozen }}>
        <div class="tct__head">
          <ion-icon
            class="tct__glyph"
            name={mode === 'reminder' ? 'notifications-outline' : 'timer-outline'}
            aria-hidden="true"
          />
          <div class="tct__titles">
            <span class="tct__title">{heading}</span>
            {card.subtitle && <span class="tct__subtitle">{card.subtitle}</span>}
          </div>
          <span class="tct__mode">{mode}</span>
        </div>

        <div class="tct__face">
          {frozen ? (
            <span class="tct__fired">
              <ion-icon name="checkmark-done-outline" aria-hidden="true" />
              Timer fired
              {typeof data.durationMs === 'number' && (
                <span class="tct__duration"> · {formatDuration(data.durationMs)}</span>
              )}
            </span>
          ) : fireAt ? (
            <pop-countdown deadline={fireAt} overdueText="due" />
          ) : (
            <span class="tct__idle">No time set</span>
          )}
        </div>

        {card.assignees.length > 0 && (
          <div class="tct__people">
            {card.assignees.map((p) => (
              <span key={p.uid || p.displayName} class="tct__chip">
                {p.displayName}
              </span>
            ))}
          </div>
        )}

        {this.renderActions(frozen)}
      </div>
    );
  }

  render() {
    // A single broken card must never blank the timeline it lives in.
    try {
      return this.renderCard();
    } catch {
      return <div class="tct tct--broken">{CARD_FALLBACK_TEXT}</div>;
    }
  }
}
