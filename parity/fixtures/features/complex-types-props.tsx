import { Component, Prop, Event, EventEmitter, Method, h } from '@stencil/core';
export interface Box<T> { v: T }
type Pair<T> = { a: T; b: T };
type Fn = (a?: number, ...rest: string[]) => void;
@Component({ tag: 't-one' })
export class TOne {
  @Prop() f1?: (a?: number) => void;
  @Prop() f2: (a: string | undefined, b: number) => void;
  @Prop() f3: { readonly a: string; m(x: number): void; [k: string]: any; cb: () => void };
  @Prop() f4: [string, number];
  @Prop() f5: Box<string>;
  @Prop() f6: Pair<string>;
  @Prop() f7: Array<string>;
  @Prop() f8: ReadonlyArray<string>;
  @Prop() f9: 1.50 | -1 | 0x10 | 1e3;
  @Prop() f10: Fn;
  @Prop() f11: Pair<string>[];
  @Prop() f12: (string | number)[];
  @Prop() f13: Box<string> | Pair<number>;
  @Prop() f14: Promise<string>;
  @Prop() f15: Map<string, number>;
  @Prop() f16: 'a"b' | 'c\nd';
  @Prop() f18: string & { brand: 1 };
  @Prop() f19: { a: 1 } | { b: 2 };
  @Event() ev1: EventEmitter<{ a?: string; b: Box<number> }>;
  @Event() ev2: EventEmitter<(x: number) => string>;
  @Event() ev3: EventEmitter<string | undefined>;
  @Event() ev4: EventEmitter<[number, number]>;
  render() { return <div />; }
}
