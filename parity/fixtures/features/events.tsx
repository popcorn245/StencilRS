import { Component, Event, EventEmitter, h } from '@stencil/core';

@Component({ tag: 'events-cmp' })
export class EventsCmp {
  /** Fired when the value changes. */
  @Event() valueChanged: EventEmitter<string>;
  @Event({ eventName: 'my-custom-event' }) custom: EventEmitter<{ id: number }>;
  @Event({ bubbles: false, composed: false, cancelable: false }) quiet: EventEmitter;
  @Event({ eventName: '  padded  ' }) padded: EventEmitter<void>;

  render() {
    return <button onClick={() => this.valueChanged.emit('x')}>go</button>;
  }
}
