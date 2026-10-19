import { Component, Listen, Prop, Watch, h, resolveVar } from '@stencil/core';
import { IMPORTED } from './somewhere';
let VALUE = 'value';

@Component({ tag: 'diag-const-let' })
export class Diag {
  @Prop() value: string;

  @Watch(VALUE)
  onValue() {}

  render() {
    return <div />;
  }
}
