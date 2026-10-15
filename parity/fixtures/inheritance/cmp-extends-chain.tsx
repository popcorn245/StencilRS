import { Component, h, Prop } from '@stencil/core';

import { ChainMiddle } from './bases/chain-middle';

@Component({ tag: 'cmp-extends-chain' })
export class CmpExtendsChain extends ChainMiddle {
  @Prop() top = 'top';

  render() {
    return <div class={{ open: this.open }}>{this.top} {this.middle} {this.greeting}</div>;
  }
}
