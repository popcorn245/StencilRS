import { describe, expect, it } from 'vitest';

import { flush, mount } from '../../test-utils';
import './pop-press-button';

type PressButton = HTMLElement & { disabled: boolean; pressCount: number };

describe('pop-press-button (extends a base class)', () => {
  it('renders its own prop and the inherited state', async () => {
    const el = await mount<PressButton>('<pop-press-button label="Go"></pop-press-button>');
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.shadowRoot!.querySelector('button')!.textContent).toBe('Go (0)');
  });

  it('presses through the inherited handler and event', async () => {
    const el = await mount<PressButton>('<pop-press-button></pop-press-button>');
    const seen: number[] = [];
    el.addEventListener('pressed', (e) => seen.push((e as CustomEvent<number>).detail));
    el.shadowRoot!.querySelector('button')!.click();
    el.shadowRoot!.querySelector('button')!.click();
    await flush();
    expect(seen).toEqual([1, 2]);
    expect(el.shadowRoot!.querySelector('button')!.textContent).toBe('Press me (2)');
  });

  it('reflects and honours the inherited disabled prop', async () => {
    const el = await mount<PressButton>('<pop-press-button></pop-press-button>');
    el.disabled = true;
    await flush();
    expect(el.hasAttribute('disabled')).toBe(true);
    el.shadowRoot!.querySelector('button')!.click();
    await flush();
    expect(el.pressCount).toBe(0);
  });
});
