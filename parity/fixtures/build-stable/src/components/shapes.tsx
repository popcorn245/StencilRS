import { Component, Method, Prop, h } from '@stencil/core';
import type { Callback, Item, Row } from '../types';

@Component({ tag: 'stable-shapes' })
export class StableShapes {
  @Prop() tuple?: [string, number] | [number, string] | [string];
  @Prop() pair?: [Item, Row] | [Row, Item];
  @Prop() obj?: Item | { a: string };
  @Prop() fn?: Callback | Item;
  @Prop() keyed?: keyof { zeta: string; alpha: number; beta: boolean };
  @Prop() keyedOrNumber?: number | keyof { zeta: string; alpha: number } | boolean;
  @Method()
  async tuples(value: [number, number] | [string, string, string] | string[]): Promise<void> {
    void value;
  }
  @Method()
  async objects(value: Item | Row | undefined): Promise<void> {
    void value;
  }
  @Method()
  async keys(key: keyof Item | keyof Row | 'other'): Promise<void> {
    void key;
  }
  @Method()
  async literalKeys(key: keyof { zeta: string; alpha: number; beta: boolean }): Promise<void> {
    void key;
  }
  render() {
    return <div />;
  }
}
