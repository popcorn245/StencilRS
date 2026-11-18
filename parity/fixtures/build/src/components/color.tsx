import { Component, Event, EventEmitter, Method, Prop, h } from '@stencil/core';
import type { Color, LiteralUnion, Mode } from '../interface';

@Component({ tag: 'build-color' })
export class BuildColor {
  @Prop({ reflect: true }) color?: Color;
  @Prop() required: Color = 'primary';
  @Prop() role?: LiteralUnion<'cancel' | 'destructive', string>;
  @Prop() mode?: Mode;
  @Prop() colors?: Color[];
  @Event() colorChange!: EventEmitter<Color>;
  @Method() async setColor(color: Color): Promise<Color> {
    return color;
  }
  render() {
    return <div />;
  }
}
