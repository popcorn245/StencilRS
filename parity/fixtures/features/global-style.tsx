import { Component, h } from '@stencil/core';

@Component({ tag: 'global-style-cmp', globalStyle: 'a { color: red }' })
export class GlobalStyleCmp {
  render() {
    return <div>global</div>;
  }
}
