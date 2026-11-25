import { Component, Host } from '@stencil/core';

import { boxed, log, shout, twice } from '../../shared/decorators';

/** Decorators that are not Stencil's own: a field, a method and an accessor (docs/decorators.md). */
@Component({
  tag: 'pop-decorated',
  encapsulation: { type: 'shadow' },
})
export class PopDecorated {
  @boxed label = 'init';
  @boxed n = 2;

  @shout('!') hello() {
    return `hi ${this.label}`;
  }

  @twice get twin() {
    return this.n as number;
  }

  connectedCallback() {
    log.push('connected');
  }

  render() {
    return (
      <Host>
        <p>{`${this.label}|${this.hello()}|${this.twin}`}</p>
      </Host>
    );
  }
}
