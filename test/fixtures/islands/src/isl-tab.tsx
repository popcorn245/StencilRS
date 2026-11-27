import { Component, Host, Prop, h } from '@stencil/core';

@Component({ tag: 'isl-tab', encapsulation: { type: 'shadow' } })
export class IslTab {
  @Prop({ mutable: true, reflect: true }) active = false;

  render() {
    return (
      <Host hidden={!this.active}>
        <slot></slot>
      </Host>
    );
  }
}
