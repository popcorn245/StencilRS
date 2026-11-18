import { Component, Method, h } from '@stencil/core';
import type { OverlayEventDetail } from '../interface';

@Component({ tag: 'build-dismiss' })
export class BuildDismiss {
  @Method()
  onDidDismiss<T = any>(): Promise<OverlayEventDetail<T>> {
    return null as any;
  }
  @Method()
  onWillDismiss<T = any>(): Promise<OverlayEventDetail<T>> {
    return null as any;
  }
  @Method()
  async push<T extends string>(component: T, params?: Record<string, any>): Promise<T[]> {
    return [component];
  }
  @Method()
  async pickOne<T extends string = 'a'>(value?: T): Promise<T | undefined> {
    return value;
  }
  @Method()
  async pair<T, U extends T>(first: T, second: U): Promise<[T, U]> {
    return [first, second];
  }
  @Method()
  async detail(): Promise<OverlayEventDetail> {
    return {};
  }
  render() {
    return <div />;
  }
}
