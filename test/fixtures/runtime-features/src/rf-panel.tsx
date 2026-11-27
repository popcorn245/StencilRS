import { Component, h } from '@stencil/core';

@Component({ tag: 'rf-panel', styles: ':host{display:block}', encapsulation: { type: 'shadow' } })
export class RfPanel {
  render() {
    return (
      <section>
        <header>
          <slot name="title" />
        </header>
        <rf-counter label="inner" />
        <main>
          <slot />
        </main>
      </section>
    );
  }
}
