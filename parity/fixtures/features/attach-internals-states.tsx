import { AttachInternals, Component, h, State } from '@stencil/core';

/** Custom states, one on from the start; and an existing constructor. */
@Component({ tag: 'attach-internals-states' })
export class AttachInternalsStates {
  @AttachInternals({
    states: {
      /** Shown open. */
      open: true,
      busy: false,
      'with-dash': true,
    },
  })
  internals: ElementInternals;

  @State() count = 0;

  constructor() {
    console.log('constructed');
  }

  toggle() {
    if (this.internals.states.has('open')) this.internals.states.delete('open');
    else this.internals.states.add('open');
  }

  render() {
    return <button onClick={() => this.toggle()}>{this.count}</button>;
  }
}
