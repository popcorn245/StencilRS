import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/Progress',
  parameters: {
    docs: {
      description: {
        component:
          'The progress bar element in pure HTML, without JavaScript. <a href="https://picocss.com/docs/progress">Pico CSS Progress docs</a>',
      },
    },
  },
  argTypes: {
    value: { control: 'number' },
    max: { control: 'number' },
  },
};

export default meta;

type ProgressArgs = {
  value: number;
  max: number;
};

export const Default: StoryObj<ProgressArgs> = {
  name: 'Default Progress',
  render: (args) => `
    <progress value="${args.value}" max="${args.max}"></progress>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><progress value="50" max="100"></progress></code></pre>
    </details>
  `,
  args: {
    value: 50,
    max: 100,
  },
  parameters: {
    docs: {
      source: {
        code: `
<progress value="50" max="100"></progress>
        `,
      },
    },
  },
};

export const Indeterminate: StoryObj = {
  name: 'Indeterminate',
  render: () => `
    <progress></progress>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><progress></progress></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<progress></progress>
        `,
      },
    },
  },
};
