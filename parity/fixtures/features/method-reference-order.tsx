import { Component, Method, h } from '@stencil/core';
import { A, B, C } from './types';
import { X } from './x';

interface Local {
  a: A;
  b?: B | null;
}
type L = A | null;
type LL = Local | undefined;
enum E {
  One,
  Two,
}
class K {
  k!: A;
}

/**
 * The `references` of a method name the types of the return type the checker prints first, then
 * those of the whole declaration. Names the printed type lost (`A | null` with an unresolved `A` is
 * `any`) come later, at their place in the declaration; object and function types keep the
 * annotations they were written with.
 */
@Component({ tag: 'method-reference-order' })
export class MethodReferenceOrder {
  @Method()
  async m0(p: B, q: Local | null = null): Promise<A | null> {
    return null as any;
  }
  @Method()
  async m1(p: B, q: Local | null = null): Promise<{ d: A | null; c: string | null }> {
    return null as any;
  }
  @Method()
  async m2(p: B, q: Local | null = null): Promise<{ d: A }> {
    return null as any;
  }
  @Method()
  async m3(p: B, q: Local | null = null): Promise<{ d: Local | null }> {
    return null as any;
  }
  @Method()
  async m4(p: B, q: Local | null = null): Promise<(x: A) => void> {
    return null as any;
  }
  @Method()
  async m5(p: B, q: Local | null = null): Promise<(x: A | null) => B> {
    return null as any;
  }
  @Method()
  async m6(p: B, q: Local | null = null): Promise<[A, B | null]> {
    return null as any;
  }
  @Method()
  async m7(p: B, q: Local | null = null): Promise<Array<A>> {
    return null as any;
  }
  @Method()
  async m8(p: B, q: Local | null = null): Promise<Local | A> {
    return null as any;
  }
  @Method()
  async m9(p: B, q: Local | null = null): Promise<L> {
    return null as any;
  }
  @Method()
  async m10(p: B, q: Local | null = null): Promise<LL> {
    return null as any;
  }
  @Method()
  async m11(p: B, q: Local | null = null): Promise<Record<string, A | null>> {
    return null as any;
  }
  @Method()
  async m12(p: B, q: Local | null = null): Promise<Partial<Local>> {
    return null as any;
  }
  @Method()
  async m13(p: B, q: Local | null = null): Promise<Map<A, B>> {
    return null as any;
  }
  @Method()
  async m14(p: B, q: Local | null = null): Promise<Map<X<C>, A>> {
    return null as any;
  }
  @Method()
  async m15(p: B, q: Local | null = null): Promise<Local> {
    return null as any;
  }
  @Method()
  async m16(p: B, q: Local | null = null): Promise<{ [k: string]: A | null }> {
    return null as any;
  }
  @Method()
  async m17(p: B, q: Local | null = null): Promise<Promise<A | null>> {
    return null as any;
  }
  @Method()
  async m18(p: B, q: Local | null = null): Promise<A | B | null> {
    return null as any;
  }
  @Method()
  async m19(p: B, q: Local | null = null): Promise<HTMLElement | null> {
    return null as any;
  }
  @Method()
  async m20(p: B, q: Local | null = null): Promise<Array<HTMLElement | null>> {
    return null as any;
  }
  @Method()
  async m21(p: B, q: Local | null = null): Promise<Readonly<Local>> {
    return null as any;
  }
  @Method()
  async m22(p: B, q: Local | null = null): Promise<void> {
    return null as any;
  }
  @Method()
  async m23(p: B, q: Local | null = null): Promise<boolean | A> {
    return null as any;
  }
  @Method()
  async m24(p: B, q: Local | null = null): Promise<'a' | 'b' | A> {
    return null as any;
  }
  @Method()
  async m25(p: B, q: Local | null = null): Promise<string | A> {
    return null as any;
  }
  @Method()
  async m26(p: B, q: Local | null = null): Promise<E> {
    return null as any;
  }
  @Method()
  async m27(p: B, q: Local | null = null): Promise<E.One> {
    return null as any;
  }
  @Method()
  async m28(p: B, q: Local | null = null): Promise<K> {
    return null as any;
  }
  @Method()
  async m29(p: B, q: Local | null = null): Promise<K | null> {
    return null as any;
  }
  @Method()
  async m30(p: B, q: Local | null = null): Promise<{ k: K | null; l: L }> {
    return null as any;
  }
  @Method()
  async m31(p: B, q: Local | null = null): Promise<{ a: A | null }> {
    return null as any;
  }
  @Method()
  async m32(p: B, q: Local | null = null): Promise<{ a: string, b: Local | null, c: B | null }> {
    return null as any;
  }
  @Method()
  async m33(p: B, q: Local | null = null): Promise<Array<{ a: A | null }>> {
    return null as any;
  }
  @Method()
  async m34(p: B, q: Local | null = null): Promise<{ n: { d: A | null } }> {
    return null as any;
  }
  @Method()
  async m35(p: B, q: Local | null = null): Promise<Array<A | null>> {
    return null as any;
  }
  @Method()
  async m36(p: B, q: Local | null = null): Promise<Array<Local | null>> {
    return null as any;
  }
  @Method()
  async m37(p: B, q: Local | null = null): Promise<Set<A | null>> {
    return null as any;
  }
  @Method()
  async m38(p: B, q: Local | null = null): Promise<Map<string, A | null>> {
    return null as any;
  }
  @Method()
  async m39(p: B, q: Local | null = null): Promise<ReadonlyArray<A | null>> {
    return null as any;
  }
  @Method()
  async m40(p: B, q: Local | null = null): Promise<A | undefined> {
    return null as any;
  }
  @Method()
  async m41(p: B, q: Local | null = null): Promise<C | A | undefined> {
    return null as any;
  }
  @Method()
  async m42(p: B, q: Local | null = null): Promise<number | A | null> {
    return null as any;
  }
  @Method()
  async m43(p: B, q: Local | null = null): Promise<unknown> {
    return null as any;
  }
  @Method()
  async m44(p: B, q: Local | null = null): Promise<any> {
    return null as any;
  }
  @Method()
  async m45(p: B, q: Local | null = null): Promise<Local | null> {
    return null as any;
  }
  @Method()
  async m46(p: B, q: Local | null = null): Promise<LL | null> {
    return null as any;
  }
  @Method()
  async m47(p: B, q: Local | null = null): Promise<Awaited<A>> {
    return null as any;
  }
  @Method()
  async m48(p: B, q: Local | null = null): Promise<NonNullable<L>> {
    return null as any;
  }
  @Method()
  async m49(p: B, q: Local | null = null): Promise<{ f: (a: A | null) => B | null }> {
    return null as any;
  }
  @Method()
  async m50(p: B, q: Local | null = null): Promise<Array<Array<A | null>>> {
    return null as any;
  }
  @Method()
  async m51(p: B, q: Local | null = null): Promise<Map<X<C>, B | null>> {
    return null as any;
  }
  @Method()
  async m52(p: B, q: Local | null = null): Promise<Foo<A, B>> {
    return null as any;
  }
  @Method()
  async m53(p: B, q: Local | null = null): Promise<X<A | null>> {
    return null as any;
  }
  @Method()
  async m54(p: B, q: Local | null = null): Promise<X<Local>> {
    return null as any;
  }
  @Method()
  async m55(p: B, q: Local | null = null): Promise<X<{ a: A | null }>> {
    return null as any;
  }
  @Method()
  async m56(p: B, q: Local | null = null): Promise<{ m(): C | null }> {
    return null as any;
  }
  @Method()
  async m57(p: B, q: Local | null = null): Promise<() => C | null> {
    return null as any;
  }
  @Method()
  async m58(p: B, q: Local | null = null): Promise<(x: B) => C | null> {
    return null as any;
  }
  @Method()
  async m59(p: B, q: Local | null = null): Promise<{ [k: string]: A | null; }> {
    return null as any;
  }
  @Method()
  async m60(p: B, q: Local | null = null): Promise<{ a: A | null }[]> {
    return null as any;
  }
  @Method()
  async m61(p: B, q: Local | null = null): Promise<{ a: A | null; b: { c: C | null } }> {
    return null as any;
  }
  @Method()
  async m62(p: B, q: Local | null = null): Promise<[a: A | null]> {
    return null as any;
  }
  @Method()
  async m63(p: B, q: Local | null = null): Promise<Array<(x: A | null) => void>> {
    return null as any;
  }
  @Method()
  async m64(p: B, q: Local | null = null): Promise<{ a: A | null } | { b: B | null }> {
    return null as any;
  }
  @Method()
  async m65(p: B, q: Local | null = null): Promise<{ a: A | null } | null> {
    return null as any;
  }
  @Method()
  async m66(p: B, q: Local | null = null): Promise<{ a?: A | null }> {
    return null as any;
  }
  @Method()
  async m67(p: B, q: Local | null = null): Promise<{ readonly a: A | null }> {
    return null as any;
  }
  @Method()
  async m68(p: B, q: Local | null = null): Promise<{ new (x: A | null): A }> {
    return null as any;
  }
  @Method()
  async m69(p: B, q: Local | null = null): Promise<{ a: Array<A | null> }> {
    return null as any;
  }
  @Method()
  async m70(p: B, q: Local | null = null): Promise<{ a: 'x' | 'y' | A }> {
    return null as any;
  }
  @Method()
  async m71(p: B, q: Local | null = null): Promise<{ a: A | null; b: C | null }> {
    return null as any;
  }
  @Method()
  async m72(p: B, q: Local | null = null): Promise<{ a: { b: B | null }[] }> {
    return null as any;
  }
  @Method()
  async m73(p: B, q: Local | null = null): Promise<{ x: X<A | null> }> {
    return null as any;
  }
  @Method()
  async m74(p: B, q: Local | null = null): Promise<{ a: A | null } | undefined> {
    return null as any;
  }
  @Method()
  async m75(p: B, q: Local | null = null): Promise<{ b: B | null } | { a: A | null }> {
    return null as any;
  }
  @Method()
  async m76(p: B, q: Local | null = null): Promise<[{ a: A | null }, { c: C | null }]> {
    return null as any;
  }
  @Method()
  async m77(p: B, q: Local | null = null): Promise<(x: { a: A | null }) => { c: C | null }> {
    return null as any;
  }
  render() {
    return <div />;
  }
}
