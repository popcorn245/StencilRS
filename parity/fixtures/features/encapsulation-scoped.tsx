import { Component, h } from '@stencil/core';

@Component({ tag: 'scoped-cmp', encapsulation: { type: 'scoped' } })
export class ScopedCmp {
  render() {
    return <slot />;
  }
}
