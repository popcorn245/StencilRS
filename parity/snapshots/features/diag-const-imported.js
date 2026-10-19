import { Component, Listen, Prop, Watch, h, resolveVar } from '@stencil/core';
import { IMPORTED } from './somewhere';


@Component({ tag: 'diag-const-imported' })
export class Diag {
  @Prop() value: string;

  @Watch(IMPORTED)
  onValue() {}

  render() {
    return <div />;
  }
}
