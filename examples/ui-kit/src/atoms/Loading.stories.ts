import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Atoms/Loading',
  parameters: {
    docs: {
      description: {
        component:
          'Add a loading indicator with `aria-busy="true"`. <a href="https://picocss.com/docs/loading">Pico CSS Loading docs</a>',
      },
    },
  },
  argTypes: {
    'aria-busy': { control: 'boolean' },
  },
};

export default meta;

type LoadingArgs = {
  'aria-busy': boolean;
};

export const Default: StoryObj<LoadingArgs> = {
  name: 'Default Loading',
  render: (args) => `
    <article aria-busy="${args['aria-busy']}"></article>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><article aria-busy="true"></article></code></pre>
    </details>
  `,
  args: {
    'aria-busy': true,
  },
  parameters: {
    docs: {
      source: {
        code: `
<article aria-busy="true"></article>
        `,
      },
    },
  },
};

export const Inline: StoryObj<LoadingArgs> = {
  name: 'Inline',
  render: (args) => `
    <p aria-busy="${args['aria-busy']}">Generating your link...</p>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><p aria-busy="true">Generating your link...</p></code></pre>
    </details>
  `,
  args: {
    'aria-busy': true,
  },
  parameters: {
    docs: {
      source: {
        code: `
<p aria-busy="true">Generating your link...</p>
        `,
      },
    },
  },
};

export const Button: StoryObj<LoadingArgs> = {
  name: 'Button',
  render: (args) => `
    <button aria-busy="${args['aria-busy']}">Please wait…</button>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><button aria-busy="true">Please wait…</button></code></pre>
    </details>
  `,
  args: {
    'aria-busy': true,
  },
  parameters: {
    docs: {
      source: {
        code: `
<button aria-busy="true">Please wait…</button>
        `,
      },
    },
  },
};
