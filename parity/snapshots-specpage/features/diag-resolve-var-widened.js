import { Component, Listen, Prop, Watch, h, resolveVar } from '@stencil/core';
import { IMPORTED } from './somewhere';
const NAMES = { value: 'value' };

@Component({ tag: 'diag-resolve-var-widened' })
export class Diag {
  @Prop() value: string;

  @Watch(resolveVar(NAMES.value))
  onValue() {}

  render() {
    return <div />;
  }
}
