import { Component, Listen, Prop, Watch, h } from '@stencil/core';

const EV = 'ping';
let KEY = 'value';

@Component({ tag: 'computed-names-raw' })
export class ComputedNamesRaw {
  @Prop() [KEY]: string;

  @Watch('value')
  [EV + 'Changed']() {}

  @Listen('click')
  [EV + 'Click']() {}

  render() {
    return <div />;
  }
}
