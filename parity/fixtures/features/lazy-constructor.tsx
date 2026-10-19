import { AttachInternals, Component, Element, Event, EventEmitter, Prop, h } from '@stencil/core';

// Not exported, an @Element property declared after a constructor with statements of its own,
// an event and form internals.
@Component({ tag: 'lazy-constructor' })
class LazyConstructor {
  @AttachInternals({ states: { open: true } }) internals: ElementInternals;
  @Event() changed: EventEmitter<string>;
  @Prop() value = 'a';
  @Element() el: HTMLElement;

  constructor() {
    console.log('built');
  }

  render() {
    return <div>{this.el.tagName}</div>;
  }
}
