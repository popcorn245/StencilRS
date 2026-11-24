import { describe, expect, it } from 'vitest';
import { signalOf } from '@popcorn245/stencilrs/signals';

import { flush, mount } from '../../test-utils';
import { total } from '../../shared/signal-store';
import './pop-signal-counter';

type Counter = HTMLElement & { count: number; doubled: number; step: number };
const text = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel)!.textContent;

describe('pop-signal-counter (@Signal, experimental)', () => {
  it('renders its initial signal values', async () => {
    total.set(0);
    const el = await mount<Counter>('<pop-signal-counter></pop-signal-counter>');
    expect([text(el, '.count'), text(el, '.doubled'), text(el, '.total')]).toEqual(['0', '0', '0']);
  });

  it('re-renders when a @Signal field is written, once for several writes', async () => {
    const el = await mount<Counter>('<pop-signal-counter step="2"></pop-signal-counter>');
    const button = el.shadowRoot!.querySelector('button')!;
    button.click();
    button.click();
    await flush();
    expect(el.count).toBe(4);
    expect(text(el, '.count')).toBe('4');
    expect(text(el, '.doubled')).toBe('8');
  });

  it('re-renders when a shared store signal changes outside the component', async () => {
    const el = await mount<Counter>('<pop-signal-counter></pop-signal-counter>');
    total.set(41);
    await flush();
    expect(text(el, '.total')).toBe('41');
  });

  it('exposes the field as a TC39 Signal.State', async () => {
    const el = await mount<Counter>('<pop-signal-counter></pop-signal-counter>');
    const count = signalOf<number>(el, 'count')!;
    expect(count.get()).toBe(0);
    (count as { set(v: number): void }).set(7);
    await flush();
    expect(el.count).toBe(7);
    expect(text(el, '.count')).toBe('7');
  });

  it('stops watching while disconnected and catches up on reconnect', async () => {
    const el = await mount<Counter>('<pop-signal-counter></pop-signal-counter>');
    el.remove();
    total.set(100);
    await flush();
    document.body.append(el);
    await flush();
    expect(text(el, '.total')).toBe('100');
  });

  it('still re-renders on a @Prop change', async () => {
    const el = await mount<Counter>('<pop-signal-counter></pop-signal-counter>');
    el.step = 9;
    await flush();
    expect(el.shadowRoot!.querySelector('button')!.textContent).toBe('+9');
  });
});
