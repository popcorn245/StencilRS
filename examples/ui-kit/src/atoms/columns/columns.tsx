import { Component, Host, h, Prop } from '@stencil/core';

/**
 * @name pop-columns
 * @description A multi-column layout component for email templates. Maps to
 * MJML's <mj-section><mj-column> structure for responsive email layouts.
 */
@Component({
  tag: 'pop-columns',
})
export class EmailColumns {
  /** JSON stringified column definitions with widths */
  @Prop() columns: string = '[]';

  render() {
    let parsedColumns: Array<{ width: string; content?: string }> = [];
    try {
      parsedColumns = JSON.parse(this.columns);
    } catch {
      parsedColumns = [];
    }

    return (
      <Host style={{ display: 'block' }}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            minHeight: '60px',
          }}
        >
          {parsedColumns.map((col) => (
            <div
              style={{
                flex: `0 0 ${col.width}`,
                maxWidth: col.width,
                border: '1px dashed #e2e8f0',
                borderRadius: '4px',
                padding: '8px',
                minHeight: '40px',
              }}
            >{col.content || ''}</div>
          ))}
        </div>
      </Host>
    );
  }
}
