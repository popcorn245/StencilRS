import { Component, Prop, Event, EventEmitter, Listen, Element, h } from '@stencil/core';

@Component({
  tag: 'pop-chip-group',
  encapsulation: { type: 'scoped' },
  styleUrl: 'chip-group.css',
})
export class ChipGroup {
  @Element() el: HTMLElement;

  @Prop({ mutable: true, reflect: true }) value: string = '';
  @Prop() multiple = false;

  @Event() popChange: EventEmitter<{ value: string; values: string[] }>;

  @Listen('popChipSelect')
  handleChipSelect(event: CustomEvent<{ value: string }>) {
    event.stopPropagation();
    const chipValue = event.detail.value;

    if (this.multiple) {
      const values = this.value ? this.value.split(',') : [];
      const idx = values.indexOf(chipValue);
      if (idx >= 0) values.splice(idx, 1);
      else values.push(chipValue);
      this.value = values.join(',');
      this.popChange.emit({ value: this.value, values });
    } else {
      this.value = chipValue;
      this.popChange.emit({ value: chipValue, values: [chipValue] });
    }

    this.updateChildren();
  }

  componentDidLoad() { this.updateChildren(); }

  private updateChildren() {
    const values = this.value ? this.value.split(',') : [];
    const chips = this.el.querySelectorAll('pop-chip');
    chips.forEach((chip: any) => {
      chip.selected = values.includes(chip.value);
    });
  }

  render() {
    return (
      <div class="chip-group" role={this.multiple ? 'listbox' : 'radiogroup'}>
        <slot></slot>
      </div>
    );
  }
}
