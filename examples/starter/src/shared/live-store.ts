import { signal } from '@stencil/core/signals';

/** Stencil 5's own signals. `pop-live-counter` passes them straight to its template. */
export const visits = signal(0);
