import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';

/**
 * pop-date-time-picker — date + time + All-day toggle.
 *
 *   <pop-date-time-picker
 *     value={'2026-05-29T09:00'}
 *     allDay={false}
 *     onValueChanged={ev => save(ev.detail)}
 *   />
 *
 * Emits `{ value: string | null, allDay: boolean }`. When allDay is true,
 * value is `YYYY-MM-DD`; otherwise `YYYY-MM-DDTHH:MM`. Wraps native
 * date/datetime-local inputs (best mobile picker UX) with a checkbox.
 * Empty value === no due date.
 */

@Component({
  tag: 'pop-date-time-picker',
  encapsulation: { type: 'scoped' },
  styleUrl: 'date-time-picker.css',
})
export class PopDateTimePicker {
  /** ISO-ish string. `YYYY-MM-DDTHH:MM` when timed, `YYYY-MM-DD` when all-day, '' when unset. */
  @Prop({ mutable: true }) value: string = '';
  @Prop({ mutable: true }) allDay: boolean = false;
  @Prop() disabled: boolean = false;

  @Event({ composed: true, bubbles: true })
  valueChanged!: EventEmitter<{ value: string; allDay: boolean }>;

  private toDateOnly(v: string): string {
    if (!v) return '';
    return v.length >= 10 ? v.slice(0, 10) : v;
  }

  private toDateTime(v: string): string {
    if (!v) return '';
    if (v.includes('T')) return v;
    return `${v}T09:00`;
  }

  private commit(value: string, allDay: boolean) {
    this.value = value;
    this.allDay = allDay;
    this.valueChanged.emit({ value, allDay });
  }

  private handleAllDayToggle = (e: Event) => {
    const next = (e.target as HTMLInputElement).checked;
    const v = next ? this.toDateOnly(this.value) : this.toDateTime(this.value);
    this.commit(v, next);
  };

  private handleDateInput = (e: Event) => {
    const v = (e.target as HTMLInputElement).value;
    this.commit(v, this.allDay);
  };

  private handleClear = (e: MouseEvent) => {
    e.preventDefault();
    this.commit('', this.allDay);
  };

  render() {
    return (
      <div class="pdtp">
        <input
          class="pdtp__input"
          type={this.allDay ? 'date' : 'datetime-local'}
          value={this.value}
          disabled={this.disabled}
          onInput={this.handleDateInput}
        />
        <label class="pdtp__toggle">
          <input
            type="checkbox"
            checked={this.allDay}
            disabled={this.disabled}
            onChange={this.handleAllDayToggle}
          />
          <span>All day</span>
        </label>
        {this.value && !this.disabled && (
          <button
            type="button"
            class="pdtp__clear"
            aria-label="Clear due date"
            onClick={this.handleClear}
          >
            ×
          </button>
        )}
      </div>
    );
  }
}
