import { Component, Prop, Event, EventEmitter, Method, h } from '@stencil/core';
export type Mode = 'b' | 'a';
@Component({ tag: 'm-three' })
export class MThree {
  @Method() async c1(y: -1 | 2): Promise<void> {}
  @Method() async c2(y: 3 | -4 | 1): Promise<void> {}
  @Method() async c3(y: Mode | undefined, z: Mode | 'c', w: Mode | 'a', v?: Mode): Promise<Mode | null> { return null; }
  @Event() e1: EventEmitter<{ a: Mode | undefined; b: Mode | number; c: 'x' | Mode }>;
  render() { return <div />; }
}
