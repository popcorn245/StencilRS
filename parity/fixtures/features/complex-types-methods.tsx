import { Component, Prop, Event, EventEmitter, Method, h } from '@stencil/core';
export interface Box<T> { v: T }
type Pair<T> = { a: T; b: T };
export type Mode = 'b' | 'a';
export enum Color { Red, Green }
@Component({ tag: 'm-one' })
export class MOne {
  @Method() async a1(x: string, y?: number, ...rest: boolean[]): Promise<void> {}
  @Method() async a2(opts: { id: string, n?: number }, cb: (e: Event) => void): Promise<Box<string>> { return null as any; }
  @Method() async a3(m: Mode, c: Color, p: Pair<number>, arr: Array<string>, ro: ReadonlyArray<number>): Promise<Mode | undefined> { return null as any; }
  @Method() async a4(x = 5, y: string = 'a', z: 'x' | 'y' = 'x'): Promise<string[]> { return []; }
  @Method() async a5(): Promise<{ a: 1, b: 'x' | 'y' }> { return null as any; }
  @Method() async a6(t: [string, number], u: string | number | undefined, v: null): Promise<Promise<number>> { return null as any; }
  @Method() async a7(f: () => Promise<void>, g?: (a: number, b?: string) => void): Promise<(x: number) => string> { return null as any; }
  @Method() a8(): Promise<void> { return null as any; }
  @Method() async a9() { }
  @Method() async a10() { return 1; }
  @Method() a11() { }
  @Method() async a12(x: any, y: unknown, z: object, w: never): Promise<any> {}
  @Method() async a13(x: Color.Red, y: -1 | 2, z: `a`): Promise<void> {}
  @Method() async a14(x: Record<string, number>, y: Partial<Box<string>>): Promise<Map<string, Box<number>>> {}
  render() { return <div />; }
}
