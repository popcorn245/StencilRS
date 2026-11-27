// The 500-card page in Lit (@lit-labs/ssr): <lit-app> with a counter in its header, 500 <lit-card> elements
// (each a LitElement with a like button). Rendered to a string with declarative shadow DOM.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { LitElement, html } from 'lit';
import { render } from '@lit-labs/ssr';
import { collectResultSync } from '@lit-labs/ssr/lib/render-result.js';
import { ITEMS } from './items.mjs';

class LitCard extends LitElement {
  static properties = { name: { type: String }, price: { type: Number }, likes: { state: true } };
  constructor() {
    super();
    this.name = '';
    this.price = 0;
    this.likes = 0;
  }
  render() {
    return html`<div class="card"><h3>${this.name}</h3><p class="price">$${this.price.toFixed(2)}</p><button class="like" @click=${() => this.likes++}>♥ ${this.likes}</button></div>`;
  }
}
customElements.define('lit-card', LitCard);

class LitApp extends LitElement {
  static properties = { count: { state: true } };
  constructor() {
    super();
    this.count = 0;
  }
  render() {
    return html`<main><header><h1>Shop</h1><button id="count" @click=${() => this.count++}>Clicked ${this.count}</button></header><section>${ITEMS.map((i) => html`<lit-card .name=${i.name} .price=${i.price}></lit-card>`)}</section></main>`;
  }
}
customElements.define('lit-app', LitApp);

export const renderLit = () => collectResultSync(render(html`<lit-app></lit-app>`));

// The same page with lit-html templates only (no custom element per card): what Lit costs without the component layer.
const card = (i) => html`<div class="card"><h3>${i.name}</h3><p class="price">$${i.price.toFixed(2)}</p><button class="like" @click=${() => {}}>♥ ${0}</button></div>`;
export const renderLitTemplates = () => collectResultSync(render(html`<main><header><h1>Shop</h1><button id="count" @click=${() => {}}>Clicked ${0}</button></header><section>${ITEMS.map(card)}</section></main>`));
