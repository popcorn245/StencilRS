import { Component, Method, Prop, h } from '@stencil/core';
import type { Box, Item, Row, Zed } from '../types';

@Component({ tag: 'stable-generics' })
export class StableGenerics {
  @Prop() box?: Box<string> | Box<number>;
  @Prop() boxes?: Box<Row> | Box<Item> | Box;
  @Method()
  async fetch(): Promise<Box<Zed> | Item | Row> {
    return { id: '' } as Item;
  }
  @Method()
  async both(a: Promise<string> | Promise<number>, b: Zed | Item | Row): Promise<void> {
    void a;
    void b;
  }
  @Method()
  async records(r: Record<string, number> | Item | Partial<Row>): Promise<void> {
    void r;
  }
  render() {
    return <div />;
  }
}
