import { Component, h } from '@stencil/core';

@Component({ tag: 'rf-vnode', encapsulation: { type: 'shadow' } })
export class RfVnode {
  render() {
    return h('p', { class: 'v' }, 'vnode');
  }
}
