import { Component, Prop, State, Watch } from '@stencil/core';

@Component({ tag: 'pop-greeting', encapsulation: { type: 'shadow' } })
export class PopGreeting {
  /** Who to greet. */
  @Prop({ reflect: true }) name: string = 'world';

  @State() changes = 0;

  @Watch('name')
  onNameChange() {
    this.changes++;
  }

  render() {
    return (
      <p>
        Hello, <strong>{this.name}</strong>!{this.changes > 0 && <small> (renamed {this.changes}×)</small>}
      </p>
    );
  }
}
