import { Component, h, Prop, State, Watch } from '@stencil/core';

import { BaseProps } from './bases/base-props';

/** Redeclares inherited members: a prop, a prop as state, a watcher, and its own constructor. */
@Component({ tag: 'cmp-override' })
export class CmpOverride extends BaseProps {
  @Prop() greeting: string = 'Hi';
  @State() disabled = true;

  constructor() {
    super();
    console.log('constructed');
  }

  @Watch('greeting')
  greetingChanged(next: string) {
    console.log('override', next);
  }

  render() {
    return <i>{this.greeting}</i>;
  }
}
