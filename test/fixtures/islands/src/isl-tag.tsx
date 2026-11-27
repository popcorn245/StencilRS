import { Component, Prop, h } from '@stencil/core';

@Component({ tag: 'isl-tag', encapsulation: { type: 'scoped' }, styleUrl: 'isl-tag.css' })
export class IslTag {
  @Prop() tone = 'plain';

  render() {
    return (
      <span class={`tag tag-${this.tone}`}>
        <slot></slot>
      </span>
    );
  }
}
