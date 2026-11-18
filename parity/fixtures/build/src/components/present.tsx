import { Component, Method, h } from '@stencil/core';

@Component({ tag: 'build-present' })
export class BuildPresent {
  @Method()
  async present(event?: MouseEvent | TouchEvent | PointerEvent | CustomEvent): Promise<void> {
    void event;
  }
  @Method()
  async single(event?: MouseEvent): Promise<UIEvent> {
    return event as UIEvent;
  }
  @Method()
  async setFocus(ev?: globalThis.Event) {
    ev?.stopPropagation();
  }
  render() {
    return <div />;
  }
}
