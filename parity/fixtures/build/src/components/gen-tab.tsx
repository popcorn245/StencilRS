import { Component, h } from '@stencil/core';

@Component({ tag: 'gen-tab' })
export class GenTab {
  render() {
    return <slot />;
  }
}
