// Runs on the stencilrs runtime only (vitest.rs.config.ts): Stencil's runtime has no parts to bind.
import { forceUpdate } from '@stencil/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { Signals, signal } from '@popcorn245/stencilrs/signals';

import { flush, mount } from '../../test-utils';
import { hits, rows } from '../../shared/bound-store';
import './pop-bound-counter';

type Counter = HTMLElement & { renders: number; frozen: boolean };
const q = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel)!;

describe('pop-bound-counter (signals bound to parts, experimental)', () => {
  beforeEach(() => {
    hits.set(0);
    rows.set([]);
  });

  it('updates the text and attributes a signal feeds without rendering the component', async () => {
    const el = await mount<Counter>('<pop-bound-counter></pop-bound-counter>');
    expect([q(el, '.hits').textContent, q(el, 'button').className, q(el, 'button').getAttribute('title')]).toEqual(['0', 'even', 'even']);
    const renders = el.renders;
    (q(el, 'button') as HTMLElement).click();
    hits.set(hits.get() + 2);
    await flush();
    expect([q(el, '.hits').textContent, q(el, 'button').className, q(el, 'button').getAttribute('title')]).toEqual(['3', 'odd', 'odd']);
    expect(el.renders).toBe(renders);
  });

  it('stops following when the part gets another value, and follows again', async () => {
    const el = await mount<Counter>('<pop-bound-counter></pop-bound-counter>');
    el.frozen = true;
    await flush();
    hits.set(5);
    await flush();
    expect(q(el, '.hits').textContent).toBe('frozen');
    el.frozen = false;
    await flush();
    expect(q(el, '.hits').textContent).toBe('5');
  });

  it('lets go of its signals while disconnected and catches up on reconnect', async () => {
    const el = await mount<Counter>('<pop-bound-counter></pop-bound-counter>');
    expect(Signals.subtle.hasSinks(hits)).toBe(true);
    el.remove();
    expect(Signals.subtle.hasSinks(hits)).toBe(false);
    hits.set(9);
    document.body.append(el);
    await flush();
    expect(q(el, '.hits').textContent).toBe('9');
    expect(Signals.subtle.hasSinks(hits)).toBe(true);
  });

  it('lets go of the signals of list rows that are removed', async () => {
    const a = signal('a');
    const b = signal('b');
    rows.set([{ id: 1, label: a }, { id: 2, label: b }]);
    const el = await mount<Counter>('<pop-bound-counter></pop-bound-counter>');
    const li = () => [...el.shadowRoot!.querySelectorAll('li')].map((n) => n.textContent);
    a.set('A');
    await flush();
    expect(li()).toEqual(['A', 'b']);
    rows.set([{ id: 2, label: b }]);
    forceUpdate(el); // the component has no @Signal field, so its render isn't tracked
    await flush();
    expect(li()).toEqual(['b']);
    expect([Signals.subtle.hasSinks(a), Signals.subtle.hasSinks(b)]).toEqual([false, true]);
  });
});
