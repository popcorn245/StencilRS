import { Component, Event, EventEmitter, Host, Prop, State } from '@stencil/core';

@Component({
  tag: 'pop-toggle',
  styleUrl: 'pop-toggle.css',
  encapsulation: { type: 'shadow' },
})
export class PopToggle {
  /** Text to show. */
  @Prop() label: string = 'pop-toggle';

  @State() active = false;

  /** Fired when the component is toggled. */
  @Event() toggled: EventEmitter<boolean>;

  private toggle = () => {
    this.active = !this.active;
    this.toggled.emit(this.active);
  };

  render() {
    return (
      <Host class={{ active: this.active }}>
        <button onClick={this.toggle}>{this.label}</button>
        <slot />
      </Host>
    );
  }
}
