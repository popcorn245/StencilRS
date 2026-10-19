import { Component, Listen, Prop, Watch, h, resolveVar } from '@stencil/core';
import { IMPORTED } from './somewhere';


@Component({ tag: 'diag-resolve-var-imported' })
export class Diag {
  @Prop() value: string;

  @Watch(resolveVar(IMPORTED.value))
  onValue() {}

  render() {
    return <div />;
  }
}
