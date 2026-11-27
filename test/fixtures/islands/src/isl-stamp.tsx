import { Component, Prop, h } from '@stencil/core';

@Component({ tag: 'isl-stamp', encapsulation: { type: 'shadow' } })
export class IslStamp {
  @Prop() text = 'stamp';

  render() {
    return <em>{this.text}</em>;
  }
}
