import { createStore } from '@stencil/store';

/** A `@stencil/store` store: components that read a key in `render()` re-render when it changes. */
export const cart = createStore({ items: 0, note: '' });
