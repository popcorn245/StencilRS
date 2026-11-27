import { Component, h } from '@stencil/core';

/** Used by a static island only: with client="static" its module is never requested. */
@Component({ tag: 'ex-note', encapsulation: { type: 'shadow' }, styles: ':host{display:block;color:#555;font-size:.9em}' })
export class ExNote {
  render() {
    return (
      <p>
        <slot />
      </p>
    );
  }
}
