import { Component, Prop, h } from '@stencil/core';
import type { ComponentProps } from '../interface';
import type { NavComponent, NavComponentWithProps } from '../nav-interface';

@Component({ tag: 'build-cycle' })
export class BuildCycle {
  @Prop() root?: NavComponent;
  @Prop() pages?: NavComponentWithProps[];
  @Prop() one?: NavComponentWithProps<string>;
  @Prop() props?: ComponentProps;
  render() {
    return <div />;
  }
}
