import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

type Args = { label: string; step: number };

const meta: Meta<Args> = {
  title: 'pop-counter',
  component: 'pop-counter',
  args: { label: 'Clicks', step: 1 },
  argTypes: {
    label: { control: 'text', description: 'Text shown before the count.' },
    step: { control: { type: 'number', min: 1 }, description: 'How much each click adds.' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A shadow-DOM counter: a `@Prop` label and step, a `@State` count, a `countChanged` `@Event` and a `reset()` `@Method`. Compiled by stencilrs.',
      },
    },
  },
  render: ({ label, step }) => html`<pop-counter label=${label} step=${step}></pop-counter>`,
};

export default meta;

export const Default: StoryObj<Args> = {};

export const BigSteps: StoryObj<Args> = { args: { label: 'Points', step: 10 } };
