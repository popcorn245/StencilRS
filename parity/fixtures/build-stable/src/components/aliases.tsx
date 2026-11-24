import { Component, Method, Prop, h } from '@stencil/core';
import type { Direction, Entry, HookResult, Size } from '../types';

@Component({ tag: 'stable-aliases' })
export class StableAliases {
  @Prop() size?: Size;
  @Prop() direction: Direction = 'up';
  @Prop() entry?: Entry;
  @Prop() hook?: () => HookResult | Promise<HookResult>;
  @Prop() hook2?: () => Promise<HookResult> | HookResult;
  @Method()
  async pick(size: Size, direction?: Direction): Promise<void> {
    void size;
    void direction;
  }
  @Method()
  async resolve(): Promise<Size | undefined> {
    return undefined;
  }
  @Method()
  async hooked(fn: () => HookResult | Promise<HookResult>): Promise<HookResult | Promise<HookResult>> {
    return fn();
  }
  render() {
    return <div />;
  }
}
