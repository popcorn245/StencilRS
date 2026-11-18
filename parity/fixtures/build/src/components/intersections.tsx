import { Component, Event, EventEmitter, Method, Prop, h } from '@stencil/core';
import type { Color } from '../interface';

interface Box {
  v: string;
}
type Both = Box & { a: number };
type Branded = string & { __brand: 1 };

@Component({ tag: 'build-intersections' })
export class BuildIntersections {
  @Prop() both?: Both;
  @Prop() bothList?: Both[];
  @Prop() bothGeneric?: Array<Both>;
  @Prop() branded?: Branded;
  @Prop() colorOrBranded?: Color | Branded;
  @Prop() inline?: Box & { a: number } & { b: string };
  @Prop() colorList?: (Color | undefined)[];
  @Event() bothChange!: EventEmitter<Both>;
  @Event() brandedChange!: EventEmitter<Branded[]>;
  @Method() async takes(value: Both, other?: Branded): Promise<Branded> {
    return other ?? (value as unknown as Branded);
  }
  render() {
    return <div />;
  }
}
