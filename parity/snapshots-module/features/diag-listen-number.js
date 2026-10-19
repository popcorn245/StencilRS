import { Component, Listen, Prop, Watch, h, resolveVar } from '@stencil/core';
import { IMPORTED } from './somewhere';
const NUM = 3;

@Component({ tag: 'diag-listen-number' })
export class Diag {
  @Prop() value: string;

  @Listen(NUM)
  onValue() {}

  render() {
    return <div />;
  }
}
