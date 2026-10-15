import { Event, EventEmitter, Prop, State } from '@stencil/core';

/**
 * Press behaviour shared by components that extend it: a `disabled` prop, a running count and
 * a `pressed` event. A base class has no `@Component`; the components extending it do.
 */
export class Pressable {
  /** Ignore presses. */
  @Prop({ reflect: true }) disabled = false;

  @State() pressCount = 0;

  /** Fired on each press, with the running count. */
  @Event() pressed: EventEmitter<number>;

  protected press = () => {
    if (this.disabled) return;
    this.pressCount++;
    this.pressed.emit(this.pressCount);
  };
}
