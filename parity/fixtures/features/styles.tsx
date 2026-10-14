import { Component, h } from '@stencil/core';

@Component({
  tag: 'styles-cmp',
  styleUrls: ['styles-a.css', 'styles-b.css'],
  encapsulation: { type: 'shadow' },
})
export class StylesCmp {
  render() {
    return <div class="a">styled</div>;
  }
}
