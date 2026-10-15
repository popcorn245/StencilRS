import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import type { PopTabbedChat } from './tabbed-chat';

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

const SESSIONS = JSON.stringify([
  {
    id: 'session-1',
    label: 'Dinner ideas',
    messages: JSON.stringify([
      { id: 'u1', role: 'user', content: 'What should I make for dinner?', timestamp: Date.now() - 90000 },
      { id: 'a1', role: 'assistant', content: "How about **pasta aglio e olio**? It's quick, uses pantry staples, and ready in under 20 minutes.", timestamp: Date.now() - 60000 },
    ]),
  },
  {
    id: 'session-2',
    label: 'Weekend plans',
    messages: JSON.stringify([
      { id: 'u2', role: 'user', content: "What's a good activity for a rainy day?", timestamp: Date.now() - 300000 },
      { id: 'a2', role: 'assistant', content: 'A cozy board game night, baking bread, or a movie marathon are all great rainy-day options!', timestamp: Date.now() - 270000 },
    ]),
  },
  {
    id: 'session-3',
    label: 'New chat',
    messages: '[]',
  },
]);

const meta: Meta = {
  title: 'Components/Organisms/Chat/pop-tabbed-chat',
  component: 'pop-tabbed-chat',
  tags: ['autodocs'],
  argTypes: {
    layout:        { control: 'select', options: ['bubble', 'prose'] },
    streamingMode: { control: 'select', options: ['inline', 'dots'] },
    showMicButton: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<PopTabbedChat>;

export const WithSessions: Story = {
  args: {
    sessions: SESSIONS,
    activeSessionId: 'session-1',
    endpoint: '/api/ai/chat',
    aiName: 'Popcorn AI',
    layout: 'bubble',
    userInitials: 'JP',
    models: MODELS,
    selectedModel: 'llama3.1:8b',
  },
};

export const SingleSession: Story = {
  args: {
    sessions: JSON.stringify([
      {
        id: 'session-a',
        label: 'My conversation',
        messages: JSON.stringify([
          { id: 'u1', role: 'user', content: 'Hello!', timestamp: Date.now() - 30000 },
          { id: 'a1', role: 'assistant', content: 'Hi there! How can I help you today?', timestamp: Date.now() - 20000 },
        ]),
      },
    ]),
    activeSessionId: 'session-a',
    endpoint: '/api/ai/chat',
    aiName: 'Popcorn AI',
    layout: 'bubble',
    userInitials: 'JP',
  },
};

export const EmptySessions: Story = {
  args: {
    sessions: '[]',
    endpoint: '/api/ai/chat',
    aiName: 'Popcorn AI',
    layout: 'bubble',
  },
};

export const ProseLayout: Story = {
  args: {
    sessions: SESSIONS,
    activeSessionId: 'session-1',
    endpoint: '/api/ai/chat',
    aiName: 'Popcorn AI',
    layout: 'prose',
    userInitials: 'JP',
  },
};

export const WithMic: Story = {
  args: {
    sessions: SESSIONS,
    activeSessionId: 'session-2',
    endpoint: '/api/ai/chat',
    aiName: 'Popcorn AI',
    layout: 'bubble',
    userInitials: 'JP',
    showMicButton: true,
    models: MODELS,
    selectedModel: 'llama3.1:8b',
  },
};

export const FullHeight: Story = {
  render: () => html`
    <div style="height: 600px; display: flex; flex-direction: column;">
      <pop-tabbed-chat
        sessions=${SESSIONS}
        active-session-id="session-1"
        endpoint="/api/ai/chat"
        ai-name="Popcorn AI"
        layout="bubble"
        user-initials="JP"
        models=${MODELS}
        selected-model="llama3.1:8b"
        style="flex: 1; min-height: 0;"
      ></pop-tabbed-chat>
    </div>
  `,
};

export const WithToolbarSlot: Story = {
  render: () => html`
    <div style="height: 500px; display: flex; flex-direction: column;">
      <pop-tabbed-chat
        sessions=${SESSIONS}
        active-session-id="session-1"
        endpoint="/api/ai/chat"
        ai-name="Popcorn AI"
        layout="bubble"
        user-initials="JP"
        style="flex: 1; min-height: 0;"
      >
        <button
          slot="toolbar-end"
          style="padding: 4px 10px; border-radius: 4px; background: rgba(255,255,255,0.1); border: none; color: inherit; cursor: pointer; font-size: 12px;"
        >
          Save session
        </button>
      </pop-tabbed-chat>
    </div>
  `,
};
