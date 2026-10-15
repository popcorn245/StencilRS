import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Components/Organisms/TokenPill',
  component: 'pop-token-pill',
  argTypes: {
    text: { control: 'text' },
    tokens: { control: 'number' },
    limit: { control: 'number' },
    showLabel: { control: 'boolean' },
    ratio: { control: 'number' },
  },
};

export default meta;

export const Default: StoryObj = {
  render: (args) => `
    <pop-token-pill 
      text="${args.text || ''}" 
      tokens="${args.tokens || ''}" 
      limit="${args.limit || 8192}" 
      show-label="${args.showLabel !== false}" 
      ratio="${args.ratio || 4}"
    ></pop-token-pill>
  `,
  args: {
    text: 'A short sentence.',
    limit: 8192,
    showLabel: true,
  },
};

export const MidUsage: StoryObj = {
  render: () => `<pop-token-pill tokens="4000" limit="8192"></pop-token-pill>`,
};

export const Warning: StoryObj = {
  render: () => `<pop-token-pill tokens="7000" limit="8192"></pop-token-pill>`,
};

export const Critical: StoryObj = {
  render: () => `<pop-token-pill tokens="8000" limit="8192"></pop-token-pill>`,
};

export const NoLabel: StoryObj = {
  render: () => `<pop-token-pill tokens="3000" limit="8192" show-label="false"></pop-token-pill>`,
};
