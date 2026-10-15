import { describe, expect, it } from 'vitest';

import { flush, mount } from '../../test-utils';

// happy-dom has no ElementInternals: a stand-in, only where it's missing, so the serializers
// can be tested here. pop-date-field.browser.test.ts covers the real form association.
if (!('attachInternals' in HTMLElement.prototype)) {
  Object.assign(HTMLElement.prototype, { attachInternals: () => ({ setFormValue() {}, states: new Set() }) });
}
await import('./pop-date-field');

type DateField = HTMLElement & { value?: Date };

describe('pop-date-field (serializers)', () => {
  it('deserializes the attribute into a Date (@AttrDeserialize)', async () => {
    const el = await mount<DateField>('<pop-date-field value="2026-10-15"></pop-date-field>');
    expect(el.value).toBeInstanceOf(Date);
    expect(el.value!.toISOString()).toBe('2026-10-15T00:00:00.000Z');
    expect(el.shadowRoot!.querySelector('input')!.value).toBe('2026-10-15');
  });

  it('serializes a Date into the attribute (@PropSerialize)', async () => {
    const el = await mount<DateField>('<pop-date-field></pop-date-field>');
    el.value = new Date('2026-01-02T00:00:00Z');
    await flush();
    expect(el.getAttribute('value')).toBe('2026-01-02');
  });

  it('takes a day from the input and emits it', async () => {
    const el = await mount<DateField>('<pop-date-field></pop-date-field>');
    const seen: (Date | undefined)[] = [];
    el.addEventListener('dateChange', (e) => seen.push((e as CustomEvent<Date | undefined>).detail));
    const input = el.shadowRoot!.querySelector('input')!;
    input.value = '2026-03-04';
    input.dispatchEvent(new Event('input'));
    await flush();
    expect(el.value!.toISOString()).toBe('2026-03-04T00:00:00.000Z');
    expect(seen.map((d) => d?.toISOString())).toEqual(['2026-03-04T00:00:00.000Z']);
  });
});
