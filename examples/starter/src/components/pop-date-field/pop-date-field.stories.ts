import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

type Args = { name: string; value: string };

const meta: Meta<Args> = {
  title: 'pop-date-field',
  component: 'pop-date-field',
  args: { name: 'when', value: '2026-10-15' },
  argTypes: { name: { control: 'text' }, value: { control: 'text', description: 'The `value` attribute: an ISO day, YYYY-MM-DD' } },
  parameters: {
    docs: {
      description: {
        component:
          'Form-associated (`@AttachInternals`): it submits with its form. `value` is a `Date`; `@AttrDeserialize` reads it from the `value` attribute and `@PropSerialize` writes it back, as an ISO day.',
      },
    },
  },
  render: ({ name, value }) => html`
    <form @submit=${(e: SubmitEvent) => {
      e.preventDefault();
      const out = (e.target as HTMLFormElement).querySelector('output')!;
      out.textContent = JSON.stringify(Object.fromEntries(new FormData(e.target as HTMLFormElement)));
    }}>
      <pop-date-field name=${name} value=${value}></pop-date-field>
      <button type="submit">Submit</button>
      <output></output>
    </form>
  `,
};

export default meta;

export const InAForm: StoryObj<Args> = {};
