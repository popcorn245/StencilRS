import { Component, h, Prop } from '@stencil/core';

import { BaseProps } from './bases/base-props';

@Component({ tag: 'cmp-extends-import', encapsulation: { type: 'shadow' } })
export class CmpExtendsImport extends BaseProps {
  @Prop() name: string = 'World';

  render() {
    return (
      <button disabled={this.disabled}>
        {this.label()} {this.name}
      </button>
    );
  }
}
