import { LitElement, html, css } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';

const ITEMS = Array.from({ length: 10 }, (_, id) => ({ id, text: `Item ${id}` }));

class SizeApp extends LitElement {
  static properties = { label: { type: String }, count: { state: true } };
  static styles = css`
    :host { display: block; padding: 8px; border: 1px solid #888; }
    button { font: inherit; padding: 2px 8px; }
    ul { margin: 8px 0 0; padding-left: 20px; }
    li.on { font-weight: 700; }
  `;
  constructor() {
    super();
    this.label = 'Count';
    this.count = 0;
  }
  render() {
    return html`<div>
      <button @click=${() => this.count++}>${this.label}: ${this.count}</button>
      <ul>${repeat(ITEMS, (i) => i.id, (i) => html`<li class=${classMap({ on: i.id === this.count % 10 })}>${i.text}</li>`)}</ul>
    </div>`;
  }
}
customElements.define('size-app', SizeApp);
