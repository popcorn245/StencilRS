import { Component, Event, EventEmitter, Method, Prop, h } from '@stencil/core';
import type { Color, LiteralUnion, Mode } from '../interface';

type Open<T extends string, U = string> = T | (U & Record<never, never>);
type Box<T> = { value: T };
type Id<T> = T;

@Component({ tag: 'build-color' })
export class BuildColor {
  @Prop({ reflect: true }) color?: Color;
  @Prop() required: Color = 'primary';
  @Prop() role?: LiteralUnion<'cancel' | 'destructive', string>;
  @Prop() mode?: Mode;
  @Prop({ reflect: true }) openColor?: Open<'a' | 'b'>;
  @Prop() idNumber?: Id<number>;
  @Prop() idPair?: Id<number | string>;
  @Prop() boxed?: Box<string>;
  @Prop() brand?: string & Record<never, never>;
  @Prop() colors?: Color[];
  @Event() colorChange!: EventEmitter<Color>;
  @Method() async setColor(color: Color): Promise<Color> {
    return color;
  }
  render() {
    return <div />;
  }
}
