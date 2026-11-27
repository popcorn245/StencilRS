import { Component, Prop, h } from '@stencil/core';

@Component({ tag: 'isl-note', encapsulation: { type: 'shadow' } })
export class IslNote {
  @Prop() text = 'note';

  render() {
    return <em>{this.text}</em>;
  }
}
