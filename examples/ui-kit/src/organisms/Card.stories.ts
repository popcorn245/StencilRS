import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Card',
  parameters: {
    docs: {
      description: {
        component:
          'Create flexible cards with a semantic markup that provides graceful spacings across various devices and viewports. <a href="https://picocss.com/docs/card">Pico CSS Card docs</a>',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Default Card',
  render: () => `
    <article>I'm a card!</article>
  `,
  parameters: {
    docs: {
      source: {
        code: `<article>
  I'm a card!
</article>`,
      },
    },
  },
};

export const Sectioning: StoryObj = {
  name: 'Sectioning',
  render: () => `
    <article>
      <header>Header</header>
      Body
      <footer>Footer</footer>
    </article>
  `,
  parameters: {
    docs: {
      source: {
        code: `<article>
  <header>Header</header>
  Body
  <footer>Footer</footer>
</article>`,
      },
    },
  },
};
