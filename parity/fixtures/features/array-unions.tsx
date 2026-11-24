import { Component, Event, EventEmitter, Method, Prop, h } from '@stencil/core';
import { A, B, C } from './types';

interface Local {
  id: string;
}
type LocalAlias = { id: number };
type LocalUnion = 'x' | 'y';
enum Kind {
  One,
  Two,
}

/**
 * Without the lib every array type is the checker's one empty object type: it prints as `{}`,
 * two of them in a union are one member, and it comes before every type the program makes.
 */
@Component({ tag: 'array-unions' })
export class ArrayUnions {
  @Prop() objects?: { a: A }[] | { c: C }[];
  @Prop() primitives?: string[] | number[];
  @Prop() withTuple?: [A, B] | C[];
  @Prop() withLiteral?: 'a' | A[];

  @Event() objectsChange!: EventEmitter<{ a: A }[] | { c: C }[]>;
  @Event() tupleChange!: EventEmitter<[A, B] | C[]>;

  @Method() async objectArrays(x: { a: A }[] | { c: C }[]): Promise<{ a: A }[] | { c: C }[]> {
    return [];
  }
  @Method() async primitiveArrays(x: string[] | number[]): Promise<string[] | number[]> {
    return [];
  }
  @Method() async nullable(x: A[] | B[]): Promise<A[] | B[] | null> {
    return null;
  }
  @Method() async tuple(x: [A, B] | C[]): Promise<[A, B] | C[]> {
    return [];
  }
  @Method() async withObject(x: object | A[]): Promise<object | A[]> {
    return [];
  }
  @Method() async withLiterals(x: 'a' | A[], y: A[] | 1 | 2, z: true | A[]): Promise<'a' | A[]> {
    return [];
  }
  @Method() async withString(x: A[] | string): Promise<A[] | string> {
    return [];
  }
  @Method() async withEmpty(x: A[] | {}, y: {} | A[]): Promise<A[] | {}> {
    return [];
  }
  @Method() async withFunction(x: A[] | (() => void), y: (() => void) | A[]): Promise<A[] | (() => void)> {
    return [];
  }
  @Method() async withObjects(x: A[] | { a: string } | { b: number }, y: { a: string } | A[] | { b: number }): Promise<void> {}
  @Method() async nested(x: string[][] | number[], y: { x: string[] | number[] }, z: (x: string[] | number[]) => void): Promise<void> {}
  @Method() async withLocals(x: Local | A[], y: A[] | Local, z: LocalAlias | A[], w: A[] | LocalUnion): Promise<void> {}
  @Method() async withEnum(x: Kind | A[], y: A[] | Kind.One): Promise<void> {}
  @Method() async tuples(x: [string[], number[]], y: A[][]): Promise<string[]> {
    return [];
  }

  render() {
    return <div />;
  }
}
