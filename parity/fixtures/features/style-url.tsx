import { Component, h } from '@stencil/core';

@Component({ tag: 'style-url-cmp', styleUrl: 'style-url.scss' })
export class StyleUrlCmp {
  render() {
    return <div>styled</div>;
  }
}
