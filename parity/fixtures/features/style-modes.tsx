import { Component, h } from '@stencil/core';

@Component({
  tag: 'style-modes-cmp',
  styleUrls: {
    ios: ['style-modes.ios.css', 'style-modes-extra.ios.css'],
    md: 'style-modes.md.css',
  },
  encapsulation: { type: 'shadow' },
})
export class StyleModesCmp {
  render() {
    return <div>modes</div>;
  }
}
