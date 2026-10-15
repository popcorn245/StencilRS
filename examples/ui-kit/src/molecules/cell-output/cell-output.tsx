import { Component, Prop, h, Host } from '@stencil/core';

/**
 * pop-cell-output — presentational output panel for a notebook code cell
 * (notes-app "digital brain", Phase 9 notebook execution).
 *
 * The HOST (page-editor) runs JS cells in a persistent SANDBOXED iframe runtime
 * (see notes-app/.../notebook-runtime.ts) and passes the STRUCTURED result here.
 * This component only renders — it never executes anything.
 *
 * Output is rendered SAFELY:
 *   - console.log/warn/error lines, the last-expression `result`, and thrown
 *     `error`s (with optional stack) are rendered as ESCAPED text — Stencil's
 *     JSX text interpolation HTML-escapes, so no markup from cell output can
 *     inject into the host DOM.
 *   - A cell may opt into HTML via `display.html(string)`. We never inject that
 *     into the host doc; the host wraps it in a `srcdoc` `sandbox` (no-script,
 *     opaque-origin) sub-frame and passes the HTML string — kept contained.
 *
 * Status + execution count mirror Jupyter: [ ] idle, [*] running, [N] done/error.
 *
 * Props:
 *   - status:   'idle' | 'running' | 'done' | 'error'
 *   - count:    execution count (Jupyter [N]); 0/undefined → shows [ ] / [*]
 *   - items:    ordered output entries (JSON string OR array)
 *   - ms:       wall-clock duration (rendered as a subtle footer)
 */
export type CellStatus = 'idle' | 'running' | 'done' | 'error';

export type CellItem =
  | { kind: 'log' | 'info' | 'warn' | 'error' | 'debug'; text: string }
  | { kind: 'result'; text: string }
  | { kind: 'display'; html?: string; text?: string }
  | { kind: 'error'; text: string; stack?: string };

@Component({
  tag: 'pop-cell-output',
  encapsulation: { type: 'scoped' },
  styleUrl: 'cell-output.css',
})
export class CellOutput {
  /** Cell run status. */
  @Prop() status: CellStatus = 'idle';
  /** Jupyter-style execution count. 0 → not yet run. */
  @Prop() count = 0;
  /** Wall-clock ms for the last run (footer hint). */
  @Prop() ms?: number;
  /** Ordered output entries; accepts a JSON string (attribute) or an array. */
  @Prop() items: string | CellItem[] = [];

  private parseItems(): CellItem[] {
    const v = this.items;
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim()) {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  /** The [N] / [*] / [ ] prompt label. */
  private prompt(): string {
    if (this.status === 'running') return '[*]';
    if (this.count > 0) return `[${this.count}]`;
    return '[ ]';
  }

  private renderItem(item: CellItem, i: number) {
    if (item.kind === 'display' && item.html != null) {
      // Opt-in HTML — render inside a sandboxed, scriptless, opaque-origin frame.
      // The host doc is NEVER given the raw HTML; it lives behind the frame.
      const safeDoc =
        '<!DOCTYPE html><html><head>' +
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\';">' +
        '<style>body{margin:0;font:14px/1.5 system-ui,sans-serif;color:#222;}</style>' +
        '</head><body>' +
        item.html +
        '</body></html>';
      return (
        <iframe
          key={i}
          class="co__html"
          sandbox=""
          srcdoc={safeDoc}
          title="cell HTML output"
          loading="lazy"
        ></iframe>
      );
    }

    const text = item.kind === 'display' ? (item.text ?? '') : (item as any).text ?? '';
    const cls = {
      co__line: true,
      [`co__line--${item.kind}`]: true,
    };
    return (
      <div class={cls} key={i}>
        {(item.kind === 'warn' || item.kind === 'error') && (
          <span class="co__icon" aria-hidden="true">
            <pop-brand-icon name={item.kind === 'error' ? 'close' : 'warning'} />
          </span>
        )}
        <span class="co__text">{text}</span>
        {item.kind === 'error' && (item as any).stack ? (
          <details class="co__stack">
            <summary>stack</summary>
            <pre class="co__stack-pre">{(item as any).stack}</pre>
          </details>
        ) : null}
      </div>
    );
  }

  render() {
    const items = this.parseItems();
    const hasError = this.status === 'error' || items.some((it) => it.kind === 'error');
    const empty = items.length === 0;

    return (
      <Host>
        <div
          class={{
            co: true,
            'co--running': this.status === 'running',
            'co--error': hasError,
            'co--empty': empty,
          }}
          role="region"
          aria-label={`Cell output ${this.prompt()}`}
          aria-busy={this.status === 'running' ? 'true' : 'false'}
        >
          <div class="co__gutter" aria-hidden="true">
            <span class="co__prompt">{this.prompt()}</span>
          </div>
          <div class="co__body" aria-live="polite" aria-atomic="false">
            {this.status === 'running' && empty ? (
              <div class="co__line co__line--muted">
                <span class="co__spin" aria-hidden="true"></span>
                <span class="co__text">Running in sandbox…</span>
              </div>
            ) : empty ? (
              <div class="co__line co__line--muted">
                <span class="co__text">No output</span>
              </div>
            ) : (
              items.map((it, i) => this.renderItem(it, i))
            )}
            {this.ms != null && this.status !== 'running' && !empty ? (
              <div class="co__meta">— {this.ms}ms</div>
            ) : null}
          </div>
        </div>
      </Host>
    );
  }
}
