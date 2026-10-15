import { Component, Host, h, Prop } from '@stencil/core';

/**
 * @name pop-divider
 * @description A horizontal divider component for email templates. Renders a
 * styled horizontal rule that maps to MJML's <mj-divider> element.
 */
@Component({
  tag: 'pop-divider',
})
export class EmailDivider {
  /** Line style: solid, dashed, dotted */
  @Prop() lineStyle: string = 'solid';

  /** Line color */
  @Prop() color: string = '#dddddd';

  /** Line width as CSS value */
  @Prop() width: string = '100%';

  /** Vertical padding in pixels */
  @Prop() padding: number = 10;

  render() {
    return (
      <Host style={{ display: 'block', padding: `${this.padding}px 0` }}>
        <hr
          style={{
            border: 'none',
            borderTop: `2px ${this.lineStyle} ${this.color}`,
            width: this.width,
            margin: '0 auto',
          }}
        />
      </Host>
    );
  }
}
