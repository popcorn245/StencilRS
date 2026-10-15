import { describe, it, expect, vi } from 'vitest';
import { Draw2HealthMonitor, type Draw2HealthMonitorOptions } from './draw2-health-monitor.js';

/** A probe whose settlement the test controls, recording each requested timeout. */
function controlledProbe() {
  const timeouts: number[] = [];
  const pending: Array<(ok: boolean) => void> = [];
  const probe = (timeoutMs: number): Promise<boolean> => {
    timeouts.push(timeoutMs);
    return new Promise((resolve) => pending.push(resolve));
  };
  const settle = (ok: boolean) => {
    const next = pending.shift();
    if (!next) throw new Error('no probe in flight');
    next(ok);
  };
  return { probe, settle, timeouts, inFlight: () => pending.length };
}

/** Instantly-resolving delay (retry pause) recording requested pauses. */
function instantDelay() {
  const waits: number[] = [];
  const delay = (ms: number) => {
    waits.push(ms);
    return Promise.resolve();
  };
  return { delay, waits };
}

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

function monitor(overrides: Partial<Draw2HealthMonitorOptions> & Pick<Draw2HealthMonitorOptions, 'probe'>) {
  const onChange = vi.fn<(reachable: boolean) => void>();
  const mon = new Draw2HealthMonitor({ onChange, delay: () => Promise.resolve(), ...overrides });
  return { mon, onChange };
}

describe('Draw2HealthMonitor (open-time probe: long timeout + one retry, non-blocking)', () => {
  it('first attempt succeeds → promotes with the LONG cold-handshake timeout', async () => {
    const p = controlledProbe();
    const { mon, onChange } = monitor({ probe: p.probe, firstTimeoutMs: 6000 });
    mon.start(0);
    expect(mon.reachable).toBe(false); // start() never blocks — verdict lands later
    expect(p.timeouts).toEqual([6000]);
    p.settle(true);
    await flush();
    expect(mon.reachable).toBe(true);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('first attempt fails → retries ONCE after the retry delay, and the retry can still promote (the session-killer fix)', async () => {
    const p = controlledProbe();
    const d = instantDelay();
    const { mon, onChange } = monitor({ probe: p.probe, firstTimeoutMs: 6000, retryDelayMs: 2000, delay: d.delay });
    mon.start(0);
    p.settle(false); // cold DNS+TLS outran the first attempt
    await flush();
    expect(d.waits).toEqual([2000]);
    expect(p.timeouts).toEqual([6000, 6000]);
    p.settle(true); // warm now — retry lands
    await flush();
    expect(mon.reachable).toBe(true);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('both open-time attempts fail → concludes unreachable with NO onChange (verdict never flipped)', async () => {
    const p = controlledProbe();
    const { mon, onChange } = monitor({ probe: p.probe });
    mon.start(0);
    p.settle(false);
    await flush();
    p.settle(false);
    await flush();
    expect(p.timeouts).toHaveLength(2);
    expect(mon.reachable).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ticks arriving while the open probe is in flight never stack probes', async () => {
    const p = controlledProbe();
    const { mon } = monitor({ probe: p.probe, recheckMs: 10_000 });
    mon.start(0);
    for (let t = 350; t < 30_000; t += 350) mon.tick(t); // the 350ms camera loop
    expect(p.inFlight()).toBe(1);
    p.settle(true);
    await flush();
    expect(p.timeouts).toHaveLength(1);
  });
});

describe('Draw2HealthMonitor (periodic re-probe: PROMOTES and demotes)', () => {
  it('recovers false→true on a later tick (the unrecoverable-demote fix)', async () => {
    const p = controlledProbe();
    const { mon, onChange } = monitor({ probe: p.probe, recheckMs: 10_000 });
    mon.start(0);
    p.settle(false);
    await flush();
    p.settle(false); // open probe + retry both fail → session starts unreachable
    await flush();
    expect(mon.reachable).toBe(false);

    mon.tick(5_000); // inside the recheck window — no probe yet
    expect(p.inFlight()).toBe(0);
    mon.tick(10_001);
    expect(p.inFlight()).toBe(1);
    p.settle(true); // draw2 (or the route to it) came back
    await flush();
    expect(mon.reachable).toBe(true);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('demotes true→false when draw2 goes away mid-session, then re-promotes when it returns', async () => {
    const p = controlledProbe();
    const { mon, onChange } = monitor({ probe: p.probe, recheckMs: 10_000, recheckTimeoutMs: 2500 });
    mon.start(0);
    p.settle(true);
    await flush();

    mon.tick(10_001);
    expect(p.timeouts[1]).toBe(2500); // periodic re-probe uses the cheap timeout
    p.settle(false);
    await flush();
    expect(mon.reachable).toBe(false);

    mon.tick(20_002);
    p.settle(true);
    await flush();
    expect(mon.reachable).toBe(true);
    expect(onChange.mock.calls.map(([ok]) => ok)).toEqual([true, false, true]);
  });

  it('paces re-probes to recheckMs and guards the in-flight one (350ms ticks never spam /health)', async () => {
    const p = controlledProbe();
    const { mon } = monitor({ probe: p.probe, recheckMs: 10_000 });
    mon.start(0);
    p.settle(true);
    await flush();
    for (let t = 350; t <= 60_000; t += 350) {
      mon.tick(t);
      if (p.inFlight()) {
        p.settle(true);
        await flush();
      }
    }
    // 1 open probe + one recheck per ~10.15s window (10s pace quantized to the
    // 350ms tick) over 60s: rechecks at ~10.2s, 20.3s, 30.5s, 40.6s, 50.8s.
    expect(p.timeouts.length).toBe(1 + 5);
  });

  it('an unchanged verdict re-probe fires no onChange (no render churn)', async () => {
    const p = controlledProbe();
    const { mon, onChange } = monitor({ probe: p.probe, recheckMs: 10_000 });
    mon.start(0);
    p.settle(true);
    await flush();
    mon.tick(10_001);
    p.settle(true);
    await flush();
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });
});

describe('Draw2HealthMonitor (stop)', () => {
  it('a probe settling after stop() is inert — no verdict flip, no onChange', async () => {
    const p = controlledProbe();
    const { mon, onChange } = monitor({ probe: p.probe });
    mon.start(0);
    mon.stop(); // scanner closed while the cold probe was still in flight
    p.settle(true);
    await flush();
    expect(mon.reachable).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stop() during the retry delay skips the retry entirely', async () => {
    const p = controlledProbe();
    let release!: () => void;
    const delay = () => new Promise<void>((r) => (release = r));
    const { mon } = monitor({ probe: p.probe, delay });
    mon.start(0);
    p.settle(false);
    await flush();
    mon.stop();
    release();
    await flush();
    expect(p.timeouts).toHaveLength(1); // no second attempt after stop
  });

  it('ticks after stop() never probe', () => {
    const p = controlledProbe();
    const { mon } = monitor({ probe: p.probe });
    mon.stop();
    mon.tick(100_000);
    expect(p.timeouts).toHaveLength(0);
  });
});
