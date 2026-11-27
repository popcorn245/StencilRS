import { Component, h } from '@stencil/core';
import { Signal } from '@popcorn245/stencilrs/signals';

@Component({ tag: 'rf-signal', encapsulation: { type: 'shadow' } })
export class RfSignal {
  @Signal() n = 0;
  render() {
    return <button onClick={() => this.n++}>{this.n}</button>;
  }
}
