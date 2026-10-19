import { Component, Prop, Event, EventEmitter, Method, h } from '@stencil/core';
import { Imp } from './imp';
export interface Box<T> { v: T }
@Component({ tag: 'm-two' })
export class MTwo {
  @Method() async b1(x: Unknown, y?: HTMLElement, z: Imp = null as any): Promise<Unknown> { return null as any; }
  @Method() async b2(x: Unknown[], y: Unknown | string, z: Box<Unknown>, w: { a: Unknown }, f: (a: Unknown) => Unknown): Promise<Unknown[]> { return null as any; }
  @Method() async b3(x: 1.50, y: 0x10, z: 1e3, w: -5, v: 10n, u: true): Promise<void> {}
  @Method() async b4(a: (string), b: (string | number)[], c: ((x: number) => void)[], d: Array<string | number>): Promise<void> {}
  @Method() async b5(a: { 'a-b': string; 1: number; [k: string]: any; readonly c: string; m(): void; n?(x: number): string; (y: number): void }): Promise<void> {}
  @Method() async b6(a: [x: string, y?: number], b: [string, ...number[]], c: string[][]): Promise<void> {}
  @Method() async b7(a: typeof Box, b: keyof Box<any>, c: Box<string>['v'], d: string & number): Promise<void> {}
  @Method() async b8({ a, b }: { a: string, b: number }, [c]: string[]): Promise<void> {}
  @Method() async b9(): Promise<Imp> { return null as any; }
  render() { return <div />; }
}
