import { Component, h } from '@stencil/core';

@Component({
  tag: 'inline-styles-cmp',
  styles: ':host { color: red; } .a::after { content: "`${x}\\n"; }',
  encapsulation: { type: 'shadow' },
})
export class InlineStylesCmp {
  render() {
    return <div class="a">styled</div>;
  }
}
