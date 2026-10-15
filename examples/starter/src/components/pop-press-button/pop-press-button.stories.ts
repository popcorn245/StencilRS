import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

type Args = { label: string; disabled: boolean };

const meta: Meta<Args> = {
  title: 'pop-press-button',
  component: 'pop-press-button',
  args: { label: 'Press me', disabled: false },
  argTypes: { label: { control: 'text' }, disabled: { control: 'boolean' } },
  parameters: {
    docs: {
      description: {
        component:
          'Inheritance: `extends Pressable` (src/shared/pressable.ts). The `disabled` prop, the `pressCount` state and the `pressed` event are declared on the base class; stencilrs merges them into the component, as Stencil does.',
      },
    },
  },
  render: ({ label, disabled }) => html`<pop-press-button label=${label} ?disabled=${disabled}></pop-press-button>`,
};

export default meta;

export const Default: StoryObj<Args> = {};

export const Disabled: StoryObj<Args> = { args: { disabled: true } };
