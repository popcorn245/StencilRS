import { newSpecPage } from '../../test-utils/spec-page';
import { PopLocation } from './location';

describe('pop-location — trigger variants', () => {
  it('renders the filled button trigger by default', async () => {
    const page = await newSpecPage({
      components: [PopLocation],
      html: `<pop-location value="Austin, TX"></pop-location>`,
    });
    // Default → the filled .pl__btn trigger with a pin; NOT the inline trigger.
    expect(page.root.querySelector('.pl__btn')).toBeTruthy();
    expect(page.root.querySelector('.pl__inline')).toBeFalsy();
    expect(page.root.querySelector('.pl__btn-label')!.textContent).toContain('Austin, TX');
  });

  it('renders a plain inline trigger (label + caret, no filled button) when variant="inline"', async () => {
    const page = await newSpecPage({
      components: [PopLocation],
      html: `<pop-location variant="inline" value="Wentzville, MO, US"></pop-location>`,
    });
    expect(page.root.querySelector('.pl__btn')).toBeFalsy();
    const trigger = page.root.querySelector('.pl__inline') as HTMLElement;
    expect(trigger).toBeTruthy();
    expect(page.root.querySelector('.pl__inline-label')!.textContent).toContain('Wentzville, MO, US');
    expect(page.root.querySelector('.pl__inline-caret')).toBeTruthy();
    // Host carries the inline modifier so the popover can right-align.
    expect(page.root.querySelector('.pl--inline')).toBeTruthy();
  });

  it('inline trigger opens a RIGHT-aligned popover that drops down from it', async () => {
    const page = await newSpecPage({
      components: [PopLocation],
      html: `<pop-location variant="inline" value="Austin, TX"></pop-location>`,
    });
    const inst = page.rootInstance as any;
    // Open the popover (toggle is what the trigger click invokes).
    inst.open = true;
    await page.waitForChanges();
    const pop = page.root.querySelector('.pl__pop') as HTMLElement;
    expect(pop).toBeTruthy();
    // Right-aligned variant of the popover so it can't overflow the right edge.
    expect(pop.classList.contains('pl__pop--right')).toBe(true);
    // Still carries the autocomplete input + the find-my-location button.
    expect(page.root.querySelector('.pl__input')).toBeTruthy();
    expect(page.root.querySelector('.pl__locate')).toBeTruthy();
  });

  it('button trigger opens a full-width (non-right) popover', async () => {
    const page = await newSpecPage({
      components: [PopLocation],
      html: `<pop-location value="Austin, TX"></pop-location>`,
    });
    const inst = page.rootInstance as any;
    inst.open = true;
    await page.waitForChanges();
    const pop = page.root.querySelector('.pl__pop') as HTMLElement;
    expect(pop).toBeTruthy();
    expect(pop.classList.contains('pl__pop--right')).toBe(false);
  });
});

describe('pop-location — keyboard nav + Enter/ZIP validation', () => {
  const SUGGS = [
    { id: '1', label: 'Austin, Texas, 78701, US', zip: '78701', lat: 30.2, lng: -97.7 },
    { id: '2', label: 'Austin, Minnesota, US', zip: '', lat: 43.6, lng: -92.9 },
  ];

  async function open() {
    const page = await newSpecPage({ components: [PopLocation], html: `<pop-location></pop-location>` });
    const inst = page.rootInstance as any;
    // The @Event() mock dispatches a real CustomEvent on the host el; capture it.
    const emitted: any[] = [];
    page.root.addEventListener('popLocationChange', (e: any) => emitted.push(e.detail));
    inst.open = true;
    await page.waitForChanges();
    return { page, inst, emitted };
  }

  function keydown(inst: any, key: string) {
    let prevented = false;
    inst.onKeyDown({ key, preventDefault: () => { prevented = true; } } as any);
    return prevented;
  }

  it('ArrowDown/ArrowUp move the highlight and wrap', async () => {
    const { page, inst } = await open();
    inst.suggestions = SUGGS;
    inst.highlight = -1;
    await page.waitForChanges();
    keydown(inst, 'ArrowDown'); expect(inst.highlight).toBe(0);
    keydown(inst, 'ArrowDown'); expect(inst.highlight).toBe(1);
    keydown(inst, 'ArrowDown'); expect(inst.highlight).toBe(1); // clamps at last
    keydown(inst, 'ArrowUp');   expect(inst.highlight).toBe(0);
    keydown(inst, 'ArrowUp');   expect(inst.highlight).toBe(1); // wraps up → last
  });

  it('Enter on a highlighted suggestion commits it (emits + closes)', async () => {
    const { page, inst, emitted } = await open();
    inst.suggestions = SUGGS;
    inst.highlight = 0;
    await page.waitForChanges();
    keydown(inst, 'Enter');
    expect(emitted).toContainEqual(expect.objectContaining({ zip: '78701', label: 'Austin, Texas, 78701, US' }));
    expect(inst.open).toBe(false);
  });

  it('Enter with a valid 5-digit ZIP (no highlight) submits the ZIP directly', async () => {
    const { page, inst, emitted } = await open();
    inst.suggestions = []; // no suggestions
    inst.highlight = -1;
    inst.query = '63385';
    await page.waitForChanges();
    keydown(inst, 'Enter');
    expect(emitted).toContainEqual(expect.objectContaining({ zip: '63385', label: '63385' }));
    expect(inst.open).toBe(false);
  });

  it('Enter with invalid text + multiple suggestions shows a validation message, no submit', async () => {
    const { page, inst, emitted } = await open();
    inst.suggestions = SUGGS; // 2 → ambiguous
    inst.highlight = -1;
    inst.query = 'Austin'; // not a ZIP
    await page.waitForChanges();
    keydown(inst, 'Enter');
    expect(emitted).toHaveLength(0);
    expect(inst.open).toBe(true);
    expect(inst.error).toMatch(/suggestion|ZIP/i);
  });

  it('Enter with a single suggestion picks it even without a highlight', async () => {
    const { page, inst, emitted } = await open();
    inst.suggestions = [SUGGS[0]];
    inst.highlight = -1;
    inst.query = 'Austin';
    await page.waitForChanges();
    keydown(inst, 'Enter');
    expect(emitted).toContainEqual(expect.objectContaining({ zip: '78701' }));
  });

  it('isUsZip accepts 5-digit and ZIP+4, rejects others', async () => {
    const { inst } = await open();
    expect(inst.isUsZip('63385')).toBe(true);
    expect(inst.isUsZip('63385-1234')).toBe(true);
    expect(inst.isUsZip('6338')).toBe(false);
    expect(inst.isUsZip('Austin')).toBe(false);
    expect(inst.isUsZip('123456')).toBe(false);
  });
});

describe('pop-location — `default` soft fallback', () => {
  function installEmptyStorage(): Record<string, string> {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
    });
    return store;
  }

  it('shows the `default` when the shared store is empty (no value prop)', async () => {
    installEmptyStorage(); // hub:location unset
    const page = await newSpecPage({
      components: [PopLocation],
      html: `<pop-location default="63385"></pop-location>`,
    });
    expect(page.root.querySelector('.pl__btn-label')!.textContent).toContain('63385');
  });

  it('shows the `default` on the inline trigger too', async () => {
    installEmptyStorage();
    const page = await newSpecPage({
      components: [PopLocation],
      html: `<pop-location variant="inline" default="63385"></pop-location>`,
    });
    expect(page.root.querySelector('.pl__inline-label')!.textContent).toContain('63385');
  });

  it('does NOT write the `default` to localStorage or emit popLocationChange', async () => {
    const store = installEmptyStorage();
    const page = await newSpecPage({
      components: [PopLocation],
      html: `<pop-location default="63385"></pop-location>`,
    });
    const emitted: any[] = [];
    page.root.addEventListener('popLocationChange', (e: any) => emitted.push(e.detail));
    await page.waitForChanges();
    // Soft fallback: nothing persisted, nothing emitted just by showing it.
    expect(store['hub:location']).toBeUndefined();
    expect(emitted).toHaveLength(0);
  });

  it('an actively-set location still overrides the `default` (persists + emits)', async () => {
    const store = installEmptyStorage();
    const page = await newSpecPage({
      components: [PopLocation],
      html: `<pop-location default="63385"></pop-location>`,
    });
    const emitted: any[] = [];
    page.root.addEventListener('popLocationChange', (e: any) => emitted.push(e.detail));
    const inst = page.rootInstance as any;
    inst.commit({ label: 'Austin, TX', zip: '78701', lat: 30.2, lng: -97.7 });
    await page.waitForChanges();
    expect(store['hub:location']).toBeTruthy(); // now persisted
    expect(emitted).toContainEqual(expect.objectContaining({ zip: '78701' }));
    expect(page.root.querySelector('.pl__btn-label')!.textContent).toContain('Austin, TX');
  });

  it('a stored location takes precedence over the `default`', async () => {
    const store = installEmptyStorage();
    store['hub:location'] = JSON.stringify({ label: 'Denver, CO', zip: '80202', lat: 39.7, lng: -105, updatedAt: 1 });
    const page = await newSpecPage({
      components: [PopLocation],
      html: `<pop-location default="63385"></pop-location>`,
    });
    expect(page.root.querySelector('.pl__btn-label')!.textContent).toContain('Denver, CO');
    expect(page.root.querySelector('.pl__btn-label')!.textContent).not.toContain('63385');
  });
});
