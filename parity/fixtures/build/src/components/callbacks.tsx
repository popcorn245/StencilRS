import { Component, Event, EventEmitter, Method, Prop, h } from '@stencil/core';
import type { Callback, Handlers } from '../interface';

@Component({ tag: 'build-callbacks' })
export class BuildCallbacks {
  @Prop() done?: Callback;
  @Prop() doneOrNull?: Callback | null;
  @Prop() handlers?: Handlers;
  @Prop() list?: Callback[];
  @Event() finished!: EventEmitter<Callback>;
  @Method() async run(done?: Callback, handlers?: Handlers): Promise<Callback | undefined> {
    return done ?? handlers?.onDone;
  }
  render() {
    return <div />;
  }
}
