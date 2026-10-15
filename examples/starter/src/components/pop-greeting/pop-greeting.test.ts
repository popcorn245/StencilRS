import { describe, expect, it } from 'vitest';

import { flush, mount } from '../../test-utils';
import './pop-greeting';

type Greeting = HTMLElement & { name: string };

describe('pop-greeting', () => {
  it('greets the name attribute', async () => {
    const el = await mount<Greeting>('<pop-greeting name="Ada"></pop-greeting>');
    expect(el.shadowRoot!.querySelector('strong')!.textContent).toBe('Ada');
  });

  it('re-renders, reflects and counts renames through @Watch', async () => {
    const el = await mount<Greeting>('<pop-greeting></pop-greeting>');
    expect(el.shadowRoot!.querySelector('strong')!.textContent).toBe('world');

    el.name = 'Grace';
    await flush();

    expect(el.shadowRoot!.querySelector('strong')!.textContent).toBe('Grace');
    expect(el.getAttribute('name')).toBe('Grace');
    expect(el.shadowRoot!.querySelector('small')!.textContent).toContain('renamed 1×');
  });
});
