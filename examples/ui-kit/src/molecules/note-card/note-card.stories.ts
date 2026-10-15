import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/NoteCard',
  parameters: {
    docs: {
      description: {
        component:
          'A note preview card for the Notes app ("digital brain"). Shows title, snippet, tag chips, updated time, a pin toggle, and a visibility badge. The `note` is set as a DOM property; `layout` switches between a list row and a gallery grid tile. Emits `noteSelect` and `notePin`.',
      },
    },
  },
};

export default meta;

const now = Date.now();
const note = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    id: 'n1',
    title: 'Project brief',
    tags: ['work', 'q3'],
    pinned: false,
    visibility: 'family',
    source: 'notes-app',
    taskLinks: [],
    updatedAt: now - 2 * 3600 * 1000,
    ...over,
  });

/** Render helper: mounts the card and assigns the note object + snippet as
 *  properties (web components can't take objects via attributes). */
function card(opts: { data: string; snippet?: string; layout?: string; selected?: boolean; wrap?: string; actions?: string }) {
  const id = 'nc-' + Math.random().toString(36).slice(2, 8);
  const w = opts.wrap ?? 'max-width: 420px;';
  const actionsAttr = opts.actions ? ` actions="${opts.actions}"` : '';
  return `
    <div style="${w}">
      <pop-note-card id="${id}" layout="${opts.layout ?? 'list'}"${opts.selected ? ' selected' : ''}${actionsAttr}></pop-note-card>
    </div>
    <script>
      (() => {
        const el = document.getElementById('${id}');
        el.note = ${opts.data};
        ${opts.snippet ? `el.snippet = ${JSON.stringify(opts.snippet)};` : ''}
      })();
    </script>
  `;
}

export const List: StoryObj = {
  name: 'List row',
  render: () =>
    card({ data: note(), snippet: 'The goal of Q3 is to ship the Brain MVP and get the first family using it.' }),
};

export const Grid: StoryObj = {
  name: 'Grid tile',
  render: () =>
    card({
      data: note(),
      snippet: 'The goal of Q3 is to ship the Brain MVP and get the first family using it for real captures.',
      layout: 'grid',
      wrap: 'max-width: 260px; height: 200px;',
    }),
};

export const Pinned: StoryObj = {
  render: () => card({ data: note({ pinned: true }), snippet: 'Pinned to the top of the Pinned split.' }),
};

export const Selected: StoryObj = {
  render: () => card({ data: note(), snippet: 'This card is the active note in the split-pane.', selected: true }),
};

export const NoTags: StoryObj = {
  name: 'No tags (private)',
  render: () =>
    card({ data: note({ tags: [], visibility: 'private', title: 'Quick thought' }), snippet: 'milk, eggs, bread' }),
};

export const ManyTags: StoryObj = {
  name: 'Many tags + clip + tasks',
  render: () =>
    card({
      data: note({
        tags: ['work', 'q3', 'roadmap', 'launch', 'ideas'],
        source: 'clip',
        taskLinks: ['t1', 't2'],
        visibility: 'public',
      }),
      snippet: 'A clipped article with several tags and two linked tasks.',
    }),
};

export const LongTitle: StoryObj = {
  name: 'Long title (clamped)',
  render: () =>
    card({
      data: note({
        title:
          'A very long note title that should wrap to two lines and then be clamped with an ellipsis so the card stays tidy',
      }),
      snippet: 'Body text here.',
    }),
};

export const Untitled: StoryObj = {
  render: () => card({ data: note({ title: '', tags: [] }), snippet: 'Untitled note with body only.' }),
};

// ── Inbox triage variant (actions="inbox") ──────────────────────────
export const InboxTriageBot: StoryObj = {
  name: 'Inbox triage — bot',
  render: () =>
    card({
      data: note({ id: 'i1', title: 'idea: a brain for notes', tags: [], source: 'bot', visibility: 'private' }),
      actions: 'inbox',
    }),
};

export const InboxTriageVoice: StoryObj = {
  name: 'Inbox triage — voice',
  render: () =>
    card({
      data: note({ id: 'i2', title: 'remember the milk', tags: [], source: 'voice', visibility: 'private' }),
      actions: 'inbox',
    }),
};

export const InboxTriageClip: StoryObj = {
  name: 'Inbox triage — clip',
  render: () =>
    card({
      data: note({ id: 'i3', title: 'great article on RAG', tags: [], source: 'clip', visibility: 'private' }),
      snippet: 'Retrieval-augmented generation grounds answers in your own notes…',
      actions: 'inbox',
    }),
};

// ── Trash variant (actions="trash") ─────────────────────────────────
export const Trash: StoryObj = {
  name: 'Trash row',
  render: () =>
    card({
      data: note({ id: 'd1', title: 'Old draft', tags: ['scratch'], visibility: 'private' }),
      snippet: 'A soft-deleted note awaiting restore or permanent delete.',
      actions: 'trash',
    }),
};

export const TrashTaskLinked: StoryObj = {
  name: 'Trash row — was task-linked',
  render: () =>
    card({
      data: note({ id: 'd2', title: 'Launch plan', tags: ['launch'], taskLinks: ['t1'], visibility: 'family' }),
      snippet: 'This note backed a live task; the task was kept intact when it was trashed.',
      actions: 'trash',
    }),
};
