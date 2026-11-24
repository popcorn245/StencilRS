import { Component, Method, Prop, h } from '@stencil/core';
import { getMode } from '../config';

@Component({ tag: 'build-inferred-returns' })
export class BuildInferredReturns {
  private progress = 0;
  private label = 'a';
  private ready: boolean = false;
  /** A prop typed by the alias a called function returns. */
  @Prop({ mutable: true }) mode = getMode(this);
  @Method()
  getProgress() {
    return Promise.resolve(this.progress);
  }
  @Method()
  getLabel() {
    return Promise.resolve(this.label);
  }
  @Method()
  async isReady() {
    return this.ready;
  }
  @Method()
  async enabled() {
    return true;
  }
  @Method()
  async either(x: boolean) {
    if (x) {
      return false;
    }
    return true;
  }
  @Method()
  async count() {
    return 42;
  }
  @Method()
  addRipple(x: number, y: number) {
    return new Promise<() => void>((resolve) => {
      resolve(() => void (x + y));
    });
  }
  @Method()
  async addRippleAsync(x: number) {
    return new Promise<() => number>((resolve) => {
      resolve(() => x);
    });
  }
  /** Two different literals keep their literal types: left to Stencil. */
  @Method()
  async pick(x: boolean) {
    if (x) {
      return 1;
    }
    return 2;
  }
  /** A path that falls off the end returns `undefined` too: left to Stencil. */
  @Method()
  async maybe(x: boolean) {
    if (x) {
      return true;
    }
  }
  /** An optional field is `undefined` too: left to Stencil. */
  @Prop() limit?: number;
  @Method()
  getLimit() {
    return Promise.resolve(this.limit);
  }
  /** The guard narrows the field where it is returned: left to Stencil. */
  @Method()
  async narrowed() {
    if (!this.ready) {
      throw new Error('not ready');
    }
    return this.ready;
  }
  /** `this` is handed to something else: left to Stencil. */
  @Method()
  async handed() {
    Object.freeze(this);
    return this.label;
  }
  render() {
    return <div />;
  }
}
