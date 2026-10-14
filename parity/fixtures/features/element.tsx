import { Component, Element, h } from '@stencil/core';

@Component({ tag: 'element-cmp' })
export class ElementCmp {
  @Element() host: HTMLElement;

  render() {
    return <div>{this.host.tagName}</div>;
  }
}
