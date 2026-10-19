import { Component, Prop, State, h } from '@stencil/core';

const FIRST = 'firstName';
const LABEL = `label`;
const KEYS = { size: 'size' } as const;
const NUM = 7;
const NEG = -2;
const FRACTION = 1.5;

enum Names {
  Last = 'lastName',
}

enum Index {
  Zero,
  One,
}

@Component({ tag: 'computed-names' })
export class ComputedNames {
  @Prop() [FIRST]: string;
  @Prop({ reflect: true }) [Names.Last] = 'x';
  @Prop() [KEYS.size]: number;
  @Prop() ['literal-key']: string;
  @Prop() [NUM]: string;
  @Prop() [Index.One]: string;
  @Prop() [FRACTION]: string;
  @State() [LABEL] = 'hi';
  @State() [NEG] = 1;

  render() {
    return <div>{this[FIRST]}</div>;
  }
}
