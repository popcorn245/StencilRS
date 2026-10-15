import type { Meta, StoryObj } from '@storybook/web-components-vite';

const DEFAULT_COLUMNS = JSON.stringify([
  { id: 'backlog', label: 'Backlog', color: 'var(--pico-secondary)' },
  { id: 'generating', label: 'Generating', color: 'var(--color-yellow)' },
  { id: 'review', label: 'Review', color: 'var(--color-blue)' },
  { id: 'merged', label: 'Merged', color: 'var(--color-green)' },
  { id: 'closed', label: 'Closed', color: 'var(--color-red)' },
]);

const SAMPLE_CARDS = JSON.stringify([
  {
    id: 'task-1',
    title: 'Add dark mode toggle to settings page',
    description: 'Users should be able to switch between light and dark themes from their profile settings.',
    columnId: 'backlog',
    repo: 'popcorn245/bucket',
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'task-2',
    title: 'Fix pagination bug in research index',
    description: 'Page 2 returns duplicate results from the first page.',
    columnId: 'backlog',
    repo: 'popcorn245/bucket',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'task-3',
    title: 'Refactor Ollama RAG sync service',
    description: 'Extract collection sync logic into a dedicated class for easier testing.',
    columnId: 'generating',
    repo: 'popcorn245/bucket',
    badge: 'generating',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'task-4',
    title: 'Add kanban board to the app',
    description: 'Build pop-kanban StencilJS component and wire it up in the Astro board page.',
    columnId: 'review',
    repo: 'popcorn245/bucket',
    prNumber: 42,
    prUrl: '#',
    badge: 'review',
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'task-5',
    title: 'Update Caddy config for new subdomains',
    columnId: 'merged',
    repo: 'popcorn245/bucket',
    prNumber: 38,
    prUrl: '#',
    badge: 'merged',
    createdAt: Date.now() - 86400000 * 5,
  },
]);

const FAMILY_COLUMNS = JSON.stringify([
  { id: 'todo', label: 'To Do', color: 'var(--pico-secondary)' },
  { id: 'in-progress', label: 'In Progress', color: 'var(--color-yellow)' },
  { id: 'done', label: 'Done', color: 'var(--color-green)' },
]);

const FAMILY_CARDS = JSON.stringify([
  {
    id: 'f1',
    title: 'Book dentist appointments',
    description: 'All four family members need checkups before June.',
    columnId: 'todo',
    assignees: ['Mom', 'Dad'],
    dueDate: Date.now() + 86400000 * 5,
    xp: 20,
    questTitle: 'Family Health',
  },
  {
    id: 'f2',
    title: 'Research summer camps',
    columnId: 'todo',
    assignees: ['Mom'],
    dueDate: Date.now() - 86400000,
    xp: 30,
    questTitle: 'Summer Planning',
  },
  {
    id: 'f3',
    title: 'Clean the garage',
    description: 'Sort donate / keep / trash piles.',
    columnId: 'in-progress',
    assignees: ['Dad', 'Kid'],
    dueDate: Date.now() + 86400000 * 2,
    xp: 50,
  },
  {
    id: 'f4',
    title: 'Renew car registration',
    columnId: 'done',
    assignees: ['Dad'],
    xp: 15,
    questTitle: 'Admin Tasks',
  },
]);

const meta: Meta = {
  title: 'Components/Organisms/Kanban',
  parameters: {
    docs: {
      description: {
        component:
          'A drag-and-drop kanban board. Works for both PR/code tracking and family task management. Columns, cards, and terminal columns are fully data-driven via JSON props. Emits `popCardMoved`, `popCardClicked`, and `popCreateTask` events.',
      },
    },
    layout: 'fullscreen',
  },
  argTypes: {
    loading: { control: 'boolean' },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Full Board',
  render: () => `
    <div style="height: 100vh; background: var(--pico-background-color);">
      <pop-kanban
        columns='${DEFAULT_COLUMNS}'
        cards='${SAMPLE_CARDS}'
      ></pop-kanban>
    </div>
  `,
};

export const Loading: StoryObj = {
  name: 'Loading State',
  render: () => `
    <div style="height: 100vh; background: var(--pico-background-color);">
      <pop-kanban
        columns='${DEFAULT_COLUMNS}'
        cards='[]'
        loading="true"
      ></pop-kanban>
    </div>
  `,
};

export const EmptyColumns: StoryObj = {
  name: 'Empty Columns',
  render: () => `
    <div style="height: 100vh; background: var(--pico-background-color);">
      <pop-kanban
        columns='${DEFAULT_COLUMNS}'
        cards='[]'
      ></pop-kanban>
    </div>
  `,
};

export const SingleColumn: StoryObj = {
  name: 'Single Column',
  render: () => `
    <div style="padding: var(--size-4); background: var(--pico-background-color);">
      <pop-kanban
        columns='${JSON.stringify([{ id: 'backlog', label: 'Backlog', color: 'var(--pico-secondary)' }])}'
        cards='${JSON.stringify([
          { id: 'c1', title: 'First task', description: 'Some description here', columnId: 'backlog', repo: 'popcorn245/bucket', createdAt: Date.now() },
          { id: 'c2', title: 'Second task', columnId: 'backlog', repo: 'popcorn245/bucket', createdAt: Date.now() },
        ])}'
      ></pop-kanban>
    </div>
  `,
};

export const FamilyTaskBoard: StoryObj = {
  name: 'Family Task Board',
  render: () => `
    <div style="height: 100vh; background: var(--pico-background-color);">
      <pop-kanban
        columns='${FAMILY_COLUMNS}'
        cards='${FAMILY_CARDS}'
        terminal-column-ids='["done"]'
      ></pop-kanban>
    </div>
  `,
};

export const FilteredByMember: StoryObj = {
  name: 'Filtered by Member (Mom)',
  render: () => `
    <div style="height: 100vh; background: var(--pico-background-color);">
      <pop-kanban
        columns='${FAMILY_COLUMNS}'
        cards='${FAMILY_CARDS}'
        terminal-column-ids='["done"]'
        filter-assignee="Mom"
      ></pop-kanban>
    </div>
  `,
};
