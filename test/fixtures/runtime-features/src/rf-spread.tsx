import { Component, h, Prop } from '@stencil/core';

@Component({ tag: 'rf-spread', encapsulation: { type: 'shadow' } })
export class RfSpread {
  @Prop() attrs: Record<string, string> = { title: 't' };
  render() {
    return <p {...this.attrs}>spread</p>;
  }
}
