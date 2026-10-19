import { Component, Prop, Watch, h } from '@stencil/core';

const SEVEN = 7;
const HEX = 0x10;

enum Index {
  Zero,
  One,
  Ten = 10,
  Eleven,
  Shifted = 1 << 2,
}

@Component({ tag: 'watch-const-number' })
export class WatchConstNumber {
  @Prop() value: string;

  @Watch(SEVEN)
  onSeven() {}

  @Watch(HEX)
  @Watch(Index.Eleven)
  onMore() {}

  @Watch(Index.Shifted)
  onShifted() {}

  @Watch('value')
  onValue() {}

  render() {
    return <div />;
  }
}
