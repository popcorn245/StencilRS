import { Component, Prop } from '@stencil/core';
import { hits, parity, rows } from '../../shared/bound-store';

/**
 * Experimental, stencilrs runtime only: signals passed to the template as they are (`{hits}`,
 * not `{hits.get()}`). Each one updates its own text or attribute; the component doesn't render.
 */
@Component({
  tag: 'pop-bound-counter',
  encapsulation: { type: 'shadow' },
})
export class PopBoundCounter {
  /** Shows a fixed text instead of following the signal. */
  @Prop() frozen = false;

  /** How many times this instance rendered. */
  renders = 0;

  render() {
    this.renders++;
    return (
      <button class={parity} title={parity} onClick={() => hits.set(hits.get() + 1)}>
        <span class="hits">{this.frozen ? 'frozen' : hits}</span>
        <ul>
          {rows.get().map((r) => (
            <li key={r.id}>{r.label}</li>
          ))}
        </ul>
      </button>
    );
  }
}
