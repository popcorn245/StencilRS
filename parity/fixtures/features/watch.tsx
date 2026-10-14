import { Component, Prop, State, Watch, h } from '@stencil/core';

@Component({ tag: 'watch-cmp' })
export class WatchCmp {
  @Prop() value: string;
  @State() count = 0;

  @Watch('value')
  onValue(next: string, prev: string) {
    console.log(next, prev);
  }

  @Watch('count')
  @Watch('value')
  onAny() {}

  render() {
    return <div>{this.value}</div>;
  }
}
