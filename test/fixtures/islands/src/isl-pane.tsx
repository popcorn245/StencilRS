import { Component, Method, Prop, h } from '@stencil/core';

// An ancestor other components ask things of (as Ionic's ion-split-pane, ion-content): isl-where looks it up and calls its method while it renders.
@Component({ tag: 'isl-pane', encapsulation: { type: 'shadow' } })
export class IslPane {
  @Prop() side = 'left';

  @Method()
  async getSide() {
    return this.side;
  }

  render() {
    return <slot></slot>;
  }
}
