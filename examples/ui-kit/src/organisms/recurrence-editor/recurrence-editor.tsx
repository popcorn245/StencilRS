import { Component, h, Prop, Event, EventEmitter, State, Watch } from '@stencil/core';

/**
 * pop-recurrence-editor
 *
 * Pure controlled editor for a `Recurrence` value. Toggling off emits `null`.
 *
 * Schema matches the legacy `recurrence` shape on /api/tasks and
 * /api/schedules (`{ frequency, days?, endDate? }`), with `'yearly'` added
 * per the tasks-app spec.
 */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Recurrence {
  frequency: RecurrenceFrequency;
  /** Weekly: day indices 0=Sun..6=Sat. Monthly: day-of-month (single entry). */
  days?: number[];
  /** ISO date string. */
  endDate?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  tag: 'pop-recurrence-editor',
  encapsulation: { type: 'scoped' },
  styleUrl: 'recurrence-editor.css',
})
export class PopRecurrenceEditor {
  /** Controlled value. `null` means "not recurring". */
  @Prop() value: Recurrence | null = null;

  /** Fired whenever the user changes the value. */
  @Event({ composed: true, bubbles: true }) valueChange: EventEmitter<Recurrence | null>;

  @State() enabled: boolean = false;
  @State() frequency: RecurrenceFrequency = 'weekly';
  @State() days: number[] = [];
  @State() endDate: string = '';

  componentWillLoad() {
    this.hydrateFromValue(this.value);
  }

  @Watch('value')
  onValueChange(next: Recurrence | null) {
    this.hydrateFromValue(next);
  }

  private hydrateFromValue(v: Recurrence | null) {
    if (!v) {
      this.enabled = false;
      this.frequency = 'weekly';
      this.days = [];
      this.endDate = '';
      return;
    }
    this.enabled = true;
    this.frequency = v.frequency;
    this.days = Array.isArray(v.days) ? [...v.days] : [];
    this.endDate = v.endDate || '';
  }

  private emit() {
    if (!this.enabled) {
      this.valueChange.emit(null);
      return;
    }
    const out: Recurrence = { frequency: this.frequency };
    if (this.frequency === 'weekly' || this.frequency === 'monthly') {
      if (this.days.length > 0) out.days = [...this.days].sort((a, b) => a - b);
    }
    if (this.endDate) out.endDate = this.endDate;
    this.valueChange.emit(out);
  }

  private toggleEnabled = (e: Event) => {
    this.enabled = (e.target as HTMLInputElement).checked;
    if (!this.enabled) {
      this.days = [];
      this.endDate = '';
    }
    this.emit();
  };

  private setFrequency = (e: Event) => {
    this.frequency = (e.target as HTMLSelectElement).value as RecurrenceFrequency;
    // Reset days when frequency category changes
    this.days = [];
    this.emit();
  };

  private toggleWeekday = (idx: number) => {
    if (this.days.includes(idx)) this.days = this.days.filter(d => d !== idx);
    else this.days = [...this.days, idx];
    this.emit();
  };

  private setMonthlyDay = (e: Event) => {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    this.days = isNaN(v) ? [] : [v];
    this.emit();
  };

  private setEndDate = (e: Event) => {
    this.endDate = (e.target as HTMLInputElement).value;
    this.emit();
  };

  render() {
    return (
      <div class="pre">
        <label class="pre__row">
          <input
            type="checkbox"
            class="pre__toggle"
            checked={this.enabled}
            onChange={this.toggleEnabled}
          />
          <span>Recurring</span>
        </label>

        {this.enabled && (
          <div class="pre__body">
            <label class="pre__field">
              <span class="pre__label">Frequency</span>
              <select class="pre__select" onChange={this.setFrequency}>
                <option value="daily" selected={this.frequency === 'daily'}>Daily</option>
                <option value="weekly" selected={this.frequency === 'weekly'}>Weekly</option>
                <option value="monthly" selected={this.frequency === 'monthly'}>Monthly</option>
                <option value="yearly" selected={this.frequency === 'yearly'}>Yearly</option>
              </select>
            </label>

            {this.frequency === 'weekly' && (
              <div class="pre__field">
                <span class="pre__label">Days of week</span>
                <div class="pre__weekdays" role="group" aria-label="Days of week">
                  {WEEKDAYS.map((label, idx) => (
                    <button
                      type="button"
                      class={{
                        'pre__day': true,
                        'pre__day--active': this.days.includes(idx),
                      }}
                      aria-pressed={this.days.includes(idx) ? 'true' : 'false'}
                      onClick={() => this.toggleWeekday(idx)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {this.frequency === 'monthly' && (
              <label class="pre__field">
                <span class="pre__label">Day of month</span>
                <input
                  type="number"
                  class="pre__input"
                  min="1"
                  max="31"
                  value={this.days[0] ?? ''}
                  onInput={this.setMonthlyDay}
                />
              </label>
            )}

            <label class="pre__field">
              <span class="pre__label">End date (optional)</span>
              <input
                type="date"
                class="pre__input"
                value={this.endDate}
                onInput={this.setEndDate}
              />
            </label>
          </div>
        )}
      </div>
    );
  }
}
