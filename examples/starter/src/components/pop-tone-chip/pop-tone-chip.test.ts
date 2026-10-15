import { describe, expect, it } from 'vitest';

import { flush, mount } from '../../test-utils';
import './pop-tone-chip';

type ToneChip = HTMLElement & { tone: 'red' | 'blue'; toneChanges: number };

describe('pop-tone-chip (a mixin)', () => {
  it('takes the mixed-in prop and reflects it', async () => {
    const el = await mount<ToneChip>('<pop-tone-chip text="Hi"></pop-tone-chip>');
    expect(el.tone).toBe('red');
    expect(el.getAttribute('tone')).toBe('red');
    expect(el.shadowRoot!.querySelector('span')!.className).toBe('red');
  });

  it('reads the mixed-in prop from its attribute', async () => {
    const el = await mount<ToneChip>('<pop-tone-chip tone="blue"></pop-tone-chip>');
    expect(el.tone).toBe('blue');
  });

  it('runs the mixed-in watcher', async () => {
    const el = await mount<ToneChip>('<pop-tone-chip></pop-tone-chip>');
    el.click();
    await flush();
    expect(el.tone).toBe('blue');
    expect(el.getAttribute('tone')).toBe('blue');
    expect(el.toneChanges).toBe(1);
  });
});
