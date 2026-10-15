/**
 * AsyncData — a framework-agnostic cache-first / stale-while-revalidate data
 * controller (the generalization of bucket-hub's `PanelData`).
 *
 * Lifecycle: `hydrate()` resolves the injected cache first (instant paint),
 * then revalidates against the authoritative `fetcher`. `refresh()` always
 * refetches, keeping the current data visible while the request runs. On a
 * failed fetch, cached data is KEPT and the state carries the error — the UI
 * decides whether that's a subtle stale badge (`pop-sync-status`) or a hard
 * error view (`pop-async-view state="error"`, only when there is no data).
 *
 * Mapping to the UI:
 *   status 'loading' (no data yet)  → pop-async-view state="loading"
 *   error + no data                 → state="error" (retry calls refresh())
 *   data present                    → state="content" (+ pop-sync-status shows
 *                                     `stale` / 'revalidating')
 *   empty result                    → state="empty" (consumer decides emptiness)
 *
 * Plain TypeScript — NO Stencil, NO Firebase. The fetcher and cache adapter
 * are injected, so this works over localStorage, Dexie, memory, or nothing.
 */

export interface AsyncDataOptions<T> {
  /** Network (or any authoritative) fetch. */
  fetcher: () => Promise<T>;
  /** Optional cache adapter — localStorage, Dexie, memory… */
  cache?: {
    read: () => Promise<T | undefined> | T | undefined;
    write: (value: T) => Promise<void> | void;
  };
  /** Age (ms) after which fetched data is served but flagged stale. Data
   *  hydrated from the cache has an unknown age, so when a `staleAfterMs`
   *  policy exists it is conservatively flagged stale until revalidated. */
  staleAfterMs?: number;
}

export interface AsyncDataState<T> {
  data?: T;
  status: 'idle' | 'loading' | 'revalidating' | 'ready' | 'error';
  /** Showing data older than `staleAfterMs` (or kept after a failed refresh). */
  stale: boolean;
  error?: unknown;
  /** Epoch ms of the last successful fetch (undefined for cache-sourced data). */
  updatedAt?: number;
}

export interface AsyncData<T> {
  readonly state: AsyncDataState<T>;
  /** Cache-first: resolve cache immediately (if any), then revalidate. */
  hydrate(): Promise<void>;
  /** Force a network refresh; keeps current data visible while running. */
  refresh(): Promise<void>;
  subscribe(fn: (s: AsyncDataState<T>) => void): () => void;
}

export function createAsyncData<T>(opts: AsyncDataOptions<T>): AsyncData<T> {
  let state: AsyncDataState<T> = { status: 'idle', stale: false };
  const listeners = new Set<(s: AsyncDataState<T>) => void>();
  /** Timer that flips `stale` on once fetched data outlives `staleAfterMs`. */
  let staleTimer: ReturnType<typeof setTimeout> | undefined;

  const set = (patch: Partial<AsyncDataState<T>>) => {
    state = { ...state, ...patch };
    for (const fn of listeners) fn(state);
  };

  const armStaleTimer = () => {
    if (staleTimer) clearTimeout(staleTimer);
    if (opts.staleAfterMs == null) return;
    staleTimer = setTimeout(() => set({ stale: true }), opts.staleAfterMs);
    // A forgotten AsyncData must not pin the process (Node tests, SSR).
    (staleTimer as { unref?: () => void }).unref?.();
  };

  const fetchFresh = async (revalidating: boolean): Promise<void> => {
    set({ status: revalidating ? 'revalidating' : 'loading', error: undefined });
    try {
      const value = await opts.fetcher();
      set({ data: value, status: 'ready', stale: false, updatedAt: Date.now(), error: undefined });
      armStaleTimer();
      await opts.cache?.write(value);
    } catch (error) {
      // KEEP any current (cached) data; flag it stale + carry the error.
      set({ status: 'error', error, stale: state.data !== undefined ? true : state.stale });
    }
  };

  return {
    get state() {
      return state;
    },
    async hydrate() {
      // 1. Cache first — instant paint with whatever we had. Cached data has an
      //    unknown age, so under a staleAfterMs policy it starts flagged stale
      //    (the revalidate that follows clears the flag on success).
      if (opts.cache) {
        try {
          const maybe = opts.cache.read();
          // A synchronous cache paints synchronously (no microtask hop).
          const cached =
            maybe && typeof (maybe as PromiseLike<T | undefined>).then === 'function'
              ? await (maybe as PromiseLike<T | undefined>)
              : (maybe as T | undefined);
          if (cached !== undefined) {
            set({ data: cached, status: 'ready', stale: opts.staleAfterMs != null });
          }
        } catch {
          /* unreadable cache = no cache */
        }
      }
      // 2. Revalidate (cold hydrate when nothing was cached).
      await fetchFresh(state.data !== undefined);
    },
    async refresh() {
      await fetchFresh(state.data !== undefined);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
