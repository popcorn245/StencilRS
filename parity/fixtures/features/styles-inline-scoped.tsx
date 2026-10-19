import { Component, h } from '@stencil/core';

@Component({
  tag: 'inline-scoped',
  encapsulation: { type: 'scoped' },
  styles: `
    :host { display: block; }
    :host(.open) .panel, :host-context([dir=rtl]) .panel { margin: 0; }
    ::slotted(span) { color: red; }
    .item > a:hover, li:nth-child(2n + 1) { content: "\`"; }
    x::part(label) { color: blue; }
    @media (min-width: 600px) { .panel { padding: 1rem; } }
  `,
})
export class InlineScoped {
  render() {
    return (
      <div class="panel">
        <slot />
      </div>
    );
  }
}
