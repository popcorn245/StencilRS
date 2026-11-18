import { Component, Event, EventEmitter, Method, Prop, h } from '@stencil/core';
import type { Holder, LiteralUnion, OverlayEventDetail, Pair } from '../interface';

interface Box {
  v: string;
}
const sizes = {
  small: 1,
  'extra-large': 2,
  medium() {
    return 3;
  },
} as const;
type SizeName = keyof typeof sizes;
type Keys = keyof { readonly a: 1; 'b-c'?: 2; d(): void };

@Component({ tag: 'build-extras' })
export class BuildExtras {
  @Prop() pair?: Pair;
  @Prop() pairOf?: Pair<number>;
  @Prop() holder?: Holder;
  @Prop() holders?: Holder[];
  @Prop() numbers?: LiteralUnion<1 | 2, number>;
  @Prop() size?: SizeName;
  @Prop() keys?: Keys;
  @Prop() sizes?: SizeName[];
  @Event() detail!: EventEmitter<OverlayEventDetail[]>;
  @Event() sized!: EventEmitter<SizeName>;
  @Method() async lookup<T extends Box, K = keyof T>(item: T | null, key?: K): Promise<T | undefined> {
    return item ?? undefined;
  }
  @Method() async ordered<T extends 'b' | 'a' | undefined = 'b'>(pick?: T): Promise<string> {
    return String(pick);
  }
  @Method() async all<T>(...items: T[]): Promise<T[]> {
    return items;
  }
  @Method() async holds<T extends Holder = Holder<number>>(holder: T): Promise<Pair> {
    return { first: String(holder), second: '' };
  }
  @Method() async detailed(): Promise<OverlayEventDetail[]> {
    return [];
  }
  render() {
    return <div />;
  }
}
