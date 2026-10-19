import { Component, Prop, Watch, h, resolveVar } from '@stencil/core';

const VALUE = 'value';
let LOOSE = 'loose';
const TEMPLATE = `open`;
const NAMES = { size: 'size' } as const;

class Keys {
  static readonly Label = 'label';
}

enum Kinds {
  Kind = 'kind',
}

@Component({ tag: 'resolve-var' })
export class ResolveVar {
  @Prop() value: string;
  @Prop() loose: string;
  @Prop() open: boolean;
  @Prop() size: number;
  @Prop() label: string;
  @Prop() kind: string;

  @Watch(resolveVar(VALUE))
  @Watch(resolveVar(LOOSE))
  @Watch(resolveVar(TEMPLATE))
  onValue() {}

  @Watch(resolveVar(NAMES.size))
  @Watch(resolveVar(Keys.Label))
  @Watch(resolveVar(Kinds.Kind))
  onOther() {}

  render() {
    return <div />;
  }
}
