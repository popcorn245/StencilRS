import { Component, Event, EventEmitter, Host, Method, Prop, State } from '@stencil/core';

@Component({
  tag: 'pop-counter',
  styleUrl: 'pop-counter.css',
  encapsulation: { type: 'shadow' },
})
export class PopCounter {
  /** Text shown before the count. */
  @Prop() label: string = 'Count';

  /** How much each click adds. */
  @Prop() step: number = 1;

  @State() count = 0;

  /** Fired with the new count after every change. */
  @Event() countChanged: EventEmitter<number>;

  /** Set the count back to zero. */
  @Method()
  async reset(): Promise<void> {
    this.set(0);
  }

  private set(value: number) {
    this.count = value;
    this.countChanged.emit(value);
  }

  render() {
    return (
      <Host>
        <span class="label">{this.label}</span>
        <output>{this.count}</output>
        <button onClick={() => this.set(this.count + this.step)}>+{this.step}</button>
      </Host>
    );
  }
}
