import { Component, Event, EventEmitter, Method, Prop, h } from '@stencil/core';

type V = void | string;
type U = undefined | number;

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

  @Event() ev1!: EventEmitter<void | undefined>;
  @Event() ev2!: EventEmitter<{ a: void | undefined }>;
  @Event() ev3!: EventEmitter<(x: void | undefined) => void | undefined>;
  @Event() ev4!: EventEmitter<string | void>;
  @Event() ev5!: EventEmitter<V>;

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
  render() {
    return <div />;
  }
}
