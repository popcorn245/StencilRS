import { Component, Listen, Prop, Watch, h, resolveVar } from '@stencil/core';
import { IMPORTED } from './somewhere';


@Component({ tag: 'diag-resolve-var-literal' })
export class Diag {
  @Prop() value: string;

  @Watch(resolveVar('value'))
  onValue() {}

  render() {
    return <div />;
  }
}
