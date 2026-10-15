import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

/**
 * pop-note-properties — the Note Editor right rail.
 * States: full (tags + tasks + backlinks), no-tags, each visibility, pinned,
 * syncing / pending / error, and an empty backlinks slot (Phase 3 fills it).
 */
const meta: Meta = {
  title: 'Components/Organisms/NoteProperties',
  component: 'pop-note-properties',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          "The Note Editor's right metadata rail: title, tags-as-properties, visibility, pinned, timestamps, linked tasks, links-out, sync status, and a collapsible Backlinks section whose body is an empty `slot[name=backlinks]` (Phase 3 drops `pop-backlinks` in).",
      },
    },
  },
};

export default meta;

const suggestions = [
  { id: 'work', label: 'work' },
  { id: 'q3', label: 'q3' },
  { id: 'roadmap', label: 'roadmap' },
  { id: 'ideas', label: 'ideas' },
];

const linkedTasks = [
  { id: 't1', title: 'Ship MVP' },
  { id: 't2', title: 'Draft launch post' },
];

const frame = (inner: any) => html`
  <div style="width: 320px; height: 640px; display: flex;">${inner}</div>
`;

export const Full: StoryObj = {
  name: 'Full (tags, tasks, backlinks)',
  render: () =>
    frame(html`
      <pop-note-properties
        title="Project brief"
        .tags=${['work', 'q3']}
        .suggestions=${suggestions}
        visibility="family"
        .pinned=${false}
        created="Jun 2"
        updated="2h ago"
        .linkedTasks=${linkedTasks}
        .linksOut=${3}
        syncState="synced"
        .backlinksCount=${4}
        ai-hint="Indexed"
      >
        <div slot="backlinks" style="display:flex;flex-direction:column;gap:.25rem;">
          <button type="button" style="text-align:left;background:var(--surface-sunken);border:1px solid var(--line);border-radius:12px;padding:.5rem;min-height:44px;color:var(--ink);">▸ Roadmap 2026</button>
          <button type="button" style="text-align:left;background:var(--surface-sunken);border:1px solid var(--line);border-radius:12px;padding:.5rem;min-height:44px;color:var(--ink);">▸ Weekly review</button>
        </div>
      </pop-note-properties>
    `),
};

export const NoTags: StoryObj = {
  name: 'No tags / no backlinks',
  render: () =>
    frame(html`
      <pop-note-properties
        title="Untitled"
        .tags=${[]}
        .suggestions=${suggestions}
        visibility="private"
        .pinned=${false}
        created="Just now"
        updated="Just now"
        .linkedTasks=${[]}
        .linksOut=${0}
        syncState="synced"
        .backlinksCount=${0}
      ></pop-note-properties>
    `),
};

export const VisibilityPrivate: StoryObj = {
  name: 'Visibility · Private',
  render: () =>
    frame(html`<pop-note-properties title="Secret" .tags=${['journal']} visibility="private" .backlinksCount=${0}></pop-note-properties>`),
};

export const VisibilityFamily: StoryObj = {
  name: 'Visibility · Family',
  render: () =>
    frame(html`<pop-note-properties title="Trip plan" .tags=${['travel']} visibility="family" .backlinksCount=${1}></pop-note-properties>`),
};

export const VisibilityCouple: StoryObj = {
  name: 'Visibility · Couple',
  render: () =>
    frame(html`<pop-note-properties title="Date ideas" .tags=${['us']} visibility="couple" .backlinksCount=${0}></pop-note-properties>`),
};

export const VisibilityPublic: StoryObj = {
  name: 'Visibility · Public',
  render: () =>
    frame(html`<pop-note-properties title="Blog draft" .tags=${['writing']} visibility="public" .backlinksCount=${2}></pop-note-properties>`),
};

export const Pinned: StoryObj = {
  name: 'Pinned',
  render: () =>
    frame(html`
      <pop-note-properties
        title="Always on top"
        .tags=${['important']}
        visibility="private"
        .pinned=${true}
        created="May 1"
        updated="1d ago"
        .linksOut=${1}
        syncState="synced"
        .backlinksCount=${0}
      ></pop-note-properties>
    `),
};

export const Saving: StoryObj = {
  name: 'Sync · Saving',
  render: () =>
    frame(html`<pop-note-properties title="Editing…" .tags=${['draft']} syncState="saving" ai-hint="Indexing…" .backlinksCount=${0}></pop-note-properties>`),
};

export const OfflinePending: StoryObj = {
  name: 'Sync · Offline pending',
  render: () =>
    frame(html`<pop-note-properties title="Offline note" .tags=${['draft']} syncState="pending" .backlinksCount=${0}></pop-note-properties>`),
};

export const SyncError: StoryObj = {
  name: 'Sync · Error',
  render: () =>
    frame(html`<pop-note-properties title="Won't save" .tags=${['draft']} syncState="error" .backlinksCount=${0}></pop-note-properties>`),
};
