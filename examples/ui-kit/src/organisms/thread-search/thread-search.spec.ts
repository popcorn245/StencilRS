import { newSpecPage } from '../../test-utils/spec-page';
import { PopThreadSearch, SearchResult } from './thread-search';
import type { ThreadItem } from '../thread-timeline/thread-timeline-types';

/** Mount the search organism and assign the OBJECT props, then re-render. */
async function mount(props: Partial<PopThreadSearch> = {}) {
  const page = await newSpecPage<PopThreadSearch>({
    components: [PopThreadSearch],
    html: `<pop-thread-search></pop-thread-search>`,
  });
  Object.assign(page.rootInstance, props);
  page.rootInstance.componentWillLoad();
  await page.waitForChanges();
  return page;
}

const item = (over: Partial<ThreadItem>): ThreadItem => ({
  id: 'x',
  threadId: 't',
  kind: 'message',
  authorUid: 'u-kat',
  authorKind: 'human',
  createdAt: 1,
  ...over,
});

const results: SearchResult[] = [
  {
    item: item({ id: 'i1', threadId: 'd-0731' }),
    thread: { id: 'd-0731', title: 'Today', localDate: '2026-07-31' },
    snippet: 'Got the basil',
  },
  {
    item: item({ id: 'i2', threadId: 'd-0731', kind: 'card', cardType: 'list', sourcePanel: 'grocery' }),
    thread: { id: 'd-0731', title: 'Today', localDate: '2026-07-31' },
    snippet: 'Grocery run',
  },
  {
    item: item({ id: 'i3', threadId: 't-kitchen' }),
    thread: { id: 't-kitchen', title: 'Kitchen remodel', localDate: '2026-07-28' },
    snippet: 'Backsplash tile',
  },
];

const facets = { cardType: { list: 4, task: 2 }, sourcePanel: { grocery: 4, tasks: 2 } };

describe('pop-thread-search', () => {
  it('groups results by thread and shows each thread date', async () => {
    const page = await mount({ results, facets, query: 'basil' });
    const groups = Array.from(page.root.querySelectorAll('.tsr__group'));
    expect(groups).toHaveLength(2);
    expect(groups[0].textContent).toContain('Today');
    expect(groups[0].textContent).toContain('2026-07-31');
    expect(groups[0].querySelectorAll('.tsr__hit')).toHaveLength(2);
    expect(groups[1].textContent).toContain('Kitchen remodel');
  });

  it('opening a hit deep-links to the thread AND the item', async () => {
    const page = await mount({ results, facets });
    const seen: any[] = [];
    page.root.addEventListener('popResultOpen', (e) => seen.push((e as CustomEvent).detail));
    (page.root.querySelectorAll('.tsr__hit')[2] as HTMLButtonElement).click();
    expect(seen).toEqual([{ threadId: 't-kitchen', itemId: 'i3' }]);
  });

  it('renders facet chips with their counts', async () => {
    const page = await mount({ results, facets });
    const chips = Array.from(page.root.querySelectorAll('.tsr__chip')).map((c) => c.textContent);
    expect(chips).toEqual(['list4', 'task2', 'grocery4', 'tasks2']);
  });

  it('uses the available vocabulary and labels when the host supplies one', async () => {
    const page = await mount({
      results,
      facets,
      available: {
        cardType: [
          { type: 'list', label: 'List' },
          { type: 'showtimes', label: 'Showtimes' },
        ],
        sourcePanel: ['grocery'],
      },
    });
    const chips = Array.from(page.root.querySelectorAll('.tsr__chip')).map((c) => c.textContent);
    // Zero-count values still render, with a 0.
    expect(chips).toEqual(['List4', 'Showtimes0', 'grocery4']);
  });

  it('active facets are marked pressed', async () => {
    const page = await mount({
      results,
      facets,
      activeFacets: { cardType: ['list'], sourcePanel: [] },
    });
    const list = page.root.querySelector('.tsr__chip') as HTMLButtonElement;
    expect(list.className).toContain('tsr__chip--on');
    expect(list.getAttribute('aria-pressed')).toBe('true');
  });

  it('toggling a facet emits popSearch with the NEW facet set and the query', async () => {
    const page = await mount({
      results,
      facets,
      query: 'basil',
      activeFacets: { cardType: [], sourcePanel: ['grocery'] },
    });
    const seen: any[] = [];
    page.root.addEventListener('popSearch', (e) => seen.push((e as CustomEvent).detail));
    (page.root.querySelector('.tsr__chip') as HTMLButtonElement).click();
    expect(seen).toEqual([{ q: 'basil', facets: { cardType: ['list'], sourcePanel: ['grocery'] } }]);
  });

  it('toggling an ACTIVE facet off removes it', async () => {
    const page = await mount({
      results,
      facets,
      query: 'basil',
      activeFacets: { cardType: ['list'], sourcePanel: [] },
    });
    const seen: any[] = [];
    page.root.addEventListener('popSearch', (e) => seen.push((e as CustomEvent).detail));
    (page.root.querySelector('.tsr__chip') as HTMLButtonElement).click();
    expect(seen[0].facets.cardType).toEqual([]);
  });

  it('typing then searching emits the trimmed draft', async () => {
    const page = await mount({ results, facets, query: '' });
    const seen: any[] = [];
    page.root.addEventListener('popSearch', (e) => seen.push((e as CustomEvent).detail));
    const input = page.root.querySelector('.tsr__input') as HTMLInputElement;
    input.value = '  tomatoes  ';
    input.dispatchEvent(new Event('input'));
    (page.root.querySelector('.tsr__go') as HTMLButtonElement).click();
    expect(seen).toEqual([{ q: 'tomatoes', facets: { cardType: [], sourcePanel: [] } }]);
  });

  it('empty state', async () => {
    const page = await mount({ results: [], facets, query: 'nope' });
    expect(page.root.textContent).toContain('No matches.');
    expect(page.root.querySelector('.tsr__results')).toBeNull();
  });

  it('loading state', async () => {
    const page = await mount({ results: [], facets, loading: true });
    expect(page.root.textContent).toContain('Searching…');
    expect(page.root.textContent).not.toContain('No matches.');
  });
});
