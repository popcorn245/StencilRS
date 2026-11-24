import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';
import { A, B, C } from './types';
import { X } from './x';

interface Local {
  a: A;
}
type L = A | null;

/**
 * The `references` of a prop or an event come from the written type: each type argument that is a
 * plain reference is added right after its parent, before the arguments' own arguments.
 */
@Component({ tag: 'reference-order-members' })
export class ReferenceOrderMembers {
  @Prop() p0?: A | null;
  @Prop() p1?: Map<X<C>, A>;
  @Prop() p2?: Map<X<C>, A | null>;
  @Prop() p3?: Foo<Bar<C>, A, Baz<B>>;
  @Prop() p4?: { a: A | null; b: C };
  @Prop() p5?: Array<A | null>;
  @Prop() p6?: Local | A;
  @Prop() p7?: L;
  @Prop() p8?: Record<string, X<A>>;
  @Prop() p9?: (x: A | null) => C;
  @Prop() p10?: X<A, X<B>>;
  @Prop() p11?: Promise<X<C>>;
  @Prop() p12?: A[] | B;
  @Event() e0!: EventEmitter<A | null>;
  @Event() e1!: EventEmitter<Map<X<C>, A>>;
  @Event() e2!: EventEmitter<Map<X<C>, A | null>>;
  @Event() e3!: EventEmitter<Foo<Bar<C>, A, Baz<B>>>;
  @Event() e4!: EventEmitter<{ a: A | null; b: C }>;
  @Event() e5!: EventEmitter<Array<A | null>>;
  @Event() e6!: EventEmitter<Local | A>;
  @Event() e7!: EventEmitter<L>;
  @Event() e8!: EventEmitter<Record<string, X<A>>>;
  @Event() e9!: EventEmitter<(x: A | null) => C>;
  @Event() e10!: EventEmitter<X<A, X<B>>>;
  @Event() e11!: EventEmitter<Promise<X<C>>>;
  @Event() e12!: EventEmitter<A[] | B>;
  render() {
    return <div />;
  }
}
