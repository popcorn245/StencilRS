import { Component, h } from '@stencil/core';

import { BaseProps } from './bases/barrel';

@Component({ tag: 'cmp-extends-barrel' })
export class CmpExtendsBarrel extends BaseProps {
  render() {
    return <b>{this.greeting}</b>;
  }
}
