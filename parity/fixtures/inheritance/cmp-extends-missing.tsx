import { Component, h, Mixin } from '@stencil/core';

import { NotExported } from './bases/plain-base';
import { byReference } from './bases/factories';

/** Two parents Stencil can't read: a name the module doesn't declare, and a factory returning a class by reference. */
@Component({ tag: 'cmp-extends-missing' })
export class CmpExtendsMissing extends Mixin(NotExported, byReference) {
  render() {
    return <hr />;
  }
}
