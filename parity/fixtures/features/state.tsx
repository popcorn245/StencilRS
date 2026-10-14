import { Component, State, h } from '@stencil/core';

@Component({ tag: 'state-cmp' })
export class StateCmp {
  @State() open = false;
  @State() count: number = 0;
  @State() items: string[] = [];

  render() {
    return <div>{this.count}</div>;
  }
}
