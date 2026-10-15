import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/CommandPalette',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'pop-command-palette — the keyboard-first Cmd-K front door for the Notes app ("digital brain"). A global overlay pairing a search input with a sectioned, flat-navigable result list (JUMP TO fuzzy titles · FULL-TEXT Dexie bodies · COMMANDS). The host (notes-app) owns the data: it runs the offline `notesSearch` engine, debounces, and feeds `sections`; the palette owns the interaction — focus trap, ↑/↓ across sections, Enter to activate, Esc to close, Tab to ask (Phase-6 affordance), ARIA combobox+listbox, reduced-motion, and a full-screen sheet on mobile. `sections` is passed as a JSON string here so it renders in static Storybook builds; in the app it is set as a property. Emits `popQueryChange`, `popSelect`, `popAsk`, `popClose`.',
      },
    },
  },
};

export default meta;

const COMMANDS = [
  { id: 'cmd:new', label: 'New note', icon: '✎', kind: 'command', detail: 'Create a fresh note' },
  { id: 'cmd:home', label: 'Go to Home', icon: '⌂', kind: 'command' },
  { id: 'cmd:graph', label: 'Open Graph', icon: '◍', kind: 'command' },
  { id: 'cmd:theme', label: 'Toggle theme', icon: '🌙', kind: 'command' },
  { id: 'cmd:trash', label: 'Open Trash', icon: '🗑', kind: 'command' },
];

/** Mounts the palette forced-open with the supplied sections (JSON string). */
function palette(opts: {
  sections: unknown[];
  query?: string;
  loading?: boolean;
  placeholder?: string;
}) {
  const json = JSON.stringify(opts.sections).replace(/'/g, '&#39;');
  return `
    <div style="height: 520px; position: relative; background: var(--surface-canvas, #eef3fb);">
      <pop-command-palette
        open="true"
        ${opts.query != null ? `query="${opts.query}"` : ''}
        ${opts.loading ? 'loading="true"' : ''}
        ${opts.placeholder ? `placeholder="${opts.placeholder}"` : ''}
        sections='${json}'
      ></pop-command-palette>
    </div>
  `;
}

/** Empty query → recents + commands (the default opened state). */
export const EmptyRecentsAndCommands: StoryObj = {
  name: 'Empty — recents + commands',
  render: () =>
    palette({
      sections: [
        {
          heading: 'RECENT',
          items: [
            { id: 'n1', label: 'Project brief', icon: '📄', kind: 'note', detail: 'Updated 2h ago' },
            { id: 'n2', label: 'Roadmap 2026', icon: '📄', kind: 'note', detail: 'Updated yesterday' },
            { id: 'n3', label: 'Weekly review — Jun 14', icon: '📄', kind: 'note' },
          ],
        },
        { heading: 'COMMANDS', items: COMMANDS },
      ],
    }),
};

/** A query that fuzzy-matches titles and full-text bodies + ask affordance. */
export const WithQueryResults: StoryObj = {
  name: 'Query — jump-to + full-text + ask',
  render: () =>
    palette({
      query: 'brief',
      sections: [
        {
          heading: 'JUMP TO',
          items: [
            { id: 'n1', label: 'Project brief', icon: '📄', kind: 'note' },
            { id: 'n9', label: 'Briefing notes', icon: '📄', kind: 'note' },
          ],
        },
        {
          heading: 'FULL-TEXT',
          items: [
            {
              id: 'n4',
              label: 'Roadmap 2026',
              icon: '¶',
              kind: 'note',
              detail: '…ship the Brain MVP this quarter per the brief…',
            },
          ],
        },
        {
          heading: 'ASK YOUR BRAIN',
          askHint: true,
          items: [{ id: 'ask', label: '"what is the project brief about?"', icon: '▸', kind: 'ask' }],
        },
        { heading: 'COMMANDS', items: COMMANDS.slice(0, 3) },
      ],
    }),
};

/** Actions-heavy view (a ">"-style command query). */
export const ActionsOnly: StoryObj = {
  name: 'Commands / actions',
  render: () =>
    palette({
      query: '',
      placeholder: 'Type a command…',
      sections: [{ heading: 'COMMANDS', items: COMMANDS }],
    }),
};

/** Loading spinner while the host runs notesSearch. */
export const Loading: StoryObj = {
  name: 'Loading',
  render: () =>
    palette({
      query: 'launch',
      loading: true,
      sections: [{ heading: 'COMMANDS', items: COMMANDS.slice(0, 2) }],
    }),
};

/** A query with zero matches → empty state. */
export const NoResults: StoryObj = {
  name: 'No results',
  render: () => palette({ query: 'zzzxqyw', sections: [] }),
};
