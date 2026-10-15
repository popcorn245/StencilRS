import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import type { PopChatToolbar } from './chat-toolbar';

const MODELS = JSON.stringify([
  {
    group: 'Local',
    models: [
      { value: 'llama3.1:8b', label: 'Llama 3.1 8B', icon: '🦙' },
      { value: 'mistral:7b', label: 'Mistral 7B', icon: '🌪️' },
    ],
  },
  {
    group: 'Cloud',
    models: [
      { value: 'claude-sonnet-4-6', label: 'Claude Sonnet', icon: '✦', color: '#7B61FF' },
      { value: 'gpt-4o', label: 'GPT-4o', icon: '🤖' },
    ],
  },
]);

const TOOLS = JSON.stringify([
  { id: 'web', label: 'Web Search', icon: '🌐' },
  { id: 'notes', label: 'Notes', icon: '📝' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
]);

const meta: Meta = {
  title: 'Components/Organisms/Chat/pop-chat-toolbar',
  component: 'pop-chat-toolbar',
  tags: ['autodocs'],
  argTypes: {
    showMicButton: { control: 'boolean' },
    selectedMode:  { control: 'select', options: ['chat', 'plan', 'code'] },
    selectedModel: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<PopChatToolbar>;

export const Default: Story = {
  args: {
    models: MODELS,
    selectedModel: 'llama3.1:8b',
    selectedMode: 'chat',
    tools: TOOLS,
    activeTools: '[]',
  },
};

export const WithActiveTool: Story = {
  args: {
    models: MODELS,
    selectedModel: 'claude-sonnet-4-6',
    selectedMode: 'chat',
    tools: TOOLS,
    activeTools: JSON.stringify(['web']),
  },
};

export const WithMic: Story = {
  args: {
    models: MODELS,
    selectedModel: 'llama3.1:8b',
    selectedMode: 'chat',
    tools: TOOLS,
    activeTools: '[]',
    showMicButton: true,
  },
};

export const PlanMode: Story = {
  args: {
    models: MODELS,
    selectedModel: 'claude-sonnet-4-6',
    selectedMode: 'plan',
    tools: TOOLS,
    activeTools: '[]',
  },
};

export const WithSlot: Story = {
  render: () => html`
    <pop-chat-toolbar
      models='${MODELS}'
      selected-model="llama3.1:8b"
      selected-mode="chat"
      tools='${TOOLS}'
      active-tools='[]'
    >
      <button slot="toolbar-end" style="padding:4px 10px; border-radius:4px; background:rgba(255,255,255,0.1); border:none; color:inherit; cursor:pointer; font-size:12px;">
        Custom Action
      </button>
    </pop-chat-toolbar>
  `,
};
