import { describe, expect, it } from 'vitest';

import { flush, mount } from '../../test-utils';
import './pop-counter';

type Counter = HTMLElement & { reset(): Promise<void>; step: number };

describe('pop-counter', () => {
  it('renders its label and a zero count', async () => {
    const el = await mount<Counter>('<pop-counter label="Clicks"></pop-counter>');
    expect(el.shadowRoot!.querySelector('.label')!.textContent).toBe('Clicks');
    expect(el.shadowRoot!.querySelector('output')!.textContent).toBe('0');
  });

  it('counts by step and emits countChanged', async () => {
    const el = await mount<Counter>('<pop-counter step="5"></pop-counter>');
    const seen: number[] = [];
    el.addEventListener('countChanged', (e) => seen.push((e as CustomEvent<number>).detail));

    const button = el.shadowRoot!.querySelector('button')!;
    expect(button.textContent).toBe('+5');
    button.click();
    button.click();
    await flush();

    expect(el.shadowRoot!.querySelector('output')!.textContent).toBe('10');
    expect(seen).toEqual([5, 10]);
  });

  it('turns the step attribute into a number prop', async () => {
    const el = await mount<Counter>('<pop-counter step="3"></pop-counter>');
    expect(el.step).toBe(3);
  });

  it('resets through its @Method', async () => {
    const el = await mount<Counter>('<pop-counter></pop-counter>');
    el.shadowRoot!.querySelector('button')!.click();
    await flush();
    await el.reset();
    await flush();
    expect(el.shadowRoot!.querySelector('output')!.textContent).toBe('0');
  });

  it('applies its stylesheet', async () => {
    const el = await mount<Counter>('<pop-counter></pop-counter>');
    const sheets = el.shadowRoot!.adoptedStyleSheets ?? [];
    const css = sheets.flatMap((s) => [...s.cssRules].map((r) => r.cssText)).join('\n') + (el.shadowRoot!.querySelector('style')?.textContent ?? '');
    // happy-dom keeps the source text; real browsers normalise the colour.
    expect(css).toMatch(/#e53e3e|rgb\(229, 62, 62\)/);
  });
});
