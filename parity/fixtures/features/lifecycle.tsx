import { Component, Prop, h } from '@stencil/core';

@Component({ tag: 'lifecycle-cmp' })
export class LifecycleCmp {
  @Prop() value: string;

  connectedCallback() {}
  disconnectedCallback() {}
  componentWillLoad() {}
  componentDidLoad() {}
  componentWillRender() {}
  componentDidRender() {}
  componentWillUpdate() {}
  componentDidUpdate() {}

  render() {
    return <div>{this.value}</div>;
  }
}
