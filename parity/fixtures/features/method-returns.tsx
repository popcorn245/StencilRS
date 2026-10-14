import { Component, Method, h } from '@stencil/core';

@Component({ tag: 'method-returns' })
export class MethodReturns {
  @Method()
  async asyncNoAnnotation() {}

  @Method()
  annotatedPromise(): Promise<void> {
    return Promise.resolve();
  }

  @Method()
  annotatedVoid(): void {}

  @Method()
  emptyBody() {}

  @Method()
  returnsNumber() {
    return 1;
  }

  @Method()
  annotatedBoolean(): boolean {
    return true;
  }

  @Method()
  returnsPromiseResolve() {
    return Promise.resolve(1);
  }

  @Method()
  nestedReturnOnly() {
    [1].forEach((x) => {
      return x;
    });
  }

  render() {
    return <div />;
  }
}
