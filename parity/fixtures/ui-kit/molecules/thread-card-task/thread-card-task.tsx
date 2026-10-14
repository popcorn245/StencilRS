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

/**
 * pop-thread-card-task — the Thread Model v2 renderer for a task card.
 *
 * Shows the task title, its due date, a priority chip and assignee NAME chips.
 * "Complete" and "Reassign" mutate and disappear once the card is frozen;
 * "Open in Tasks" is navigational and survives a freeze.
 *
 *   payload.data = { taskId: string; status: string; dueDate?: string|null;
 *                    priority?: string|null; questTitle?: string|null }
 */
@Component({
  tag: 'pop-thread-card-task',
  encapsulation: { type: 'scoped' },
  styleUrl: 'thread-card-task.css',
})
export class PopThreadCardTask {
  /** The validated card payload object (set as a PROPERTY, not an attribute). */
  @Prop() payload!: CardPayload;
  /** `frozen` = historical snapshot: muted chrome, no mutating actions. */
  @Prop() liveness: CardLiveness = 'live';
  /** Viewer / public render — no action buttons at all. */
  @Prop() readonly = false;

  /** Emitted when the user taps one of the card's actions. */
  @Event({ composed: true, bubbles: true }) popCardAction!: EventEmitter<CardActionDetail>;

  private actionsFor(taskId: string): CardAction[] {
    const params = taskId ? { taskId } : undefined;
    return [
      { actionId: 'complete', label: 'Complete', icon: 'checkmark-circle-outline', mutating: true, params },
      { actionId: 'reassign', label: 'Reassign', icon: 'people-outline', mutating: true, params },
      { actionId: 'open', label: 'Open in Tasks', icon: 'open-outline', mutating: false, params },
    ];
  }

  private fire(action: CardAction) {
    this.popCardAction.emit({ actionId: action.actionId, params: action.params });
  }

  /** "Aug 3" / the raw string when it isn't parseable. Never throws. */
  private static due(raw: unknown): string {
    if (typeof raw !== 'string' || !raw.trim()) return '';
    const ms = Date.parse(raw);
    if (Number.isNaN(ms)) return raw.trim();
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private renderActions(frozen: boolean, taskId: string) {
    const actions = visibleActions(this.actionsFor(taskId), frozen ? 'frozen' : 'live', this.readonly);
    if (!actions.length) return null;
    return (
      <div class="tcta__actions">
        {actions.map((a) => (
          <button
            key={a.actionId}
            class="pop-iconbtn tcta__btn"
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
      return <div class="tcta tcta--broken">{CARD_FALLBACK_TEXT}</div>;
    }

    const data = card.data as {
      taskId?: unknown;
      status?: unknown;
      dueDate?: unknown;
      priority?: unknown;
      questTitle?: unknown;
    };
    const taskId = typeof data.taskId === 'string' ? data.taskId : '';
    const status = typeof data.status === 'string' ? data.status : '';
    const priority = typeof data.priority === 'string' && data.priority.trim() ? data.priority.trim() : '';
    const quest = typeof data.questTitle === 'string' && data.questTitle.trim() ? data.questTitle.trim() : '';
    const due = PopThreadCardTask.due(data.dueDate);
    const frozen = this.liveness === 'frozen';
    const title = card.title || 'Untitled task';

    return (
      <div class={{ tcta: true, 'tcta--frozen': frozen }}>
        <div class="tcta__head">
          <ion-icon
            class="tcta__glyph"
            name={frozen ? 'checkmark-circle' : 'ellipse-outline'}
            aria-hidden="true"
          />
          <div class="tcta__titles">
            <span class="tcta__title">{title}</span>
            {(card.subtitle || quest) && <span class="tcta__subtitle">{card.subtitle || quest}</span>}
          </div>
        </div>

        <div class="tcta__meta">
          {due && (
            <span class="tcta__chip tcta__chip--due">
              <ion-icon name="calendar-outline" aria-hidden="true" />
              {due}
            </span>
          )}
          {priority && <span class="tcta__chip tcta__chip--priority">{priority}</span>}
          {status && <span class="tcta__chip tcta__chip--status">{status}</span>}
          {card.assignees.map((p) => (
            <span key={p.uid || p.displayName} class="tcta__chip tcta__chip--person">
              {p.displayName}
            </span>
          ))}
        </div>

        {this.renderActions(frozen, taskId)}
      </div>
    );
  }

  render() {
    // A single broken card must never blank the timeline it lives in.
    try {
      return this.renderCard();
    } catch {
      return <div class="tcta tcta--broken">{CARD_FALLBACK_TEXT}</div>;
    }
  }
}
