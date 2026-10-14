import { Component, Prop, h } from '@stencil/core';

@Component({ tag: 'props-initializers' })
export class PropsInitializers {
  @Prop() str = 'hello';
  @Prop() tpl = `hello`;
  @Prop() num = 3;
  @Prop() neg = -3;
  @Prop() bool = true;
  @Prop() nul = null;
  @Prop() arr = [];
  @Prop() obj = {};
  @Prop() typedWithDefault: string = 'x';

  render() {
    return <div>{this.str}</div>;
  }
}
