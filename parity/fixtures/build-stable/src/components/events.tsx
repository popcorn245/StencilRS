import { Component, Method, h } from '@stencil/core';

@Component({ tag: 'stable-events' })
export class StableEvents {
  @Method()
  async present(event?: MouseEvent | TouchEvent | PointerEvent | CustomEvent): Promise<void> {
    void event;
  }
  @Method()
  async reversed(event: TouchEvent | PointerEvent | MouseEvent | UIEvent): Promise<void> {
    void event;
  }
  @Method()
  async keyboard(event: KeyboardEvent | FocusEvent | Event | null): Promise<void> {
    void event;
  }
  @Method()
  async generic(event: CustomEvent<string> | CustomEvent<number> | CustomEvent<boolean>): Promise<void> {
    void event;
  }
  @Method()
  async inPromise(): Promise<MouseEvent | TouchEvent | undefined> {
    return undefined;
  }
  render() {
    return <div />;
  }
}
