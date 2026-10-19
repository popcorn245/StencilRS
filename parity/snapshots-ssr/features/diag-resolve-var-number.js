import { Component, Listen, Prop, Watch, h, resolveVar } from '@stencil/core';
import { IMPORTED } from './somewhere';
const NUM = 1;

@Component({ tag: 'diag-resolve-var-number' })
export class Diag {
  @Prop() value: string;

  @Watch(resolveVar(NUM))
  onValue() {}

  render() {
    return <div />;
  }
}
