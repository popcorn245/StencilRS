import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/NoteList',
  parameters: {
    docs: {
      description: {
        component:
          'Renders a collection of pop-note-card. Supports list and grid views, a sectioned Pinned + Recent default layout (Home), a flat list (Trash / facets), an empty state, and a loading skeleton. `notes` and `snippets` are set as DOM properties.',
      },
    },
  },
};

export default meta;

const now = Date.now();
const sample = [
  { id: 'a', title: 'Project brief', tags: ['work', 'q3'], pinned: true, visibility: 'family', updatedAt: now - 2 * 3600e3 },
  { id: 'b', title: 'Roadmap 2026', tags: ['work', 'roadmap'], pinned: true, visibility: 'family', updatedAt: now - 26 * 3600e3 },
  { id: 'c', title: 'Grocery ideas', tags: ['home'], pinned: false, visibility: 'private', source: 'clip', updatedAt: now - 5 * 60e3 },
  { id: 'd', title: 'Reading list', tags: ['books', 'later'], pinned: false, visibility: 'private', updatedAt: now - 24 * 3600e3 },
  { id: 'e', title: 'Standup notes', tags: ['work'], pinned: false, visibility: 'couple', taskLinks: ['t1'], updatedAt: now - 3 * 24 * 3600e3 },
];

const snippets: Record<string, string> = {
  a: 'The goal of Q3 is to ship the Brain MVP for the first family.',
  b: 'Brain milestone, then the graph view, then RAG.',
  c: 'milk, eggs, bread, the good coffee',
  d: 'Thinking Fast and Slow, and that RAG paper.',
  e: 'Blocked on the embedding backfill; will revisit Thursday.',
};

function list(opts: { notes: unknown; view?: string; sectioned?: boolean; loading?: boolean; height?: string }) {
  const id = 'nl-' + Math.random().toString(36).slice(2, 8);
  const attrs = [
    `view="${opts.view ?? 'list'}"`,
    opts.sectioned === false ? 'sectioned="false"' : '',
    opts.loading ? 'loading="true"' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `
    <div style="max-width: 640px; ${opts.height ? `height:${opts.height};` : ''}">
      <pop-note-list id="${id}" ${attrs}></pop-note-list>
    </div>
    <script>
      (() => {
        const el = document.getElementById('${id}');
        el.notes = ${JSON.stringify(opts.notes)};
        el.snippets = ${JSON.stringify(snippets)};
      })();
    </script>
  `;
}

export const PinnedAndRecent: StoryObj = {
  name: 'Pinned + Recent (list)',
  render: () => list({ notes: sample }),
};

export const Grid: StoryObj = {
  name: 'Pinned + Recent (grid)',
  render: () => list({ notes: sample, view: 'grid' }),
};

export const FlatList: StoryObj = {
  name: 'Flat (un-sectioned)',
  render: () => list({ notes: sample.map((n) => ({ ...n, pinned: false })), sectioned: false }),
};

export const Empty: StoryObj = {
  render: () => list({ notes: [], height: '320px' }),
};

export const Loading: StoryObj = {
  render: () => list({ notes: [], loading: true }),
};

export const LoadingGrid: StoryObj = {
  name: 'Loading (grid)',
  render: () => list({ notes: [], loading: true, view: 'grid' }),
};
