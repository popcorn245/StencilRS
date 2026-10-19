import { Component, Listen, Prop, Watch, h, resolveVar } from '@stencil/core';
import { IMPORTED } from './somewhere';
const A = 'value';

@Component({ tag: 'diag-resolve-var-arity' })
export class Diag {
  @Prop() value: string;

  @Watch(resolveVar(A, A))
  onValue() {}

  render() {
    return <div />;
  }
}
