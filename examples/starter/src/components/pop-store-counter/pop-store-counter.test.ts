import { beforeEach, describe, expect, it } from 'vitest';

import { flush, mount } from '../../test-utils';
import { cart } from '../../shared/cart-store';
import './pop-store-counter';

type Counter = HTMLElement & { renders: number };
const items = (el: Element) => el.shadowRoot!.querySelector('.items')!.textContent;

describe('pop-store-counter (@stencil/store)', () => {
  beforeEach(() => cart.reset());

  it('re-renders every instance that read a key when it changes', async () => {
    const a = await mount<Counter>('<pop-store-counter></pop-store-counter><pop-store-counter></pop-store-counter>');
    const b = a.nextElementSibling as Counter & { componentOnReady(): Promise<Counter> };
    await b.componentOnReady();
    a.shadowRoot!.querySelector('button')!.click();
    await flush();
    expect([items(a), items(b)]).toEqual(['1', '1']);
    cart.state.items = 5;
    await flush();
    expect([items(a), items(b)]).toEqual(['5', '5']);
  });

  it('does not re-render for a key it never read', async () => {
    const el = await mount<Counter>('<pop-store-counter></pop-store-counter>');
    const before = el.renders;
    cart.state.note = 'gift';
    await flush();
    expect(el.renders).toBe(before);
  });
});
