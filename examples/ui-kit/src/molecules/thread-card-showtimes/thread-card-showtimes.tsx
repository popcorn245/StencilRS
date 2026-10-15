import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';
import {
  CARD_FALLBACK_TEXT,
  CardAction,
  CardActionDetail,
  CardLiveness,
  CardPayload,
  readCard,
  visibleActions,
} from '../thread-card/thread-card-types';

interface Theater {
  name: string;
  times: string[];
  address?: string;
}

/**
 * pop-thread-card-showtimes — the Thread Model v2 renderer for a movie
 * showtimes card.
 *
 * THEATER-FIRST by design: the theater name is the heading of each group and
 * the showtimes hang under it as chips. This card NEVER renders ticket links.
 *
 * Both actions ("Open theater", "Add to calendar") are navigational, so they
 * survive a freeze; `readonly` still removes them.
 *
 *   payload.data = { date: string; movie: string;
 *                    theaters: { name, times[], address? }[]; timezone?: string }
 */
@Component({
  tag: 'pop-thread-card-showtimes',
  encapsulation: { type: 'scoped' },
  styleUrl: 'thread-card-showtimes.css',
})
export class PopThreadCardShowtimes {
  /** The validated card payload object (set as a PROPERTY, not an attribute). */
  @Prop() payload!: CardPayload;
  /** `frozen` = historical snapshot (a past date): muted chrome. */
  @Prop() liveness: CardLiveness = 'live';
  /** Viewer / public render — no action buttons at all. */
  @Prop() readonly = false;

  /** Emitted when the user taps one of the card's actions. */
  @Event({ composed: true, bubbles: true }) popCardAction!: EventEmitter<CardActionDetail>;

  /** Coerce `data.theaters` into renderable groups. Never throws. */
  private static theaters(raw: unknown): Theater[] {
    if (!Array.isArray(raw)) return [];
    const out: Theater[] = [];
    for (const entry of raw) {
      if (typeof entry !== 'object' || entry === null) continue;
      const t = entry as Record<string, unknown>;
      const name = typeof t.name === 'string' ? t.name.trim() : '';
      if (!name) continue;
      const times = Array.isArray(t.times)
        ? t.times.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
        : [];
      out.push({
        name,
        times,
        address: typeof t.address === 'string' && t.address.trim() ? t.address.trim() : undefined,
      });
    }
    return out;
  }

  private fire(actionId: string, params?: Record<string, unknown>) {
    this.popCardAction.emit({ actionId, params });
  }

  /** Navigational actions only — nothing here mutates, so a freeze keeps them. */
  private footerActions(movie: string, date: string): CardAction[] {
    return [
      {
        actionId: 'add_to_calendar',
        label: 'Add to calendar',
        icon: 'calendar-outline',
        mutating: false,
        params: { movie, date },
      },
    ];
  }

  private renderActions(frozen: boolean, movie: string, date: string) {
    const actions = visibleActions(
      this.footerActions(movie, date),
      frozen ? 'frozen' : 'live',
      this.readonly,
    );
    if (!actions.length) return null;
    return (
      <div class="tcs__actions">
        {actions.map((a) => (
          <button
            key={a.actionId}
            class="pop-iconbtn tcs__btn"
            type="button"
            title={a.label}
            aria-label={a.label}
            onClick={() => this.fire(a.actionId, a.params)}
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
      return <div class="tcs tcs--broken">{CARD_FALLBACK_TEXT}</div>;
    }

    const data = card.data as { date?: unknown; movie?: unknown; theaters?: unknown; timezone?: unknown };
    const date = typeof data.date === 'string' ? data.date.trim() : '';
    const movie = typeof data.movie === 'string' && data.movie.trim() ? data.movie.trim() : '';
    const timezone = typeof data.timezone === 'string' && data.timezone.trim() ? data.timezone.trim() : '';
    const theaters = PopThreadCardShowtimes.theaters(data.theaters);
    const frozen = this.liveness === 'frozen';
    const title = movie || card.title || 'Showtimes';
    // "Open theater" is navigational too, so it only depends on `readonly`.
    const showTheaterLink = !this.readonly;

    return (
      <div class={{ tcs: true, 'tcs--frozen': frozen }}>
        <div class="tcs__head">
          <ion-icon class="tcs__glyph" name="film-outline" aria-hidden="true" />
          <div class="tcs__titles">
            <span class="tcs__title">{title}</span>
            <span class="tcs__subtitle">
              {[date, timezone, card.subtitle].filter(Boolean).join(' · ')}
            </span>
          </div>
        </div>

        {theaters.length === 0 ? (
          <p class="tcs__empty">No showtimes found.</p>
        ) : (
          <ul class="tcs__theaters">
            {theaters.map((t) => (
              <li key={t.name} class="tcs__theater">
                <div class="tcs__theater-head">
                  {/* THEATER-FIRST: the venue is the heading, times hang under it. */}
                  <h4 class="tcs__theater-name">{t.name}</h4>
                  {showTheaterLink && (
                    <button
                      class="pop-iconbtn tcs__btn tcs__btn--inline"
                      type="button"
                      title={`Open ${t.name}`}
                      aria-label={`Open ${t.name}`}
                      onClick={() => this.fire('open_theater', { theater: t.name, address: t.address })}
                    >
                      <ion-icon name="location-outline" aria-hidden="true" />
                    </button>
                  )}
                </div>
                {t.address && <span class="tcs__address">{t.address}</span>}
                {t.times.length === 0 ? (
                  <span class="tcs__no-times">No times listed</span>
                ) : (
                  <div class="tcs__times">
                    {t.times.map((time) => (
                      <span key={time} class="tcs__time">
                        {time}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {this.renderActions(frozen, movie, date)}
      </div>
    );
  }

  render() {
    // A single broken card must never blank the timeline it lives in.
    try {
      return this.renderCard();
    } catch {
      return <div class="tcs tcs--broken">{CARD_FALLBACK_TEXT}</div>;
    }
  }
}
