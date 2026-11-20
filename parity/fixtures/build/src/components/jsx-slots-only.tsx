import { Component, h } from '@stencil/core';

@Component({ tag: 'build-jsx-slots-only', encapsulation: { type: 'shadow' } })
export class BuildJsxSlotsOnly {
  render() {
    return (
      <div>
        <slot name="b"></slot>
        <slot name="a"></slot>
        <slot name="b"></slot>
        <slot></slot>
      </div>
    );
  }
}
