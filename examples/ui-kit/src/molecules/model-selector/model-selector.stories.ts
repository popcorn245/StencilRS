import type { Meta, StoryObj } from '@storybook/web-components';

const sampleModels = JSON.stringify([
  {
    group: 'Anthropic',
    models: [
      { value: 'claude-sonnet-4', label: 'Claude Sonnet 4', icon: '\u{1F7E3}' },
      { value: 'claude-haiku-3', label: 'Claude Haiku 3', icon: '\u{1F535}' },
    ],
  },
  {
    group: 'OpenAI',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o', icon: '\u{1F7E2}' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini', icon: '\u{1F7E1}' },
    ],
  },
]);

const meta: Meta = {
  title: 'Components/Molecules/ModelSelector',
  parameters: {
    docs: {
      description: {
        component:
          'A pill-style dropdown for selecting an AI model and mode (chat/plan/code). Persists selection to localStorage.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Default',
  render: () => `
    <div style="padding: 4rem 1rem 1rem; background: var(--pico-background-color); position: relative;">
      <pop-model-selector models='${sampleModels}' selected-model="claude-sonnet-4" selected-mode="chat"></pop-model-selector>
    </div>
  `,
};

export const NoModels: StoryObj = {
  name: 'No Models Configured',
  render: () => `
    <div style="padding: 4rem 1rem 1rem; background: var(--pico-background-color); position: relative;">
      <pop-model-selector models="[]" selected-mode="plan"></pop-model-selector>
    </div>
  `,
};
