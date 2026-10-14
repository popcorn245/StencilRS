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

interface ListLine {
  id: string;
  label: string;
  checked: boolean;
  qty?: string;
}

/**
 * pop-thread-card-list — the Thread Model v2 renderer for a grocery / inventory
 * list card.
 *
 * Renders a checkbox list with an "N left" count. Tapping a line emits
 * `popCardAction` with `{ actionId: 'check', params: { lineId, checked } }` —
 * the per-line tap IS the check action, so there is no footer check button.
 * Frozen cards render the lines read-only and struck through.
 *
 *   payload.data = { lines: { id, label, checked, qty? }[];
 *                    postedAt: number; listId?: string }
 */
@Component({
  tag: 'pop-thread-card-list',
  encapsulation: { type: 'scoped' },
  styleUrl: 'thread-card-list.css',
})
export class PopThreadCardList {
  /** The validated card payload object (set as a PROPERTY, not an attribute). */
  @Prop() payload!: CardPayload;
  /** `frozen` = historical snapshot: muted chrome, read-only lines. */
  @Prop() liveness: CardLiveness = 'live';
  /** Viewer / public render — no action buttons, no line taps. */
  @Prop() readonly = false;

  /** Emitted when the user taps a line or one of the card's actions. */
  @Event({ composed: true, bubbles: true }) popCardAction!: EventEmitter<CardActionDetail>;

  private footerActions(listId: string): CardAction[] {
    const params = listId ? { listId } : undefined;
    return [
      { actionId: 'add', label: 'Add an item', icon: 'add-outline', mutating: true, params },
      { actionId: 'open', label: 'Open panel', icon: 'open-outline', mutating: false, params },
    ];
  }

  /** Coerce `data.lines` into renderable rows. Never throws. */
  private static lines(raw: unknown): ListLine[] {
    if (!Array.isArray(raw)) return [];
    const out: ListLine[] = [];
    raw.forEach((entry, i) => {
      if (typeof entry !== 'object' || entry === null) return;
      const line = entry as Record<string, unknown>;
      const label = typeof line.label === 'string' ? line.label.trim() : '';
      if (!label) return;
      out.push({
        id: typeof line.id === 'string' && line.id ? line.id : `line-${i}`,
        label,
        checked: line.checked === true,
        qty: typeof line.qty === 'string' && line.qty.trim() ? line.qty.trim() : undefined,
      });
    });
    return out;
  }

  private fire(actionId: string, params?: Record<string, unknown>) {
    this.popCardAction.emit({ actionId, params });
  }

  private renderActions(frozen: boolean, listId: string) {
    const actions = visibleActions(this.footerActions(listId), frozen ? 'frozen' : 'live', this.readonly);
    if (!actions.length) return null;
    return (
      <div class="tcl__actions">
        {actions.map((a) => (
          <button
            key={a.actionId}
            class="pop-iconbtn tcl__btn"
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
      return <div class="tcl tcl--broken">{CARD_FALLBACK_TEXT}</div>;
    }

    const data = card.data as { lines?: unknown; postedAt?: unknown; listId?: unknown };
    const lines = PopThreadCardList.lines(data.lines);
    const listId = typeof data.listId === 'string' ? data.listId : '';
    const frozen = this.liveness === 'frozen';
    // Lines are only tappable on a live, non-readonly card.
    const interactive = !frozen && !this.readonly;
    const left = lines.filter((l) => !l.checked).length;
    const title = card.title || 'List';

    return (
      <div class={{ tcl: true, 'tcl--frozen': frozen }}>
        <div class="tcl__head">
          <ion-icon class="tcl__glyph" name="list-outline" aria-hidden="true" />
          <div class="tcl__titles">
            <span class="tcl__title">{title}</span>
            {card.subtitle && <span class="tcl__subtitle">{card.subtitle}</span>}
          </div>
          <span class="tcl__count">{left} left</span>
        </div>

        {lines.length === 0 ? (
          <p class="tcl__empty">Nothing on this list yet.</p>
        ) : (
          <ul class="tcl__lines">
            {lines.map((line) =>
              interactive ? (
                <li key={line.id} class={{ tcl__line: true, 'tcl__line--checked': line.checked }}>
                  <button
                    class="pop-iconbtn tcl__tap"
                    type="button"
                    aria-label={`${line.checked ? 'Uncheck' : 'Check'} ${line.label}`}
                    aria-pressed={line.checked ? 'true' : 'false'}
                    onClick={() => this.fire('check', { lineId: line.id, checked: !line.checked })}
                  >
                    <ion-icon
                      name={line.checked ? 'checkbox-outline' : 'square-outline'}
                      aria-hidden="true"
                    />
                    <span class="tcl__label">{line.label}</span>
                    {line.qty && <span class="tcl__qty">{line.qty}</span>}
                  </button>
                </li>
              ) : (
                <li key={line.id} class={{ tcl__line: true, 'tcl__line--checked': line.checked }}>
                  <span class="tcl__static">
                    <ion-icon
                      name={line.checked ? 'checkbox-outline' : 'square-outline'}
                      aria-hidden="true"
                    />
                    <span class="tcl__label">{line.label}</span>
                    {line.qty && <span class="tcl__qty">{line.qty}</span>}
                  </span>
                </li>
              ),
            )}
          </ul>
        )}

        {card.assignees.length > 0 && (
          <div class="tcl__people">
            {card.assignees.map((p) => (
              <span key={p.uid || p.displayName} class="tcl__chip">
                {p.displayName}
              </span>
            ))}
          </div>
        )}

        {this.renderActions(frozen, listId)}
      </div>
    );
  }

  render() {
    // A single broken card must never blank the timeline it lives in.
    try {
      return this.renderCard();
    } catch {
      return <div class="tcl tcl--broken">{CARD_FALLBACK_TEXT}</div>;
    }
  }
}
