import { Component, Prop } from '@stencil/core';

@Component({ tag: 'jsx-decorators-only' })
export class JsxDecoratorsOnly {
  @Prop() name: string = 'world';

  render() {
    return (
      <p>
        Hello, <strong>{this.name}</strong>!
      </p>
    );
  }
}
