import { Component, h } from '@stencil/core';

@Component({ tag: 'rf-light', styles: '.l{color:red}', encapsulation: { type: 'scoped' } })
export class RfLight {
  render() {
    return (
      <div class="l">
        <slot />
      </div>
    );
  }
}
