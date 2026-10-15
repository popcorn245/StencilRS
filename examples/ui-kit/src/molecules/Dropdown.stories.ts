import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/Dropdown',
  parameters: {
    docs: {
      description: {
        component:
          'Create dropdown menus and custom selects with minimal and semantic HTML, without JavaScript. <a href="https://picocss.com/docs/dropdown">Pico CSS Dropdown docs</a>',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Default Dropdown',
  render: () => `
    <details class="dropdown">
      <summary>Dropdown</summary>
      <ul>
        <li>
          <a href="#">Item 1</a>
        </li>
        <li>
          <a href="#">Item 2</a>
        </li>
        <li>
          <a href="#">Item 3</a>
        </li>
      </ul>
    </details>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><details class="dropdown">
  <summary>Dropdown</summary>
  <ul>
    <li><a href="#">Item 1</a></li>
    <li><a href="#">Item 2</a></li>
    <li><a href="#">Item 3</a></li>
  </ul>
</details></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<details class="dropdown">
  <summary>Dropdown</summary>
  <ul>
    <li><a href="#">Item 1</a></li>
    <li><a href="#">Item 2</a></li>
    <li><a href="#">Item 3</a></li>
  </ul>
</details>
        `,
      },
    },
  },
};

export const ButtonVariants: StoryObj = {
  name: 'Button Variants',
  render: () => `
    <details class="dropdown">
      <summary role="button">Dropdown as a button</summary>
      <ul>
        <li>
          <a href="#">Item 1</a>
        </li>
        <li>
          <a href="#">Item 2</a>
        </li>
        <li>
          <a href="#">Item 3</a>
        </li>
      </ul>
    </details>
    <details class="dropdown">
      <summary role="button" class="secondary">
        Secondary
      </summary>
      <ul>
        <li>
          <a href="#">Item 1</a>
        </li>
        <li>
          <a href="#">Item 2</a>
        </li>
        <li>
          <a href="#">Item 3</a>
        </li>
      </ul>
    </details>
    <details class="dropdown">
      <summary role="button" class="contrast">
        Contrast
      </summary>
      <ul>
        <li>
          <a href="#">Item 1</a>
        </li>
        <li>
          <a href="#">Item 2</a>
        </li>
        <li>
          <a href="#">Item 3</a>
        </li>
      </ul>
    </details>
    <details class="dropdown">
      <summary role="button" class="outline">
        Primary outline
      </summary>
      <ul>
        <li>
          <a href="#">Item 1</a>
        </li>
        <li>
          <a href="#">Item 2</a>
        </li>
        <li>
          <a href="#">Item 3</a>
        </li>
      </ul>
    </details>
    <details class="dropdown">
      <summary role="button" class="secondary outline">
        Secondary outline
      </summary>
      <ul>
        <li>
          <a href="#">Item 1</a>
        </li>
        <li>
          <a href="#">Item 2</a>
        </li>
        <li>
          <a href="#">Item 3</a>
        </li>
      </ul>
    </details>
    <details class="dropdown">
      <summary role="button" class="contrast outline">
        Contrast outline
      </summary>
      <ul>
        <li>
          <a href="#">Item 1</a>
        </li>
        <li>
          <a href="#">Item 2</a>
        </li>
        <li>
          <a href="#">Item 3</a>
        </li>
      </ul>
    </details>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><details class="dropdown">
  <summary role="button">Dropdown as a button</summary>
  <ul>
    <li><a href="#">Item 1</a></li>
    <li><a href="#">Item 2</a></li>
    <li><a href="#">Item 3</a></li>
  </ul>
</details>
<details class="dropdown">
  <summary role="button" class="secondary">Secondary</summary>
  <ul>
    <li><a href="#">Item 1</a></li>
    <li><a href="#">Item 2</a></li>
    <li><a href="#">Item 3</a></li>
  </ul>
</details>
<details class="dropdown">
  <summary role="button" class="contrast">Contrast</summary>
  <ul>
    <li><a href="#">Item 1</a></li>
    <li><a href="#">Item 2</a></li>
    <li><a href="#">Item 3</a></li>
  </ul>
</details></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<details class="dropdown">
  <summary role="button">Dropdown as a button</summary>
  <ul>
    <li><a href="#">Item 1</a></li>
    <li><a href="#">Item 2</a></li>
    <li><a href="#">Item 3</a></li>
  </ul>
</details>
<details class="dropdown">
  <summary role="button" class="secondary">Secondary</summary>
  <ul>
    <li><a href="#">Item 1</a></li>
    <li><a href="#">Item 2</a></li>
    <li><a href="#">Item 3</a></li>
  </ul>
</details>
<details class="dropdown">
  <summary role="button" class="contrast">Contrast</summary>
  <ul>
    <li><a href="#">Item 1</a></li>
    <li><a href="#">Item 2</a></li>
    <li><a href="#">Item 3</a></li>
  </ul>
</details>
        `,
      },
    },
  },
};
