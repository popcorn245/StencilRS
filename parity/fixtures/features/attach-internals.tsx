import { AttachInternals, Component, h, Prop } from '@stencil/core';

/** A form-associated input: @AttachInternals with no options. */
@Component({ tag: 'attach-internals-cmp', encapsulation: { type: 'shadow' } })
export class AttachInternalsCmp {
  @AttachInternals() internals: ElementInternals;

  @Prop() value = '';

  private onInput = (e: Event) => {
    this.internals.setFormValue((e.target as HTMLInputElement).value);
  };

  render() {
    return <input value={this.value} onInput={this.onInput} />;
  }
}
