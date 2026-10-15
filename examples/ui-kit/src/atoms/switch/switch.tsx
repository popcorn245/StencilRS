import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';

/**
 * pop-switch — an accessible toggle switch (atom).
 *
 * The ARIA toggle extracted (behavior-verbatim) from bucket-hub's bespoke
 * `hub-switch` markup: a real <button role="switch">, `aria-checked`, Space/
 * Enter toggle (native button activation), token-driven focus ring.
 *
 *   <pop-switch label="Web only" checked onPopChange={e => (on = e.detail)} />
 *
 * Used standalone and by `pop-field type="boolean"`. The `label` prop is the
 * accessible name; render your own visible label row next to it when needed.
 */
@Component({
  tag: 'pop-switch',
  encapsulation: { type: 'scoped' },
  styleUrl: 'switch.css',
})
export class PopSwitch {
  /** Whether the switch is on. */
  @Prop({ mutable: true }) checked = false;
  @Prop() disabled = false;
  /** Accessible name (aria-label); visually optional. */
  @Prop() label?: string;

  /** Emitted with the NEW checked state whenever the switch toggles. */
  @Event() popChange!: EventEmitter<boolean>;

  private toggle = () => {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.popChange.emit(this.checked);
  };

  render() {
    return (
      <button
        type="button"
        class={{ sw: true, 'sw--on': this.checked }}
        role="switch"
        aria-checked={this.checked ? 'true' : 'false'}
        aria-label={this.label}
        disabled={this.disabled}
        onClick={this.toggle}
      >
        <span class="sw__knob" aria-hidden="true"></span>
      </button>
    );
  }
}
