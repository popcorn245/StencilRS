import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Nav',
  parameters: {
    docs: {
      description: {
        component:
          'The essential navbar component in pure semantic HTML. <a href="https://picocss.com/docs/nav">Pico CSS Nav docs</a>',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Default Nav',
  render: () => `
    <nav>
      <ul>
        <li>
          <strong>Brand</strong>
        </li>
      </ul>
      <ul>
        <li>
          <a href="#">Link 1</a>
        </li>
        <li>
          <a href="#">Link 2</a>
        </li>
        <li>
          <a href="#" role="button">
            Button
          </a>
        </li>
      </ul>
    </nav>
  `,
  parameters: {
    docs: {
      source: {
        code: `<nav>
  <ul>
    <li><strong>Brand</strong></li>
  </ul>
  <ul>
    <li><a href="#">Link 1</a></li>
    <li><a href="#">Link 2</a></li>
    <li><a href="#" role="button">Button</a></li>
  </ul>
</nav>`,
      },
    },
  },
};

export const LinkVariants: StoryObj = {
  name: 'Link Variants',
  render: () => `
    <nav>
      <ul>
        <li>
          <strong>Brand</strong>
        </li>
      </ul>
      <ul>
        <li>
          <a href="#" class="secondary">
            Secondary
          </a>
        </li>
        <li>
          <a href="#" class="contrast">
            Contrast
          </a>
        </li>
      </ul>
    </nav>
  `,
  parameters: {
    docs: {
      source: {
        code: `<nav>
  <ul>
    <li><strong>Brand</strong></li>
  </ul>
  <ul>
    <li><a href="#" class="secondary">Secondary</a></li>
    <li><a href="#" class="contrast">Contrast</a></li>
  </ul>
</nav>`,
      },
    },
  },
};

export const Breadcrumb: StoryObj = {
  name: 'Breadcrumb',
  render: () => `
    <nav aria-label="breadcrumb">
      <ul>
        <li>
          <a href="#">Home</a>
        </li>
        <li>
          <a href="#">Category</a>
        </li>
        <li>Page</li>
      </ul>
    </nav>
  `,
  parameters: {
    docs: {
      source: {
        code: `<nav aria-label="breadcrumb">
  <ul>
    <li><a href="#">Home</a></li>
    <li><a href="#">Category</a></li>
    <li>Page</li>
  </ul>
</nav>`,
      },
    },
  },
};
