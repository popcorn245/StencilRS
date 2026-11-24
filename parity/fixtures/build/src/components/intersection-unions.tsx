import { Component, Event, EventEmitter, Method, Prop, h } from '@stencil/core';

type Style = { textColor?: string; backgroundColor?: string; border?: string } & (
  | { textColor: string }
  | { backgroundColor: string }
  | { border: string }
);
type Highlight = { date: string } & Style;
type Callback = (iso: string) => Style | undefined;
interface Named {
  id: number;
}
type Sized = { size: number } | { width: number; height: number };

@Component({ tag: 'build-intersection-unions' })
export class BuildIntersectionUnions {
  @Prop() highlights?: Highlight[] | Callback;
  @Prop() one?: Highlight;
  @Prop() list?: Highlight[];
  @Prop() named?: Named & Sized;
  @Prop() inline?: { a: string } & ({ b: number } | { c: boolean });
  @Prop() two?: ({ a: string } | { b: string }) & ({ c: number } | { d: number });
  @Prop() nested?: { h: { a: string } & ({ b: number } | { c: boolean }) };
  @Prop() fn?: (h: Highlight) => void;
  @Event() highlightChange!: EventEmitter<Highlight>;
  @Method() async pick(value: Named & Sized): Promise<Highlight | undefined> {
    return undefined;
  }
  render() {
    return <div />;
  }
}
