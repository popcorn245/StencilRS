import { Component, Method, h } from '@stencil/core';

@Component({ tag: 'build-inferred' })
export class BuildInferred {
  private progress = 0;
  @Method()
  getProgress() {
    return Promise.resolve(this.progress);
  }
  @Method()
  async canTransition() {
    return true;
  }
  @Method()
  async addRipple(x: number, y: number) {
    return () => x + y;
  }
  render() {
    return <div />;
  }
}
