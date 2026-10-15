import { Component, Host, Mixin, Prop } from '@stencil/core';

import { withTone } from '../../shared/with-tone';

/** Mixins: `tone` (and its watcher) come from the withTone factory. */
@Component({
  tag: 'pop-tone-chip',
  styleUrl: 'pop-tone-chip.css',
  encapsulation: { type: 'shadow' },
})
export class PopToneChip extends Mixin(withTone) {
  /** Text to show. */
  @Prop() text = 'chip';

  private flip = () => {
    this.tone = this.tone === 'red' ? 'blue' : 'red';
  };

  render() {
    return (
      <Host onClick={this.flip}>
        <span class={this.tone}>{this.text}</span>
      </Host>
    );
  }
}
