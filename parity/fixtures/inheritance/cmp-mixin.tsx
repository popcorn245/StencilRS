import { Component, h, Mixin, Prop } from '@stencil/core';

import { withCount, withLabel, withTheme } from './bases/mixins';

@Component({ tag: 'cmp-mixin' })
export class CmpMixin extends Mixin(withCount, withLabel, withTheme) {
  @Prop() suffix = '!';

  render() {
    return (
      <span class={this.theme}>
        {this.label}: {this.count}
        {this.suffix}
      </span>
    );
  }
}
