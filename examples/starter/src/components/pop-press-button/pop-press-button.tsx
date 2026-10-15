import { Component, Prop } from '@stencil/core';

import { Pressable } from '../../shared/pressable';

/** Inheritance: `disabled`, `pressCount` and `pressed` come from the Pressable base class. */
@Component({
  tag: 'pop-press-button',
  styleUrl: 'pop-press-button.css',
  encapsulation: { type: 'shadow' },
})
export class PopPressButton extends Pressable {
  /** Text to show. */
  @Prop() label = 'Press me';

  render() {
    return (
      <button disabled={this.disabled} onClick={this.press}>
        {this.label} ({this.pressCount})
      </button>
    );
  }
}
