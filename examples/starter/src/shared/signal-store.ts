// A store shared by every pop-signal-counter: a plain TC39 signal, no Stencil in sight.
// Anything that speaks TC39 Signals (another framework, a test) can read or write it.
import { signal } from '@popcorn245/stencilrs/signals';

export const total = signal(0);
