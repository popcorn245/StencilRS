import { newSpecPage } from '../../test-utils/spec-page';
import { PopListFilterSort } from './list-filter-sort';

const FILTERS = JSON.stringify([
  {
    key: 'show',
    label: 'Show',
    kind: 'tabs',
    value: '',
    options: [
      { value: '', label: 'All' },
      { value: 'low', label: 'Low stock' },
    ],
  },
]);

describe('pop-list-filter-sort', () => {
  it('renders the search-filter (flex:1), the view-switcher, and the actions slot content', async () => {
    const page = await newSpecPage({
      components: [PopListFilterSort],
      html: `<pop-list-filter-sort><button slot="actions" id="extra">+</button></pop-list-filter-sort>`,
    });
    expect(page.root.querySelector('pop-search-filter.plfs__search')).toBeTruthy();
    expect(page.root.querySelector('pop-view-switcher.plfs__views')).toBeTruthy();
    // slotted extra survives (scoped-mode light-DOM projection)
    expect(page.root.querySelector('#extra')).toBeTruthy();
  });

  it('passes value/placeholder/filters/debounce/showClear through to pop-search-filter', async () => {
    const page = await newSpecPage({
      components: [PopListFilterSort],
      html: `<pop-list-filter-sort value="milk" placeholder="Search stuff…" filters='${FILTERS}' debounce="0" show-clear></pop-list-filter-sort>`,
    });
    const sf = page.root.querySelector('pop-search-filter') as any;
    expect(sf.value).toBe('milk');
    expect(sf.placeholder).toBe('Search stuff…');
    expect(sf.filters).toBe(FILTERS);
    expect(sf.debounce).toBe(0);
    // NB: the vitest harness drops `false`-valued vnode attrs, so we assert
    // the truthy pass-through (real Stencil forwards both).
    expect(sf.showClear).toBe(true);
  });

  it('passes views/view through to pop-view-switcher', async () => {
    const page = await newSpecPage({
      components: [PopListFilterSort],
      html: `<pop-list-filter-sort views='["list","card","table"]' view="card"></pop-list-filter-sort>`,
    });
    const vs = page.root.querySelector('pop-view-switcher') as any;
    expect(vs.views).toBe('["list","card","table"]');
    expect(vs.value).toBe('card');
  });

  it('omits the view switcher entirely when views is an empty array', async () => {
    const page = await newSpecPage({
      components: [PopListFilterSort],
      html: `<pop-list-filter-sort views='[]'></pop-list-filter-sort>`,
    });
    expect(page.root.querySelector('pop-view-switcher')).toBeNull();
    expect(page.root.querySelector('pop-search-filter')).toBeTruthy();
  });

  it('omits the view switcher on malformed views JSON', async () => {
    const page = await newSpecPage({
      components: [PopListFilterSort],
      html: `<pop-list-filter-sort views='not json'></pop-list-filter-sort>`,
    });
    expect(page.root.querySelector('pop-view-switcher')).toBeNull();
  });

  it('passes the input slot through to pop-search-filter (always-rendered slot)', async () => {
    const page = await newSpecPage({
      components: [PopListFilterSort],
      html: `<pop-list-filter-sort><input slot="input" id="mi" /></pop-list-filter-sort>`,
    });
    // the pass-through slot sits INSIDE the pop-search-filter element and is
    // rendered unconditionally (scoped-slot rule)
    // (scoped components emulate <slot>: the widget ends up inside pop-search-filter)
    expect(page.root.querySelector('#mi')?.closest('pop-search-filter')).toBeTruthy();
    // slotted widget survives (scoped-mode light-DOM projection)
    expect(page.root.querySelector('#mi')).toBeTruthy();
  });

  it('re-emits the child events from its own host and stops the originals', async () => {
    const page = await newSpecPage({ components: [PopListFilterSort], html: `<pop-list-filter-sort></pop-list-filter-sort>` });
    const instance = page.rootInstance as PopListFilterSort;

    const got: Record<string, unknown[]> = { searchChange: [], filterChange: [], clearFilters: [], viewChange: [] };
    for (const name of Object.keys(got)) {
      page.root.addEventListener(name, (e: any) => got[name].push(e.detail));
    }

    // Drive the relay handlers directly with fake child events (the spec
    // harness renders child components as inert elements, so we exercise the
    // re-emit plumbing itself). Each original must be stopPropagation'd.
    const fake = <T,>(detail: T) => {
      let stopped = false;
      return {
        ev: { detail, stopPropagation: () => (stopped = true) } as unknown as CustomEvent<T>,
        wasStopped: () => stopped,
      };
    };

    const search = fake('milk');
    (instance as any).relay(instance.searchChange)(search.ev);
    expect(search.wasStopped()).toBe(true);

    const filter = fake({ key: 'show', value: 'low' });
    (instance as any).relay(instance.filterChange)(filter.ev);
    expect(filter.wasStopped()).toBe(true);

    const clear = fake(undefined);
    (instance as any).relay(instance.clearFilters)(clear.ev);
    expect(clear.wasStopped()).toBe(true);

    const view = fake('card');
    (instance as any).relay(instance.viewChange)(view.ev);
    expect(view.wasStopped()).toBe(true);

    expect(got.searchChange).toEqual(['milk']);
    expect(got.filterChange).toEqual([{ key: 'show', value: 'low' }]);
    expect(got.clearFilters.length).toBe(1);
    expect(got.viewChange).toEqual(['card']);
  });
});
