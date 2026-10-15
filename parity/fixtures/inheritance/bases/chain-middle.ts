import { Prop, State } from '@stencil/core';

import { BaseProps } from './base-props';

/** The middle of a chain: adds members on top of BaseProps. */
export class ChainMiddle extends BaseProps {
  @Prop() middle: number = 2;
  @State() open = false;

  toggle() {
    this.open = !this.open;
  }
}
