import { newSpecPage } from '../../test-utils/spec-page';
import { PopChipInput } from './chip-input';

/** Build a page with the component + set props, then flush a render. */
async function mount(props: Partial<PopChipInput> = {}) {
  const page = await newSpecPage({
    components: [PopChipInput],
    html: `<pop-chip-input></pop-chip-input>`,
  });
  Object.assign(page.rootInstance, props);
  await page.waitForChanges();
  return page;
}

describe('pop-chip-input', () => {
  it('renders selected chips with resolved labels (backward compatible {id,label})', async () => {
    const page = await mount({
      value: ['critical'],
      suggestions: [{ id: 'critical', label: 'Critical' }],
    });
    const chip = page.root!.querySelector('.pci__chip-label');
    expect(chip?.textContent).toBe('Critical');
  });

  it('falls back to the raw id when no suggestion matches (free-text)', async () => {
    const page = await mount({ value: ['adhoc'], suggestions: [] });
    expect(page.root!.querySelector('.pci__chip-label')?.textContent).toBe('adhoc');
  });

  it('renders a selected chip with its emoji prefix and a color-tinted style', async () => {
    const page = await mount({
      value: ['work'],
      suggestions: [{ id: 'work', label: 'Work', emoji: '💼', color: '#e5484d' }],
    });
    const chip = page.root!.querySelector('.pci__chip') as HTMLElement;
    expect(page.root!.querySelector('.pci__chip-emoji')?.textContent).toBe('💼');
    // color feeds an inline background/border derived from the suggestion color
    // (jsdom normalizes the #hex inside color-mix to rgb()).
    expect(chip.style.background).toContain('color-mix');
    expect(chip.style.background).toContain('rgb(229, 72, 77)');
    expect(chip.style.borderColor).toContain('rgb(229, 72, 77)');
  });

  it('renders a neutral chip (no inline color) when the suggestion has no color', async () => {
    const page = await mount({
      value: ['plain'],
      suggestions: [{ id: 'plain', label: 'Plain' }],
    });
    const chip = page.root!.querySelector('.pci__chip') as HTMLElement;
    expect(chip.style.background).toBe('');
  });

  it('shows emoji / color-dot + label in the suggestions dropdown', async () => {
    const page = await mount({
      suggestions: [
        { id: 'a', label: 'Alpha', emoji: '🅰️' },
        { id: 'b', label: 'Beta', color: '#3b82f6' },
      ],
    });
    page.rootInstance.draft = '';
    page.rootInstance.openSuggestions = true;
    await page.waitForChanges();
    const rows = page.root!.querySelectorAll('.pci__suggestion');
    expect(rows.length).toBe(2);
    expect(page.root!.querySelector('.pci__suggestion-emoji')?.textContent).toBe('🅰️');
    const dot = page.root!.querySelector('.pci__suggestion-dot') as HTMLElement;
    expect(dot.style.background).toBe('rgb(59, 130, 246)');
  });

  it('offers a "Create" row for an unknown draft and emits createChip on select', async () => {
    const page = await mount({
      allowCreate: true,
      suggestions: [{ id: 'work', label: 'Work' }],
    });
    const events: Array<{ label: string }> = [];
    page.root!.addEventListener('createChip', (e: Event) => events.push((e as CustomEvent).detail));

    page.rootInstance.draft = 'urgent';
    page.rootInstance.openSuggestions = true;
    await page.waitForChanges();

    const createRow = page.root!.querySelector('.pci__suggestion--create') as HTMLElement;
    expect(createRow).toBeTruthy();
    expect(createRow.textContent).toContain('urgent');

    createRow.dispatchEvent(new MouseEvent('mousedown'));
    await page.waitForChanges();
    expect(events).toEqual([{ label: 'urgent' }]);
  });

  it('does NOT offer a Create row when the draft matches an existing suggestion label', async () => {
    const page = await mount({
      allowCreate: true,
      suggestions: [{ id: 'work', label: 'Work' }],
    });
    page.rootInstance.draft = 'work';
    page.rootInstance.openSuggestions = true;
    await page.waitForChanges();
    expect(page.root!.querySelector('.pci__suggestion--create')).toBeFalsy();
  });

  it('does NOT offer a Create row when allowCreate is off (unchanged default)', async () => {
    const page = await mount({ suggestions: [{ id: 'work', label: 'Work' }] });
    page.rootInstance.draft = 'brand-new';
    page.rootInstance.openSuggestions = true;
    await page.waitForChanges();
    expect(page.root!.querySelector('.pci__suggestion--create')).toBeFalsy();
  });
});
