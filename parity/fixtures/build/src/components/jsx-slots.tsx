import { Component, h } from '@stencil/core';

/**
 * @slot start - Content at the start.
 * @slot - The main content, documented.
 * @slot end
 * @slot footer - Shown last, and used in the JSX.
 */
@Component({ tag: 'build-jsx-slots', encapsulation: { type: 'shadow' } })
export class BuildJsxSlots {
  private dynamic = 'x';

  private renderEnd() {
    return <slot name="end-icon"></slot>;
  }

  render() {
    return (
      <div>
        <slot name="start"></slot>
        <slot></slot>
        <slot name="footer"></slot>
        <slot name="separator" />
        <slot name={this.dynamic}></slot>
        <slot name={`tpl`}></slot>
        {this.renderEnd()}
      </div>
    );
  }
}
