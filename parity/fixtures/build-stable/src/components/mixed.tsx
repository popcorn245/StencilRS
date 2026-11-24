import { Component, Method, h } from '@stencil/core';
import { Box, Callback, HookResult, Item, Kind, Level, Size, Zed } from '../types';

/** Kinds mixed in one union: booleans, literals, lib and project types, arrays, functions. */
@Component({ tag: 'stable-mixed' })
export class StableMixed {
  @Method()
  async boolAndObject(v: Item | boolean): Promise<void> {
    void v;
  }
  @Method()
  async boolObjectString(v: Zed | boolean | string | null | Item): Promise<void> {
    void v;
  }
  @Method()
  async trueAndObject(v: Item | true | 'a' | 2): Promise<void> {
    void v;
  }
  @Method()
  async promiseAndBool(v: Promise<void> | boolean | undefined): Promise<void> {
    void v;
  }
  @Method()
  async arrayAndBool(v: string[] | boolean | Item[]): Promise<void> {
    void v;
  }
  @Method()
  async libs(v: Set<string> | Map<string, number> | Date | RegExp | Error): Promise<void> {
    void v;
  }
  @Method()
  async sameGeneric(v: Box<string> | Box<number> | Box<boolean> | Box): Promise<void> {
    void v;
  }
  @Method()
  async aliasAndObject(v: Zed | Size | Item): Promise<void> {
    void v;
  }
  @Method()
  async hook(v: Zed | HookResult): Promise<void> {
    void v;
  }
  @Method()
  async fnAndNamed(v: Callback | Zed | (() => void)): Promise<void> {
    void v;
  }
  @Method()
  async enumAndObject(v: Item | Level | Kind): Promise<void> {
    void v;
  }
  @Method()
  async nested(v: Array<Item | boolean> | Promise<Zed | Item | string>): Promise<void> {
    void v;
  }
  @Method()
  async returns(): Promise<Zed | boolean | Item | null> {
    return null;
  }
  @Method()
  async element(v: HTMLElement | string | Element | Node | boolean): Promise<void> {
    void v;
  }
  @Method()
  async typeParam<T extends Item>(v: T | Zed | boolean): Promise<void> {
    void v;
  }
  render() {
    return <div />;
  }
}
