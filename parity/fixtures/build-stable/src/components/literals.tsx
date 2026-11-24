import { Component, Method, Prop, h } from '@stencil/core';
import { Kind, Level } from '../types';

@Component({ tag: 'stable-literals' })
export class StableLiterals {
  @Prop() numbers?: 3 | 1 | 2 | -1 | 1.5;
  @Prop() flags?: true | false | 'yes';
  @Prop() mixed?: 'b' | 3 | true | 'a' | 1 | false | null;
  @Prop() bool?: boolean | string | number;
  @Prop() level?: Level | string;
  @Prop() kind?: Kind | 'z' | 1;
  @Method()
  async set(value: 'c' | 'a' | 'b' | 10 | 2 | null | undefined): Promise<void> {
    void value;
  }
  @Method()
  async enums(value: Kind.B | Kind.A | Level.High | Level.Low): Promise<void> {
    void value;
  }
  @Method()
  async primitives(value: symbol | bigint | number | string | boolean | object): Promise<void> {
    void value;
  }
  render() {
    return <div />;
  }
}
