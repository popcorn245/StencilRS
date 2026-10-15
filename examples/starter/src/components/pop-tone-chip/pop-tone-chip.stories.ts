import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

type Args = { text: string; tone: 'red' | 'blue' };

const meta: Meta<Args> = {
  title: 'pop-tone-chip',
  component: 'pop-tone-chip',
  args: { text: 'Click to flip', tone: 'red' },
  argTypes: { text: { control: 'text' }, tone: { control: 'inline-radio', options: ['red', 'blue'] } },
  parameters: {
    docs: {
      description: {
        component:
          'Mixins: `extends Mixin(withTone)` (src/shared/with-tone.ts). The `tone` prop and its watcher come from the mixin factory. Click the chip to flip the tone.',
      },
    },
  },
  render: ({ text, tone }) => html`<pop-tone-chip text=${text} tone=${tone}></pop-tone-chip>`,
};

export default meta;

export const Default: StoryObj<Args> = {};

export const Blue: StoryObj<Args> = { args: { tone: 'blue' } };
