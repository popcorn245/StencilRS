import { Component } from '@stencil/core';

@Component({ tag: 'plain-cmp' })
export class PlainCmp {
  private greeting = 'hello';

  render() {
    return this.greeting;
  }
}
