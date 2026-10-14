import { Component, Prop, h } from '@stencil/core';

type Size = 'sm' | 'md' | 'lg';
type Count = 1 | 2 | 3;
interface Options {
  label: string;
}
enum Mode {
  Light = 'light',
  Dark = 'dark',
}
enum Level {
  Low,
  High,
}
enum Mixed {
  A = 'a',
  B = 1,
}

@Component({ tag: 'props-unions-aliases' })
export class PropsUnionsAliases {
  @Prop() size: Size = 'md';
  @Prop() count: Count;
  @Prop() literalUnion: 'a' | 'b';
  @Prop() maybeBool: boolean | undefined;
  @Prop() nullableStr: string | null;
  @Prop() strOrNum: string | number;
  @Prop() strOrList: string | string[];
  @Prop() mode: Mode = Mode.Light;
  @Prop() level: Level;
  @Prop() mixed: Mixed;
  @Prop() modeMember: Mode.Dark;
  @Prop() options: Options;
  @Prop() parenthesized: (string);
  @Prop() template: `x-${string}`;

  render() {
    return <div>{this.size}</div>;
  }
}
