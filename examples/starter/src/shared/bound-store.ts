import { computed, signal } from '@popcorn245/stencilrs/signals';

/** Signals `pop-bound-counter` passes straight to its template. */
export const hits = signal(0);
export const parity = computed(() => (hits.get() % 2 ? 'odd' : 'even'));
export const rows = signal<{ id: number; label: ReturnType<typeof signal<string>> }[]>([]);
