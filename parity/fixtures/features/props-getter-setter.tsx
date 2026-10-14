import { Component, Prop, h } from '@stencil/core';

@Component({ tag: 'props-getter-setter' })
export class PropsGetterSetter {
  private _value = 'initial';
  private _count = 0;

  @Prop()
  get value(): string {
    return this._value;
  }
  set value(v: string) {
    this._value = v;
  }

  @Prop()
  get readonlyCount(): number {
    return this._count;
  }

  render() {
    return <div>{this.value}</div>;
  }
}
