import { Component, h } from '@stencil/core';

@Component({ tag: 'shadow-cmp', encapsulation: { type: 'shadow', delegatesFocus: true } })
export class ShadowCmp {
  render() {
    return <slot />;
  }
}
