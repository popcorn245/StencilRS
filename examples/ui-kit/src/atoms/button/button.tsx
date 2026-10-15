import { Component, Host, h, Prop, Event, EventEmitter } from '@stencil/core';

/**
 * @name pop-button
 * @description A CTA button component for email templates. Renders a styled
 * button link that maps to MJML's <mj-button> element.
 */
@Component({
  tag: 'pop-button',
})
export class EmailButton {
  /** Button label text */
  @Prop() text: string = 'Click Here';

  /** Button link URL */
  @Prop() url: string = '#';

  /** Horizontal alignment: left, center, right */
  @Prop() alignment: string = 'center';

  /** Button background color */
  @Prop() backgroundColor: string = '#7c3aed';

  /** Button text color */
  @Prop() textColor: string = '#ffffff';

  /** Border radius in pixels */
  @Prop() borderRadius: number = 4;

  /** Read-only mode */
  @Prop() readonly: boolean = false;

  /** Emitted when button properties change */
  @Event() buttonChange: EventEmitter<{
    text: string;
    url: string;
    alignment: string;
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
  }>;

  render() {
    return (
      <Host style={{ textAlign: this.alignment, display: 'block', padding: '8px 0' }}>
        <a
          href={this.readonly ? this.url : undefined}
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: this.backgroundColor,
            color: this.textColor,
            borderRadius: `${this.borderRadius}px`,
            textDecoration: 'none',
            fontWeight: '600',
            cursor: this.readonly ? 'pointer' : 'text',
            minWidth: '100px',
            textAlign: 'center',
          }}
        >
          {this.text}
        </a>
      </Host>
    );
  }
}
