// Real ElementInternals: runs in the browser only (npm run test:browser).
import { describe, expect, it } from 'vitest';

import { flush } from '../../test-utils';
import './pop-date-field';

type DateField = HTMLElement & { value?: Date; internals: ElementInternals; componentOnReady(): Promise<DateField> };

const inForm = async (html: string) => {
  document.body.innerHTML = `<form>${html}</form>`;
  const form = document.querySelector('form')!;
  const el = form.querySelector<DateField>('pop-date-field')!;
  await el.componentOnReady();
  return { form, el };
};

describe('pop-date-field (form-associated, @AttachInternals)', () => {
  it('is a form-associated custom element', () => {
    expect((customElements.get('pop-date-field') as unknown as { formAssociated: boolean }).formAssociated).toBe(true);
  });

  it('belongs to its form and submits its day', async () => {
    const { form, el } = await inForm('<pop-date-field name="when" value="2026-10-15"></pop-date-field>');
    expect(el.internals.form).toBe(form);
    expect(new FormData(form).get('when')).toBe('2026-10-15');
  });

  it('updates the form value when the day changes', async () => {
    const { form, el } = await inForm('<pop-date-field name="when"></pop-date-field>');
    expect(new FormData(form).get('when')).toBeNull();
    el.value = new Date('2026-12-24T00:00:00Z');
    await flush();
    expect(new FormData(form).get('when')).toBe('2026-12-24');
  });
});
