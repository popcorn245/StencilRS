import { Component, Prop, h } from '@stencil/core';
import type { ExternalThing } from './external';
import { ExternalEnum } from './external';

@Component({ tag: 'props-unresolved' })
export class PropsUnresolved {
  @Prop() external: ExternalThing;
  @Prop() externalEnum: ExternalEnum;
  @Prop() date: Date;
  @Prop() element: HTMLElement;
  @Prop() externalOrString: ExternalThing | string;
  @Prop() keys: keyof Options;
  @Prop() query: typeof globalThis;

  render() {
    return <div />;
  }
}

interface Options {
  a: string;
  b: number;
}
