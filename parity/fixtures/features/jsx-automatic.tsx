import { Component, Prop, Host } from '@stencil/core';

@Component({ tag: 'jsx-automatic' })
export class JsxAutomatic {
  @Prop() items: string[] = [];

  render() {
    return (
      <Host>
        <ul>
          {this.items.map((item) => (
            <li>{item}</li>
          ))}
        </ul>
      </Host>
    );
  }
}
