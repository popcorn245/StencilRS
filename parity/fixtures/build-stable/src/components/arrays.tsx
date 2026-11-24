import { Component, Method, Prop, h } from '@stencil/core';
import type { Entry, Item, Row, Size } from '../types';

@Component({ tag: 'stable-arrays' })
export class StableArrays {
  @Prop() items?: Item[] | Row[];
  @Prop() rows?: Row[] | Item[];
  @Prop() sizes?: Size[] | string[];
  @Prop() entries?: Entry[] | Item[];
  @Method()
  async setAll(items: Row[] | Item[] | Entry[]): Promise<void> {
    void items;
  }
  @Method()
  async mixed(items: Array<Item> | Row | Item[]): Promise<void> {
    void items;
  }
  render() {
    return <div />;
  }
}
