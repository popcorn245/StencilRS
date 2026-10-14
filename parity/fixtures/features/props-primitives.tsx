import { Component, Prop, h } from '@stencil/core';

@Component({ tag: 'props-primitives' })
export class PropsPrimitives {
  @Prop() str: string;
  @Prop() num: number;
  @Prop() bool: boolean;
  @Prop() anything: any;
  @Prop() mystery: unknown;
  @Prop() list: string[];
  @Prop() obj: { a: string };
  @Prop() fn: () => void;
  @Prop() nothing;

  render() {
    return <div>{this.str}</div>;
  }
}
