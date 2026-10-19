import { Component, Element, h } from '@stencil/core';

@Component({ tag: 'global-style-url-cmp', globalStyleUrl: 'global-style-url.css' })
export class GlobalStyleUrlCmp {
  @Element() el: HTMLElement;

  render() {
    return <div>global url</div>;
  }
}
