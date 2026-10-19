import { Component, Listen, Prop, Watch, h, resolveVar } from '@stencil/core';
import { IMPORTED } from './somewhere';
const VALUE = 'val' + 'ue';

@Component({ tag: 'diag-const-concat' })
export class Diag {
  @Prop() value: string;

  @Watch(VALUE)
  onValue() {}

  render() {
    return <div />;
  }
}
