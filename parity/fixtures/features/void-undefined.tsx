import { Component, Event, EventEmitter, Method, Prop, h } from '@stencil/core';

type V = void | string;
type U = undefined | number;
type N = null | void;
type M<T> = T | void;
type Opt<T> = T | undefined;

/** `void` next to `undefined`: a written union keeps both, only an inferred return union drops `undefined`. */
@Component({ tag: 'void-undefined' })
export class VoidUndefined {
  @Prop() a?: string | void;
  @Prop() b!: void | undefined;
  @Prop() c?: void | null;
  @Prop() d?: void;
  @Prop() e?: V;
  @Prop() f!: U | void;
  @Prop() g!: V | undefined;
  /** An optional member inside a type prints the `undefined` it adds. */
  @Prop() h!: { a?: string | void };
  @Prop() i?: (y?: V) => void;
  /** A generic alias is instantiated with the same reduction as a written union. */
  @Prop() j!: M<string>;
  @Prop() k?: Opt<void>;
  @Prop() l?: N;

  @Event() ev1!: EventEmitter<void | undefined>;
  @Event() ev2!: EventEmitter<{ a: void | undefined }>;
  @Event() ev3!: EventEmitter<(x: void | undefined) => void | undefined>;
  @Event() ev4!: EventEmitter<string | void>;
  @Event() ev5!: EventEmitter<V>;
  @Event() ev6!: EventEmitter<{ a?: V; m(y?: void): void }>;
  @Event() ev7!: EventEmitter<M<U>>;

  @Method() async m1(x: string | void, y?: string | void): Promise<string | void> {
    return;
  }
  @Method() async m2(x: void | undefined): Promise<void | undefined> {
    return;
  }
  @Method() async m3(x: V, y?: V): Promise<V> {
    return;
  }
  @Method() async m4(x: U | void): Promise<U | void> {
    return;
  }
  @Method() async m5(y?: void | null, z?: void): Promise<void | null> {
    return null;
  }
  @Method() async m6(y?: V | undefined, z?: U): Promise<void> {
    return;
  }
  @Method() async m8(x: M<string>, y?: M<string>): Promise<M<string>> {
    return;
  }
  @Method() async m9(x: Opt<void>, y?: Opt<void>): Promise<Opt<void>> {
    return;
  }
  @Method() async m10(x: (y?: string | void) => void, y?: { a?: V }): Promise<{ a?: string | void }> {
    return {};
  }
  @Method() async m11(y?: N, z?: (void), w?: void | string[]): Promise<N> {
    return;
  }
  render() {
    return <div />;
  }
}
