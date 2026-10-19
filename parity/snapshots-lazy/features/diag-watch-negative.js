import { Component, Listen, Prop, Watch, h, resolveVar } from '@stencil/core';
import { IMPORTED } from './somewhere';
const NEG = -1;

@Component({ tag: 'diag-watch-negative' })
export class Diag {
  @Prop() value: string;

  @Watch(NEG)
  onValue() {}

  render() {
    return <div />;
  }
}
