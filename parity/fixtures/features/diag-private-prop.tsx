import { Component, Prop, h } from '@stencil/core';

@Component({ tag: 'diag-private-prop' })
export class DiagPrivateProp {
  @Prop() private secret: string;

  render() {
    return <div />;
  }
}
