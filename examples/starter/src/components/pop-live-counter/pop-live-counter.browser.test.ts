// Browser only: under Vitest's happy-dom mode, Stencil's runtime does not bind a signal in JSX (not yet understood).
import { beforeEach, describe, expect, it } from 'vitest';

import { flush, mount } from '../../test-utils';
import { visits } from '../../shared/live-store';
import './pop-live-counter';

type Counter = HTMLElement & { renders: number };
const q = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel)!;

describe('pop-live-counter (Stencil signals bound in the template)', () => {
  beforeEach(() => {
    visits.value = 0;
  });

  it('updates the text and the class a signal feeds without rendering the component', async () => {
    const el = await mount<Counter>('<pop-live-counter></pop-live-counter>');
    expect([q(el, '.visits').textContent, q(el, 'button').className]).toEqual(['0', 'even']);
    const renders = el.renders;
    (q(el, 'button') as HTMLElement).click();
    visits.value += 2;
    await flush();
    expect([q(el, '.visits').textContent, q(el, 'button').className]).toEqual(['3', 'odd']);
    expect(el.renders).toBe(renders);
  });

  it('catches up after being disconnected', async () => {
    const el = await mount<Counter>('<pop-live-counter></pop-live-counter>');
    el.remove();
    visits.value = 9;
    document.body.append(el);
    await flush();
    expect(q(el, '.visits').textContent).toBe('9');
  });
});
