import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/Backlinks',
  parameters: {
    docs: {
      description: {
        component:
          'pop-backlinks — the "Linked references" / what-links-here list for the Notes app ("digital brain"). Rendered inside the properties rail (pop-note-properties backlinks slot). The host computes backlinks via the NotesAdapter (Dexie `where(links).equals(id)` offline-primary, mirrored by Firestore `array-contains`) and passes `items`. Each item shows the source note title + optional snippet; clicking emits `open(id)`. States: with-backlinks, empty, loading.',
      },
    },
  },
};

export default meta;

const items = (over: any[] = []) =>
  JSON.stringify(
    over.length
      ? over
      : [
          { id: 'a', title: 'Project Roadmap', snippet: 'Q3 work tracked against the [[Launch Plan]] and weekly reviews.' },
          { id: 'b', title: 'Weekly Review — Jun 14', snippet: 'Carried forward two items from [[Launch Plan]].' },
          { id: 'c', title: 'Ideas' },
        ],
  );

/**
 * Mounts pop-backlinks inside a rail-like frame. `items` is passed as a JSON
 * STRING attribute — pop-backlinks parses both an array property and a JSON
 * string, so this renders reliably in static Storybook builds (no inline
 * <script> needed). `loading` is a boolean attribute.
 */
function backlinks(opts: { data?: string; loading?: boolean } = {}) {
  const itemsAttr = opts.loading ? '' : ` items='${(opts.data ?? '[]').replace(/'/g, '&#39;')}'`;
  return `
    <div style="max-width: 300px; padding: 12px; border: 1px solid var(--line, #ddd); border-radius: 12px;">
      <div style="font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;opacity:.6;margin-bottom:8px;">Backlinks</div>
      <pop-backlinks${itemsAttr}${opts.loading ? ' loading="true"' : ''}></pop-backlinks>
    </div>
  `;
}

export const WithBacklinks: StoryObj = {
  name: 'Many (with snippets)',
  render: () => backlinks({ data: items() }),
};

export const Few: StoryObj = {
  name: 'Few (no snippets)',
  render: () =>
    backlinks({
      data: items([
        { id: 'x', title: 'Meeting notes' },
        { id: 'y', title: 'Untitled' },
      ]),
    }),
};

export const Empty: StoryObj = {
  name: 'Empty',
  render: () => backlinks({ data: '[]' }),
};

export const Loading: StoryObj = {
  name: 'Loading',
  render: () => backlinks({ loading: true }),
};
