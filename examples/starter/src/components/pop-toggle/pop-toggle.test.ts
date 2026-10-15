import { describe, expect, it } from 'vitest';

import { flush, mount } from '../../test-utils';
import './pop-toggle';

describe('pop-toggle', () => {
  it('renders its label', async () => {
    const el = await mount<HTMLElement>('<pop-toggle label="Hi"></pop-toggle>');
    expect(el.shadowRoot!.querySelector('button')!.textContent).toBe('Hi');
  });

  it('toggles and emits', async () => {
    const el = await mount<HTMLElement>('<pop-toggle></pop-toggle>');
    const seen: boolean[] = [];
    el.addEventListener('toggled', (e) => seen.push((e as CustomEvent<boolean>).detail));
    el.shadowRoot!.querySelector('button')!.click();
    await flush();
    expect(el.classList.contains('active')).toBe(true);
    expect(seen).toEqual([true]);
  });
});
