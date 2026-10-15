import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Atoms/Tooltip',
  parameters: {
    docs: {
      description: {
        component:
          'Enable tooltips everywhere, without JavaScript. <a href="https://picocss.com/docs/tooltip">Pico CSS Tooltip docs</a>',
      },
    },
  },
  argTypes: {
    'data-tooltip': { control: 'text' },
    'data-placement': {
      control: { type: 'select' },
      options: ['top', 'right', 'bottom', 'left'],
    },
  },
};

export default meta;

type TooltipArgs = {
  'data-tooltip': string;
  'data-placement': 'top' | 'right' | 'bottom' | 'left';
};

export const Default: StoryObj<TooltipArgs> = {
  name: 'Default Tooltip',
  render: (args) => `
    <button data-tooltip="${args['data-tooltip']}" data-placement="${args['data-placement']}">
      I have a tooltip
    </button>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><button data-tooltip="This is a tooltip" data-placement="top">
  I have a tooltip
</button></code></pre>
    </details>
  `,
  args: {
    'data-tooltip': 'This is a tooltip',
    'data-placement': 'top',
  },
  parameters: {
    docs: {
      source: {
        code: `
<button data-tooltip="This is a tooltip" data-placement="top">
  I have a tooltip
</button>
        `,
      },
    },
  },
};
