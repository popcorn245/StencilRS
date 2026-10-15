import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Components/Molecules/BulkBar',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'The multi-select action bar that appears while a list/grid is in ' +
          'selection mode: a live "N selected" count, the host\'s slotted action ' +
          'buttons (add `.bulk__act` to inherit the pill styling; `.bulk__act--danger` ' +
          'for destructive), and a Done exit that emits `popBulkDone`. Sticky-bottom ' +
          'by default so it stays thumb-reachable over long lists.',
      },
    },
  },
};
export default meta;

const card = (inner: string, width = '360px') =>
  `<div style="width: ${width}; padding: 1rem; border-radius: var(--radius-card, 22px); background: var(--surface-card, var(--pico-card-background-color));">${inner}</div>`;

const wire = (html: string) => {
  const host = document.createElement('div');
  host.innerHTML = html;
  host.addEventListener('popBulkDone', () => console.log('popBulkDone'));
  return host;
};

export const Items: StoryObj = {
  name: 'Items selection (move / grocery / wishlist / delete)',
  render: () =>
    wire(
      card(`<pop-bulk-bar count="3" label="selected">
        <button type="button" class="bulk__act">📦 Move</button>
        <button type="button" class="bulk__act">🛒 Grocery</button>
        <button type="button" class="bulk__act">⭐ Wishlist</button>
        <button type="button" class="bulk__act bulk__act--danger">Delete</button>
      </pop-bulk-bar>`),
    ),
};

export const Cards: StoryObj = {
  name: 'Cards selection (move / wishlist / for-sale / delete)',
  render: () =>
    wire(
      card(`<pop-bulk-bar count="7" label="cards">
        <button type="button" class="bulk__act">📦 Move</button>
        <button type="button" class="bulk__act">⭐ Wishlist</button>
        <button type="button" class="bulk__act">💵 For sale</button>
        <button type="button" class="bulk__act bulk__act--danger">Delete</button>
      </pop-bulk-bar>`),
    ),
};

export const Busy: StoryObj = {
  name: 'Busy (bulk request running)',
  render: () =>
    wire(
      card(`<pop-bulk-bar count="12" label="selected" busy>
        <button type="button" class="bulk__act" disabled>📦 Move</button>
        <button type="button" class="bulk__act bulk__act--danger" disabled>Delete</button>
      </pop-bulk-bar>`),
    ),
};

export const Narrow: StoryObj = {
  name: 'Narrow (390px phone — actions scroll)',
  render: () =>
    wire(
      card(
        `<pop-bulk-bar count="4" label="selected">
        <button type="button" class="bulk__act">📦 Move</button>
        <button type="button" class="bulk__act">🛒 Grocery</button>
        <button type="button" class="bulk__act">⭐ Wishlist</button>
        <button type="button" class="bulk__act">💵 For sale</button>
        <button type="button" class="bulk__act bulk__act--danger">Delete</button>
      </pop-bulk-bar>`,
        '320px',
      ),
    ),
};
