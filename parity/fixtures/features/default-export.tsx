import { Component, Prop, h } from '@stencil/core';

@Component({ tag: 'default-export' })
export default class DefaultExport {
  @Prop() value: string;

  render() {
    return <div>{this.value}</div>;
  }
}
