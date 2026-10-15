import { AttachInternals, AttrDeserialize, Component, Event, EventEmitter, Prop, PropSerialize, Watch } from '@stencil/core';

/**
 * A form-associated date input. `value` is a `Date`; its attribute (and the form value) is the
 * ISO day, `YYYY-MM-DD`: `@AttrDeserialize` and `@PropSerialize` translate between the two.
 */
@Component({
  tag: 'pop-date-field',
  styleUrl: 'pop-date-field.css',
  encapsulation: { type: 'shadow' },
})
export class PopDateField {
  @AttachInternals() internals: ElementInternals;

  /** The field's name in its form. */
  @Prop() name = '';

  /** The selected day. */
  @Prop({ mutable: true }) value?: Date;

  /** Fired when the user picks a day. */
  @Event() dateChange: EventEmitter<Date | undefined>;

  @PropSerialize('value')
  valueToAttr(value?: Date) {
    return value ? value.toISOString().slice(0, 10) : null;
  }

  @AttrDeserialize('value')
  valueFromAttr(value: string | null) {
    return value ? new Date(`${value}T00:00:00Z`) : undefined;
  }

  componentWillLoad() {
    this.syncForm();
  }

  @Watch('value')
  syncForm() {
    this.internals.setFormValue(this.valueToAttr(this.value));
  }

  private onInput = (e: Event) => {
    const day = (e.target as HTMLInputElement).value;
    this.value = this.valueFromAttr(day || null);
    this.dateChange.emit(this.value);
  };

  render() {
    return <input type="date" value={this.valueToAttr(this.value) ?? ''} onInput={this.onInput} />;
  }
}
