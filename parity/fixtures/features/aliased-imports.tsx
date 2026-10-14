import { Component as Cmp, Prop as P, State as S, h } from '@stencil/core';

@Cmp({ tag: 'aliased-cmp' })
export class AliasedCmp {
  @P() label: string;
  @S() on = false;

  render() {
    return <div>{this.label}</div>;
  }
}
