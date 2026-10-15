import { newSpecPage, setProps } from '../../test-utils/spec-page';
import { PopSearchFilter } from './search-filter';

const FILTERS = JSON.stringify([
  {
    key: 'show',
    label: 'Show',
    kind: 'tabs',
    value: '',
    options: [
      { value: '', label: 'All' },
      { value: 'low', label: 'Low stock' },
      { value: 'grocery', label: 'On list' },
    ],
  },
  {
    key: 'category',
    label: 'Category',
    kind: 'select',
    value: '',
    options: [
      { value: '', label: 'All categories' },
      { value: 'Grocery', label: 'Grocery' },
      { value: 'Tools', label: 'Tools' },
    ],
  },
]);

const mk = (attrs = '') => `<pop-search-filter filters='${FILTERS}' debounce="0" ${attrs}></pop-search-filter>`;

describe('pop-search-filter', () => {
  it('renders the search input, lead glyph and the inset funnel button', async () => {
    const page = await newSpecPage({ components: [PopSearchFilter], html: mk() });
    expect(page.root.querySelector('.psf__input')).toBeTruthy();
    expect(page.root.querySelector('pop-icon.psf__lead')).toBeTruthy();
    expect(page.root.querySelector('.psf__funnel')).toBeTruthy();
    // popover closed initially
    expect(page.root.querySelector('.psf__menu')).toBeNull();
  });

  it('hides the funnel entirely when there are no filter groups', async () => {
    const page = await newSpecPage({
      components: [PopSearchFilter],
      html: `<pop-search-filter filters='[]' debounce="0"></pop-search-filter>`,
    });
    expect(page.root.querySelector('.psf__funnel')).toBeNull();
  });

  it('parses malformed filter JSON defensively (no funnel, no crash)', async () => {
    const page = await newSpecPage({
      components: [PopSearchFilter],
      html: `<pop-search-filter filters='not json' debounce="0"></pop-search-filter>`,
    });
    expect(page.root.querySelector('.psf__funnel')).toBeNull();
  });

  it('emits searchChange with the typed text (debounce 0 → synchronous)', async () => {
    const page = await newSpecPage({ components: [PopSearchFilter], html: mk() });
    const events: string[] = [];
    page.root.addEventListener('searchChange', (e: any) => events.push(e.detail));
    const input = page.root.querySelector('.psf__input') as HTMLInputElement;
    input.value = 'milk';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(events).toEqual(['milk']);
    expect((page.rootInstance as PopSearchFilter).value).toBe('milk');
  });

  it('debounces searchChange when debounce > 0', async () => {
    vi.useFakeTimers();
    try {
      const page = await newSpecPage({
        components: [PopSearchFilter],
        html: `<pop-search-filter filters='[]' debounce="150"></pop-search-filter>`,
      });
      const events: string[] = [];
      page.root.addEventListener('searchChange', (e: any) => events.push(e.detail));
      const input = page.root.querySelector('.psf__input') as HTMLInputElement;
      input.value = 'mi';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.value = 'milk';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(events).toEqual([]);
      vi.advanceTimersByTime(200);
      // only the LAST value fires — the first timer was superseded
      expect(events).toEqual(['milk']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens the popover on funnel click, rendering tabs and select groups', async () => {
    const page = await newSpecPage({ components: [PopSearchFilter], html: mk() });
    (page.root.querySelector('.psf__funnel') as HTMLButtonElement).click();
    await page.waitForChanges();
    const menu = page.root.querySelector('.psf__menu');
    expect(menu).toBeTruthy();
    expect(menu!.querySelectorAll('.psf__tab').length).toBe(3);
    expect(menu!.querySelectorAll('.psf__select').length).toBe(1);
    const labels = Array.from(menu!.querySelectorAll('.psf__group-label')).map((e) => e.textContent);
    expect(labels).toEqual(['Show', 'Category']);
  });

  it('emits filterChange {key, value} when a tab option is picked', async () => {
    const page = await newSpecPage({ components: [PopSearchFilter], html: mk() });
    const events: any[] = [];
    page.root.addEventListener('filterChange', (e: any) => events.push(e.detail));
    (page.root.querySelector('.psf__funnel') as HTMLButtonElement).click();
    await page.waitForChanges();
    const tabs = page.root.querySelectorAll('.psf__tab');
    (tabs[1] as HTMLButtonElement).click(); // 'Low stock'
    await page.waitForChanges();
    expect(events).toEqual([{ key: 'show', value: 'low' }]);
    // the picked tab is echoed locally as pressed
    expect(page.root.querySelector('.psf__tab--on')!.textContent).toContain('Low stock');
  });

  it('shows the active dot only when some group value is non-default', async () => {
    const atRest = await newSpecPage({ components: [PopSearchFilter], html: mk() });
    expect(atRest.root.querySelector('.psf__dot')).toBeNull();

    const activeFilters = JSON.stringify([
      {
        key: 'show',
        label: 'Show',
        kind: 'tabs',
        value: 'low',
        options: [
          { value: '', label: 'All' },
          { value: 'low', label: 'Low stock' },
        ],
      },
    ]);
    const active = await newSpecPage({
      components: [PopSearchFilter],
      html: `<pop-search-filter filters='${activeFilters}' debounce="0"></pop-search-filter>`,
    });
    expect(active.root.querySelector('.psf__dot')).toBeTruthy();
  });

  it('renders Clear all only when a filter is active, and emits clearFilters', async () => {
    const activeFilters = JSON.stringify([
      {
        key: 'show',
        label: 'Show',
        kind: 'tabs',
        value: 'low',
        options: [
          { value: '', label: 'All' },
          { value: 'low', label: 'Low stock' },
        ],
      },
    ]);
    const page = await newSpecPage({
      components: [PopSearchFilter],
      html: `<pop-search-filter filters='${activeFilters}' debounce="0" show-clear></pop-search-filter>`,
    });
    const events: any[] = [];
    page.root.addEventListener('clearFilters', () => events.push(true));
    (page.root.querySelector('.psf__funnel') as HTMLButtonElement).click();
    await page.waitForChanges();
    const clear = page.root.querySelector('.psf__clear') as HTMLButtonElement;
    expect(clear).toBeTruthy();
    clear.click();
    await page.waitForChanges();
    expect(events.length).toBe(1);
    // local echo: all groups reset → dot gone, Clear all gone
    expect(page.root.querySelector('.psf__dot')).toBeNull();
    expect(page.root.querySelector('.psf__clear')).toBeNull();
  });

  it('omits Clear all when show-clear is false even with active filters', async () => {
    const activeFilters = JSON.stringify([
      {
        key: 'show',
        label: 'Show',
        kind: 'tabs',
        value: 'low',
        options: [{ value: 'low', label: 'Low stock' }],
      },
    ]);
    const page = await newSpecPage({
      components: [PopSearchFilter],
      html: `<pop-search-filter filters='${activeFilters}' debounce="0"></pop-search-filter>`,
    });
    await setProps(page, { showClear: false });
    (page.root.querySelector('.psf__funnel') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(page.root.querySelector('.psf__clear')).toBeNull();
  });

  it('slot mode: a [slot=input] widget replaces the built-in input but keeps the funnel', async () => {
    const page = await newSpecPage({
      components: [PopSearchFilter],
      html: `<pop-search-filter filters='${FILTERS}' debounce="0"><input slot="input" id="custom" /></pop-search-filter>`,
    });
    // The input slot is ALWAYS rendered (scoped-slot rule). Scoped components emulate <slot>,
    // so look for the slotted widget inside the slot's wrapper rather than a <slot> element.
    expect(page.root.querySelector('#custom')?.parentElement?.classList.contains('psf__slot')).toBe(true);
    // The harness appends slotted children AFTER the first render (mirroring
    // late projection); the didLoad recheck flags it — the next render flips
    // into slot mode.
    expect(page.root.querySelector('#custom')).toBeTruthy();
    await page.waitForChanges();
    expect(page.root.querySelector('.psf--slotted')).toBeTruthy();
    expect(page.root.querySelector('.psf__input')).toBeNull(); // built-in input gone
    expect(page.root.querySelector('pop-icon.psf__lead')).toBeNull(); // lead glyph dropped
    expect(page.root.querySelector('.psf__funnel')).toBeTruthy(); // funnel chrome kept
  });

  it('slot mode + empty filters: search-only — no funnel, no built-in input', async () => {
    const page = await newSpecPage({
      components: [PopSearchFilter],
      html: `<pop-search-filter filters='[]' debounce="0"><input slot="input" id="custom" /></pop-search-filter>`,
    });
    await page.waitForChanges();
    expect(page.root.querySelector('.psf--slotted')).toBeTruthy();
    expect(page.root.querySelector('.psf__input')).toBeNull();
    expect(page.root.querySelector('.psf__funnel')).toBeNull();
  });

  it('treats value === default as at-rest: no dot until a group leaves its default', async () => {
    const mkGroups = (sortValue: string) =>
      JSON.stringify([
        {
          key: 'sort',
          label: 'Sort',
          kind: 'select',
          value: sortValue,
          default: 'dueDate',
          options: [
            { value: 'dueDate', label: 'Due date' },
            { value: 'priority', label: 'Priority' },
          ],
        },
      ]);
    const atRest = await newSpecPage({
      components: [PopSearchFilter],
      html: `<pop-search-filter filters='${mkGroups('dueDate')}' debounce="0"></pop-search-filter>`,
    });
    expect(atRest.root.querySelector('.psf__dot')).toBeNull();

    const active = await newSpecPage({
      components: [PopSearchFilter],
      html: `<pop-search-filter filters='${mkGroups('priority')}' debounce="0"></pop-search-filter>`,
    });
    expect(active.root.querySelector('.psf__dot')).toBeTruthy();
  });

  it('Clear all resets groups to their DEFAULTS (not blank) and emits clearFilters', async () => {
    const groups = JSON.stringify([
      {
        key: 'sort',
        label: 'Sort',
        kind: 'select',
        value: 'priority',
        default: 'dueDate',
        options: [
          { value: 'dueDate', label: 'Due date' },
          { value: 'priority', label: 'Priority' },
        ],
      },
      {
        key: 'status',
        label: 'Status',
        kind: 'tabs',
        value: 'open',
        options: [
          { value: '', label: 'All' },
          { value: 'open', label: 'Open' },
        ],
      },
    ]);
    const page = await newSpecPage({
      components: [PopSearchFilter],
      html: `<pop-search-filter filters='${groups}' debounce="0" show-clear></pop-search-filter>`,
    });
    const events: unknown[] = [];
    page.root.addEventListener('clearFilters', () => events.push(true));
    (page.root.querySelector('.psf__funnel') as HTMLButtonElement).click();
    await page.waitForChanges();
    (page.root.querySelector('.psf__clear') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(events.length).toBe(1);
    // local echo: sort back to its default, status back to '' → at rest again
    const echoed = (page.rootInstance as PopSearchFilter).groups;
    expect(echoed.find((g) => g.key === 'sort')!.value).toBe('dueDate');
    expect(echoed.find((g) => g.key === 'status')!.value).toBe('');
    expect(page.root.querySelector('.psf__dot')).toBeNull();
    expect(page.root.querySelector('.psf__clear')).toBeNull();
  });

  it('closes the popover on backdrop click', async () => {
    const page = await newSpecPage({ components: [PopSearchFilter], html: mk() });
    (page.root.querySelector('.psf__funnel') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(page.root.querySelector('.psf__menu')).toBeTruthy();
    (page.root.querySelector('.psf__backdrop') as HTMLElement).click();
    await page.waitForChanges();
    expect(page.root.querySelector('.psf__menu')).toBeNull();
  });
});
