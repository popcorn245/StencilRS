import { Component, h, Prop } from '@stencil/core';
import { LibraryBase } from 'some-ui-library';

/** The parent comes from a package: nothing to resolve, so nothing inherited. */
@Component({ tag: 'cmp-extends-unresolved' })
export class CmpExtendsUnresolved extends LibraryBase {
  @Prop() value = 0;

  render() {
    return <output>{this.value}</output>;
  }
}
