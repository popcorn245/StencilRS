import { Component } from '@stencil/core';
import { computed } from '@stencil/core/signals';

import { visits } from '../../shared/live-store';

const tone = computed(() => (visits.value % 2 ? 'odd' : 'even'));

/**
 * Stencil 5 signals passed to the template as they are (`{visits}`, not `{visits.value}`). Each
 * one updates its own text or attribute; the component doesn't render again. The same source
 * runs on Stencil's runtime and on the stencilrs runtime.
 */
@Component({
  tag: 'pop-live-counter',
  encapsulation: { type: 'shadow' },
})
export class PopLiveCounter {
  /** How many times this instance rendered. */
  renders = 0;

  render() {
    this.renders++;
    return (
      <button class={tone} onClick={() => visits.value++}>
        <span class="visits">{visits}</span>
      </button>
    );
  }
}
