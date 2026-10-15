import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import type { PopAiChat } from './ai-chat';

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

const PRELOADED = JSON.stringify([
  { id: 'u1', role: 'user', content: 'What should we have for dinner?', timestamp: Date.now() - 60000 },
  { id: 'a1', role: 'assistant', content: "How about **pasta aglio e olio**? It's quick, delicious, and only needs a few ingredients:\n\n- Spaghetti\n- Garlic\n- Olive oil\n- Parsley\n- Red pepper flakes\n\nReady in under 20 minutes!", timestamp: Date.now() - 30000 },
]);

const meta: Meta = {
  title: 'Components/Organisms/Chat/pop-ai-chat',
  component: 'pop-ai-chat',
  tags: ['autodocs'],
  argTypes: {
    layout:        { control: 'select', options: ['bubble', 'prose'] },
    streamingMode: { control: 'select', options: ['inline', 'dots'] },
    disabled:      { control: 'boolean' },
    showMicButton: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<PopAiChat>;

export const Empty: Story = {
  args: {
    endpoint: '/api/ai/chat',
    aiName: 'Popcorn AI',
    placeholder: 'Ask me anything…',
    layout: 'bubble',
    models: MODELS,
    selectedModel: 'llama3.1:8b',
  },
};

export const WithHistory: Story = {
  args: {
    endpoint: '/api/ai/chat',
    messages: PRELOADED,
    aiName: 'Popcorn AI',
    layout: 'bubble',
    userInitials: 'JP',
    models: MODELS,
    selectedModel: 'llama3.1:8b',
  },
};

export const ProseLayout: Story = {
  args: {
    endpoint: '/api/ai/chat',
    messages: PRELOADED,
    aiName: 'Popcorn AI',
    layout: 'prose',
    userInitials: 'JP',
  },
};

export const WithMic: Story = {
  args: {
    endpoint: '/api/ai/chat',
    aiName: 'Popcorn AI',
    layout: 'bubble',
    showMicButton: true,
    models: MODELS,
    selectedModel: 'llama3.1:8b',
  },
};

export const Disabled: Story = {
  args: {
    endpoint: '/api/ai/chat',
    aiName: 'Popcorn AI',
    layout: 'bubble',
    disabled: true,
  },
};

export const FullHeight: Story = {
  render: () => html`
    <div style="height: 500px; display: flex; flex-direction: column;">
      <pop-ai-chat
        endpoint="/api/ai/chat"
        ai-name="Popcorn AI"
        messages='${PRELOADED}'
        layout="bubble"
        user-initials="JP"
        models='${MODELS}'
        selected-model="llama3.1:8b"
        style="flex:1; min-height:0;"
      ></pop-ai-chat>
    </div>
  `,
};

// ── RAG / note-grounded states (Phase 6, externalDriver) ────────────────────

const ASK_MODELS = JSON.stringify([
  {
    group: 'Models',
    models: [
      { value: 'gemma', label: 'Gemma', icon: '✦' },
      { value: 'claude', label: 'Claude', icon: '✦', color: '#7B61FF' },
    ],
  },
]);

const CITATIONS = [
  { index: 1, refId: 'note-launch', label: 'Launch plan', snippet: 'Ship date moved to the 14th…' },
  { index: 2, refId: 'note-marketing', label: 'Marketing notes', snippet: 'Email teaser one week prior.' },
];

/** Idle: the Ask dock before any question (empty conversation). */
export const AskIdle: Story = {
  render: () => html`
    <div style="height: 460px; display:flex; flex-direction:column;">
      <pop-ai-chat
        external-driver
        ai-name="Brain"
        placeholder="Ask about your notes…"
        layout="bubble"
        models='${ASK_MODELS}'
        selected-model="gemma"
        style="flex:1; min-height:0;"
      ></pop-ai-chat>
    </div>
  `,
};

/** Streaming: a partial answer is being typed (no citations yet). */
export const AskStreaming: Story = {
  render: () => {
    const id = `aic-stream-${Math.random().toString(36).slice(2)}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(id) as any;
      el?.sendMessage?.('What did I decide about the launch?');
      requestAnimationFrame(async () => {
        await el?.beginAssistant?.();
        await el?.appendAssistantToken?.('You decided to move the launch to ');
        await el?.appendAssistantToken?.('the 14th');
      });
    });
    return html`
      <div style="height: 460px; display:flex; flex-direction:column;">
        <pop-ai-chat
          id="${id}"
          external-driver
          ai-name="Brain"
          layout="bubble"
          models='${ASK_MODELS}'
          selected-model="gemma"
          style="flex:1; min-height:0;"
        ></pop-ai-chat>
      </div>
    `;
  },
};

/** Answer with citations: the finished grounded answer + clickable Source chips. */
export const AskWithCitations: Story = {
  render: () => {
    const id = `aic-cite-${Math.random().toString(36).slice(2)}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(id) as any;
      el?.sendMessage?.('What did I decide about the launch?');
      requestAnimationFrame(async () => {
        await el?.beginAssistant?.();
        await el?.endAssistant?.(
          'You moved the launch to the 14th [1] and queued an email teaser a week prior [2].',
          CITATIONS,
        );
      });
    });
    return html`
      <div style="height: 460px; display:flex; flex-direction:column;">
        <pop-ai-chat
          id="${id}"
          external-driver
          ai-name="Brain"
          layout="bubble"
          models='${ASK_MODELS}'
          selected-model="gemma"
          style="flex:1; min-height:0;"
        ></pop-ai-chat>
      </div>
    `;
  },
};

/** No results: the fixed "couldn't find anything" answer — NO citations, no model. */
export const AskNoResults: Story = {
  render: () => {
    const id = `aic-none-${Math.random().toString(36).slice(2)}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(id) as any;
      el?.sendMessage?.('What is the airspeed of a swallow?');
      requestAnimationFrame(async () => {
        await el?.beginAssistant?.();
        await el?.endAssistant?.(
          'I couldn’t find anything in your notes about “the airspeed of a swallow”. Try different words, or capture a note about it first.',
          [],
        );
      });
    });
    return html`
      <div style="height: 460px; display:flex; flex-direction:column;">
        <pop-ai-chat
          id="${id}"
          external-driver
          ai-name="Brain"
          layout="bubble"
          models='${ASK_MODELS}'
          selected-model="gemma"
          style="flex:1; min-height:0;"
        ></pop-ai-chat>
      </div>
    `;
  },
};
