import { Component, Listen, Prop, Watch, h, resolveVar } from '@stencil/core';
import { IMPORTED } from './somewhere';
const VALUE: string = 'value';

@Component({ tag: 'diag-const-annotated' })
export class Diag {
  @Prop() value: string;

  @Watch(VALUE)
  onValue() {}

  render() {
    return <div />;
  }
}
