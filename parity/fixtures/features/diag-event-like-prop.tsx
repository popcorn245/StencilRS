import { Component, Prop, h } from '@stencil/core';

@Component({ tag: 'diag-event-like-prop' })
export class DiagEventLikeProp {
  @Prop() onSelect: string;

  render() {
    return <div />;
  }
}
