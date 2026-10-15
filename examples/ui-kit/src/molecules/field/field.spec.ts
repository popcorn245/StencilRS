import { newSpecPage, type SpecPage } from '../../test-utils/spec-page';
import { PopField } from './field';
import type { FieldSpec } from './field-logic';

async function fieldPage(spec: FieldSpec, value?: unknown, html = `<pop-field></pop-field>`): Promise<SpecPage<PopField>> {
  const page = await newSpecPage<PopField>({ components: [PopField], html });
  page.rootInstance.spec = spec;
  if (value !== undefined) page.rootInstance.value = value;
  await page.waitForChanges();
  return page;
}

const emitted = (page: SpecPage) => {
  const seen: { key: string; value: unknown }[] = [];
  page.root.addEventListener('valueChange', (e) => seen.push((e as CustomEvent<{ key: string; value: unknown }>).detail));
  return seen;
};

describe('pop-field type→widget mapping', () => {
  it('text → pop-fillable-field', async () => {
    const page = await fieldPage({ key: 'topic', label: 'Topic', type: 'text', required: true });
    const ff = page.root.querySelector('pop-fillable-field');
    expect(ff).not.toBeNull();
    expect(ff?.getAttribute('label')).toBe('Topic *');
  });

  it('select → pop-fillable-field with options (optional gets a "—" placeholder)', async () => {
    const page = await fieldPage({
      key: 'model',
      label: 'Model',
      type: 'select',
      optional: true,
      options: [
        { value: 'gemma', label: 'Gemma' },
        { value: 'claude', label: 'Claude' },
      ],
    });
    const ff = page.root.querySelector('pop-fillable-field') as HTMLElement & { options?: { value: string }[] };
    expect(ff).not.toBeNull();
    expect(ff.options?.[0]).toEqual({ value: '', label: '—' });
    expect(ff.options).toHaveLength(3);
  });

  it('required select gets NO placeholder', async () => {
    const page = await fieldPage({
      key: 'model',
      label: 'Model',
      type: 'select',
      required: true,
      options: [{ value: 'gemma', label: 'Gemma' }],
    });
    const ff = page.root.querySelector('pop-fillable-field') as HTMLElement & { options?: { value: string }[] };
    expect(ff.options).toHaveLength(1);
  });

  it('number → native input, clamped to min/max on input', async () => {
    const page = await fieldPage({ key: 'n', label: 'Count', type: 'number', min: 1, max: 10 });
    const seen = emitted(page);
    const input = page.root.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    input.value = '25';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(seen).toEqual([{ key: 'n', value: '10' }]);
  });

  it('date → native date input', async () => {
    const page = await fieldPage({ key: 'when', label: 'When', type: 'date' });
    const seen = emitted(page);
    const input = page.root.querySelector('input[type="date"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    input.value = '2026-07-09';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(seen).toEqual([{ key: 'when', value: '2026-07-09' }]);
  });

  it('boolean → pop-switch', async () => {
    const page = await fieldPage({ key: 'webOnly', label: 'Web only', type: 'boolean' }, 'true');
    const sw = page.root.querySelector('pop-switch');
    expect(sw).not.toBeNull();
    expect((sw as HTMLElement & { checked?: boolean }).checked).toBe(true);
  });

  it('location → pop-location with the soft default', async () => {
    const page = await fieldPage({ key: 'loc', label: 'Location', type: 'location', defaultValue: '63385' });
    const loc = page.root.querySelector('pop-location');
    expect(loc).not.toBeNull();
    expect(loc?.getAttribute('default')).toBe('63385');
  });

  it('depth → slider + ticks + count box; preset emits {depth, maxSources:""}', async () => {
    const page = await fieldPage({ key: 'depth', label: 'Depth', type: 'depth' }, { depth: 'standard', maxSources: '' });
    const seen = emitted(page);
    const ticks = Array.from(page.root.querySelectorAll('.field__depth-tick')).map((t) => t.textContent);
    expect(ticks).toEqual(['quick', 'standard', 'deep', 'custom']);
    (page.root.querySelectorAll('.field__depth-tick')[2] as HTMLButtonElement).click();
    expect(seen).toEqual([{ key: 'depth', value: { depth: 'deep', maxSources: '' } }]);
  });

  it('depth custom stop clears depth and drives maxSources', async () => {
    const page = await fieldPage({ key: 'depth', label: 'Depth', type: 'depth' }, { depth: 'standard', maxSources: '' });
    const seen = emitted(page);
    (page.root.querySelectorAll('.field__depth-tick')[3] as HTMLButtonElement).click();
    expect(seen).toEqual([{ key: 'depth', value: { depth: '', maxSources: '8' } }]);
  });

  it('persist → two checkboxes combining into one value', async () => {
    const page = await fieldPage({ key: 'persist', label: 'Save', type: 'persist' }, 'note');
    const seen = emitted(page);
    const boxes = page.root.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    expect(boxes).toHaveLength(2);
    expect(boxes[0].checked).toBe(true); // note
    expect(boxes[1].checked).toBe(false); // index
    boxes[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(seen).toEqual([{ key: 'persist', value: 'both' }]);
  });
});

describe('pop-field slot fallback (unknown type)', () => {
  it('keeps label/hint/required chrome around the slot', async () => {
    const page = await fieldPage({ key: 'movie', label: 'Movie', type: 'movie', hint: 'TMDB', required: true });
    expect(page.root.querySelector('.field__label-text')?.textContent).toBe('Movie *');
    expect(page.root.querySelector('.field__hint')?.textContent).toBe('TMDB');
    // The app-supplied widget renders through the default slot inside the chrome.
    expect(page.root.querySelector('.field__slot')).not.toBeNull();
  });

  it('re-emits a slotted widget valueChange as its own {key, value}', async () => {
    const page = await fieldPage({ key: 'movie', label: 'Movie', type: 'movie' });
    const seen = emitted(page);
    const inner = new CustomEvent('valueChange', { detail: 'Alien', bubbles: true });
    // Simulate the slotted widget's event reaching the relay.
    (page.rootInstance as PopField)['relay'](inner);
    expect(seen).toEqual([{ key: 'movie', value: 'Alien' }]);
  });
});

describe('pop-field chrome', () => {
  it('shows the inline Required error when invalid', async () => {
    const page = await newSpecPage<PopField>({ components: [PopField], html: `<pop-field invalid></pop-field>` });
    page.rootInstance.spec = { key: 'n', label: 'Count', type: 'number' };
    await page.waitForChanges();
    expect(page.root.querySelector('.field__error')?.textContent).toBe('Required');
  });

  it('renders nothing without a spec', async () => {
    const page = await newSpecPage<PopField>({ components: [PopField], html: `<pop-field></pop-field>` });
    expect(page.root.querySelector('.field')).toBeNull();
  });
});
