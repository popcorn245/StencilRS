import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import type { PopSearch } from './pop-search';
import type { GroupedSearchResults } from './pop-search';

const MODELS = JSON.stringify([
  {
    group: 'Local',
    models: [
      { value: 'llama3.1:8b', label: 'Llama 3.1 8B', icon: '🦙' },
    ],
  },
  {
    group: 'Cloud',
    models: [
      { value: 'claude-sonnet-4-6', label: 'Claude Sonnet', icon: '✦', color: '#7B61FF' },
    ],
  },
]);

const ACTIONS = JSON.stringify([
  { id: 'create-task', label: 'Create Task', icon: '✅', shortcut: '⌘T', group: 'Create' },
  { id: 'new-event', label: 'New Event', icon: '📅', shortcut: '⌘E', group: 'Create' },
  { id: 'new-note', label: 'New Note', icon: '📝', shortcut: '⌘N', group: 'Create' },
  { id: 'go-settings', label: 'Settings', icon: '⚙️', group: 'Navigate' },
  { id: 'go-hub', label: 'Hub', icon: '🏠', group: 'Navigate' },
]);

const mockResults: GroupedSearchResults[] = [
  {
    section: 'Notes',
    results: [
      { id: '1', title: 'Meeting with Sarah', subtitle: 'work, planning · 2d ago' },
      { id: '2', title: 'Grocery List', subtitle: 'home · just now' },
    ],
  },
  {
    section: 'Tasks',
    results: [
      { id: '3', title: 'Fix universal search expand animation', subtitle: '○ · 1h ago' },
      { id: '4', title: 'Deploy home stack update', subtitle: '✓ · 3d ago' },
    ],
  },
  {
    section: 'Inventory',
    results: [
      { id: '5', title: 'Coffee Beans', subtitle: 'pantry · 1w ago' },
    ],
  },
];

const meta: Meta = {
  title: 'Components/Organisms/Search/pop-search',
  component: 'pop-search',
  tags: ['autodocs'],
  argTypes: {
    expanded: { control: 'boolean' },
    fill: { control: 'boolean' },
    loading: { control: 'boolean' },
    showMicButton: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<PopSearch>;


// ── State 1: Bar ───────────────────────────────────────

export const Bar: Story = {
  name: 'State 1 — Bar (no results)',
  args: { results: [] },
};

export const BarFill: Story = {
  name: 'State 1 — Bar inline/fill',
  args: { results: mockResults },
};

export const BarWithResults: Story = {
  name: 'State 1 — Bar with results',
  args: { results: mockResults },
};

export const BarLoading: Story = {
  name: 'State 1 — Bar loading',
  args: { loading: true, results: [] },
};

export const BarEmpty: Story = {
  name: 'State 1 — Bar no matches',
  args: { results: [] },
};

// ── Actions mode (> prefix) ────────────────────────────────────────────────

export const ActionsMode: Story = {
  name: 'State 1 — Actions mode (> prefix)',
  render: () => html`
    <div style="max-width: 600px;">
      <pop-search
        expanded
        actions=${ACTIONS}
        .results=${mockResults}
      ></pop-search>
      <p style="color: var(--pico-muted-color); font-size: 12px; margin-top: 1rem;">
        Type <kbd>&gt;</kbd> in the search box to switch to actions mode.
      </p>
    </div>
  `,
};

export const ActionsWithSlot: Story = {
  name: 'State 1 — Toolbar end slot',
  render: () => html`
    <div style="max-width: 600px;">
      <pop-search expanded .results=${mockResults} actions=${ACTIONS}>
        <button
          slot="toolbar-end"
          style="padding: 3px 8px; border-radius: 4px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: inherit; cursor: pointer; font-size: 11px; white-space: nowrap;"
        >
          Filter: Notes
        </button>
      </pop-search>
    </div>
  `,
};

// ── State 2: Chat panel ────────────────────────────────────────────────────

export const ChatPanel: Story = {
  name: 'State 2 — Chat panel',
  render: () => html`
    <div style="max-width: 600px;">
      <pop-search
        expanded
        endpoint="/api/ai/search"
        .results=${mockResults}
        models=${MODELS}
        selected-model="llama3.1:8b"
        actions=${ACTIONS}
      ></pop-search>
      <p style="color: var(--pico-muted-color); font-size: 12px; margin-top: 1rem;">
        Press <kbd>⌘↵</kbd> or click the ✦ sparkles icon in the pill to open the AI chat panel.
      </p>
    </div>
  `,
};

export const ChatPanelWithMic: Story = {
  name: 'State 2 — Chat panel with mic',
  render: () => html`
    <div style="max-width: 600px;">
      <pop-search
        expanded
        endpoint="/api/ai/search"
        .results=${mockResults}
        models=${MODELS}
        selected-model="llama3.1:8b"
        show-mic-button
      ></pop-search>
    </div>
  `,
};
