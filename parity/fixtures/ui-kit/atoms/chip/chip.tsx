import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';

@Component({
  tag: 'pop-chip',
  encapsulation: { type: 'scoped' },
  styleUrl: 'chip.css',
})
export class Chip {
  @Prop() value: string;
  @Prop() color: string;
  @Prop({ mutable: true, reflect: true }) selected = false;
  @Prop() removable = false;

  @Event() popChipSelect: EventEmitter<{ value: string }>;
  @Event() popChipRemove: EventEmitter<{ value: string }>;

  private handleClick() {
    this.popChipSelect.emit({ value: this.value });
  }

  private handleRemove(e: MouseEvent) {
    e.stopPropagation();
    this.popChipRemove.emit({ value: this.value });
  }

  render() {
    return (
      <span
        class={{ chip: true, 'chip--selected': this.selected }}
        style={{ '--chip-color': this.color }}
        onClick={() => this.handleClick()}
      >
        <slot></slot>
        {this.removable && (
          <button class="chip-remove" onClick={(e) => this.handleRemove(e)}>&times;</button>
        )}
      </span>
    );
  }
}
