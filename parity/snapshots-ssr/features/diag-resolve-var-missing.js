import { Component, Listen, Prop, Watch, h, resolveVar } from '@stencil/core';
import { IMPORTED } from './somewhere';
const NAMES = { other: 'value' } as const;

@Component({ tag: 'diag-resolve-var-missing' })
export class Diag {
  @Prop() value: string;

  @Watch(resolveVar(NAMES.value))
  onValue() {}

  render() {
    return <div />;
  }
}
