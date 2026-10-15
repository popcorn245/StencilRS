import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/Group',
  parameters: {
    docs: {
      description: {
        component:
          'Stack forms elements and buttons horizontally with `role="group"` and `role="search"`. <a href="https://picocss.com/docs/group">Pico CSS Group docs</a>',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Default Group',
  render: () => `
    <div role="group">
      <button>Button 1</button>
      <button>Button 2</button>
      <button>Button 3</button>
    </div>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><div role="group">
  <button>Button 1</button>
  <button>Button 2</button>
  <button>Button 3</button>
</div></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<div role="group">
  <button>Button 1</button>
  <button>Button 2</button>
  <button>Button 3</button>
</div>
        `,
      },
    },
  },
};

export const Search: StoryObj = {
  name: 'Search',
  render: () => `
    <div role="search">
      <input type="search" placeholder="Search" />
      <button type="submit">Search</button>
    </div>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><div role="search">
  <input type="search" placeholder="Search">
  <button type="submit">Search</button>
</div></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<div role="search">
  <input type="search" placeholder="Search">
  <button type="submit">Search</button>
</div>
        `,
      },
    },
  },
};
