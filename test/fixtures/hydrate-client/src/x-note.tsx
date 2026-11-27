import { Component, h, Prop } from '@stencil/core';

@Component({ tag: 'x-note', encapsulation: { type: 'shadow' } })
export class XNote {
  @Prop() text = '';
  render() {
    return <em class="note">{this.text}</em>;
  }
}
