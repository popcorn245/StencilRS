import { describe, it, expect, vi } from 'vitest';
import { createAsyncData } from './async-data';

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('createAsyncData', () => {
  it('cache-first hydrate: paints cached data immediately, then revalidates', async () => {
    const states: string[] = [];
    const ad = createAsyncData<string>({
      fetcher: () => Promise.resolve('fresh'),
      cache: { read: () => 'cached', write: vi.fn() },
    });
    ad.subscribe((s) => states.push(`${s.status}:${s.data ?? ''}`));

    const hydrated = ad.hydrate();
    // Cache resolved synchronously → data is already visible before the fetch lands.
    expect(ad.state.data).toBe('cached');
    expect(ad.state.status).toBe('revalidating');
    await hydrated;
    expect(ad.state.data).toBe('fresh');
    expect(ad.state.status).toBe('ready');
    expect(ad.state.stale).toBe(false);
    expect(ad.state.updatedAt).toBeTypeOf('number');
    expect(states).toContain('ready:cached');
    expect(states).toContain('revalidating:cached');
    expect(states).toContain('ready:fresh');
  });

  it('cold hydrate (no cache): loading → ready', async () => {
    const ad = createAsyncData<number>({ fetcher: () => Promise.resolve(42) });
    const hydrated = ad.hydrate();
    expect(ad.state.status).toBe('loading');
    expect(ad.state.data).toBeUndefined();
    await hydrated;
    expect(ad.state.status).toBe('ready');
    expect(ad.state.data).toBe(42);
  });

  it('flags cache-hydrated data stale under a staleAfterMs policy (unknown age)', async () => {
    let resolveFetch!: (v: string) => void;
    const ad = createAsyncData<string>({
      fetcher: () => new Promise((r) => (resolveFetch = r)),
      cache: { read: () => 'old', write: () => undefined },
      staleAfterMs: 60_000,
    });
    const hydrated = ad.hydrate();
    expect(ad.state.data).toBe('old');
    expect(ad.state.stale).toBe(true);
    resolveFetch('new');
    await hydrated;
    expect(ad.state.stale).toBe(false);
  });

  it('error with cached data: keeps the data, flags stale, carries the error', async () => {
    const boom = new Error('offline');
    const ad = createAsyncData<string>({
      fetcher: () => Promise.reject(boom),
      cache: { read: () => 'cached', write: () => undefined },
    });
    await ad.hydrate();
    expect(ad.state.data).toBe('cached'); // retained
    expect(ad.state.status).toBe('error');
    expect(ad.state.stale).toBe(true);
    expect(ad.state.error).toBe(boom);
  });

  it('error with NO data: error status, no stale data to show', async () => {
    const ad = createAsyncData<string>({ fetcher: () => Promise.reject(new Error('nope')) });
    await ad.hydrate();
    expect(ad.state.data).toBeUndefined();
    expect(ad.state.status).toBe('error');
    expect(ad.state.stale).toBe(false);
  });

  it('refresh keeps current data visible while revalidating and recovers from error', async () => {
    let fail = true;
    const ad = createAsyncData<string>({
      fetcher: () => (fail ? Promise.reject(new Error('x')) : Promise.resolve('recovered')),
      cache: { read: () => 'cached', write: () => undefined },
    });
    await ad.hydrate();
    expect(ad.state.status).toBe('error');
    fail = false;
    const refreshing = ad.refresh();
    expect(ad.state.status).toBe('revalidating');
    expect(ad.state.data).toBe('cached'); // still visible
    await refreshing;
    expect(ad.state.status).toBe('ready');
    expect(ad.state.data).toBe('recovered');
    expect(ad.state.stale).toBe(false);
  });

  it('writes fetched data through the cache adapter', async () => {
    const write = vi.fn();
    const ad = createAsyncData<string>({
      fetcher: () => Promise.resolve('v1'),
      cache: { read: () => undefined, write },
    });
    await ad.hydrate();
    expect(write).toHaveBeenCalledWith('v1');
  });

  it('marks data stale after staleAfterMs elapses', async () => {
    vi.useFakeTimers();
    try {
      const ad = createAsyncData<string>({ fetcher: () => Promise.resolve('v'), staleAfterMs: 1000 });
      await ad.hydrate();
      expect(ad.state.stale).toBe(false);
      vi.advanceTimersByTime(1001);
      expect(ad.state.stale).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('subscribe returns an unsubscribe', async () => {
    const fn = vi.fn();
    const ad = createAsyncData<string>({ fetcher: () => Promise.resolve('v') });
    const off = ad.subscribe(fn);
    off();
    await ad.hydrate();
    await tick();
    expect(fn).not.toHaveBeenCalled();
  });
});
