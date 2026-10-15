import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

type Args = { name: string };

const meta: Meta<Args> = {
  title: 'pop-greeting',
  component: 'pop-greeting',
  args: { name: 'Stencil' },
  argTypes: { name: { control: 'text', description: 'Who to greet (reflected to the attribute).' } },
  parameters: {
    docs: {
      description: {
        component:
          'Greets `name`, reflecting it to the attribute, and counts renames with a `@Watch`. Change the control to see the watcher fire. Compiled by stencilrs.',
      },
    },
  },
  render: ({ name }) => html`<pop-greeting name=${name}></pop-greeting>`,
};

export default meta;

export const Default: StoryObj<Args> = {};
