import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { ActiveFacets, AvailableFacets, SearchFacets, SearchResult } from './thread-search';
import type { ThreadItem } from '../thread-timeline/thread-timeline-types';

const meta: Meta = {
  title: 'Organisms/ThreadSearch',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Search across threads with card-type and source-panel facets. The component ' +
          'never queries anything: it owns only the text in the box and emits `popSearch` ' +
          'on submit and on every facet toggle. Results are grouped by thread with their ' +
          'date and deep-link to a single item.',
      },
    },
  },
};
export default meta;

const item = (over: Partial<ThreadItem>): ThreadItem => ({
  id: 'x',
  threadId: 't',
  kind: 'message',
  authorUid: 'u-kat',
  authorKind: 'human',
  createdAt: Date.now(),
  ...over,
});

const results: SearchResult[] = [
  {
    item: item({ id: 'i1', threadId: 'd-0731', text: 'basil' }),
    thread: { id: 'd-0731', title: 'Today', localDate: '2026-07-31' },
    snippet: 'Got the basil, skipping the tomatoes.',
  },
  {
    item: item({ id: 'i2', threadId: 'd-0731', kind: 'card', cardType: 'list', sourcePanel: 'grocery' }),
    thread: { id: 'd-0731', title: 'Today', localDate: '2026-07-31' },
    snippet: 'Grocery run — mozzarella, basil, tomatoes',
  },
  {
    item: item({ id: 'i3', threadId: 't-kitchen', kind: 'card', cardType: 'task', sourcePanel: 'tasks' }),
    thread: { id: 't-kitchen', title: 'Kitchen remodel', localDate: '2026-07-28' },
    snippet: 'Order the basil-green backsplash tile',
  },
];

const facets: SearchFacets = {
  cardType: { list: 4, task: 2, timer: 1, showtimes: 0 },
  sourcePanel: { grocery: 4, tasks: 2, kitchen: 1 },
};

const available: AvailableFacets = {
  cardType: [
    { type: 'list', label: 'List' },
    { type: 'task', label: 'Task' },
    { type: 'timer', label: 'Timer' },
    { type: 'showtimes', label: 'Showtimes' },
  ],
  sourcePanel: ['grocery', 'tasks', 'kitchen'],
};

interface SearchOpts {
  results?: SearchResult[];
  activeFacets?: ActiveFacets;
  query?: string;
  loading?: boolean;
}

function search(opts: SearchOpts = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width: 560px;';
  const el = document.createElement('pop-thread-search') as unknown as HTMLElement & Record<string, unknown>;
  el.results = opts.results ?? results;
  el.facets = facets;
  el.activeFacets = opts.activeFacets ?? { cardType: [], sourcePanel: [] };
  el.available = available;
  el.query = opts.query ?? 'basil';
  el.loading = opts.loading ?? false;
  wrap.appendChild(el);
  return wrap;
}

export const WithFacets: StoryObj = {
  name: 'Results with facets',
  render: () => search(),
};

export const FacetFiltered: StoryObj = {
  name: 'Facet-filtered',
  render: () =>
    search({
      activeFacets: { cardType: ['list'], sourcePanel: ['grocery'] },
      results: [results[1]],
    }),
};

export const Empty: StoryObj = {
  name: 'Empty',
  render: () => search({ results: [], query: 'nothing here' }),
};

export const Loading: StoryObj = {
  name: 'Loading',
  render: () => search({ loading: true, results: [] }),
};
