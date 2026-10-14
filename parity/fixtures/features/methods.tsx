import { Component, Method, h } from '@stencil/core';

@Component({ tag: 'methods-cmp' })
export class MethodsCmp {
  @Method()
  async open(): Promise<void> {}

  @Method()
  async getValue(id: string, count: number): Promise<string> {
    return id.repeat(count);
  }

  private helper() {}

  render() {
    return <div />;
  }
}
