import { Component, h, State } from '@stencil/core';

import { PlainBase } from './bases/plain-base';

@Component({ tag: 'cmp-extends-plain' })
export class CmpExtendsPlain extends PlainBase {
  @State() ticks = 0;

  render() {
    return <time>{this.elapsed()} ms, {this.ticks}</time>;
  }
}
