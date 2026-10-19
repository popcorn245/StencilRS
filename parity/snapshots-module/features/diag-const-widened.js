import { Component, Listen, Prop, Watch, h, resolveVar } from '@stencil/core';
import { IMPORTED } from './somewhere';
const KEYS = { value: 'value' };

@Component({ tag: 'diag-const-widened' })
export class Diag {
  @Prop() value: string;

  @Watch(KEYS.value)
  onValue() {}

  render() {
    return <div />;
  }
}
