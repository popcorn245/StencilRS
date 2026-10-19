import { Component, Method, h } from '@stencil/core';

const NAME = 'reset';

@Component({ tag: 'diag-computed-method' })
export class DiagComputedMethod {
  @Method()
  async [NAME]() {}

  render() {
    return <div />;
  }
}
