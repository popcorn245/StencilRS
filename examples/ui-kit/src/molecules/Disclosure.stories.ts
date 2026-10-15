import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/Disclosure',
  parameters: {
    docs: {
      description: {
        component:
          'Single disclosure (collapsible) element using details/summary. <a href="https://picocss.com/docs/accordion">Pico CSS Accordion docs</a>',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Default Disclosure',
  render: () => `
    <details>
      <summary>Click to expand</summary>
      <p>This content is hidden by default and can be toggled by clicking the summary.</p>
    </details>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><details>
  <summary>Click to expand</summary>
  <p>This content is hidden by default and can be toggled by clicking the summary.</p>
</details></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<details>
  <summary>Click to expand</summary>
  <p>This content is hidden by default and can be toggled by clicking the summary.</p>
</details>
        `,
      },
    },
  },
};

export const Open: StoryObj = {
  name: 'Open by Default',
  render: () => `
    <details open>
      <summary>Already expanded</summary>
      <p>This disclosure is open by default using the 'open' attribute.</p>
    </details>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><details open>
  <summary>Already expanded</summary>
  <p>This disclosure is open by default using the 'open' attribute.</p>
</details></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<details open>
  <summary>Already expanded</summary>
  <p>This disclosure is open by default using the 'open' attribute.</p>
</details>
        `,
      },
    },
  },
};

export const WithRichContent: StoryObj = {
  name: 'With Rich Content',
  render: () => `
    <details>
      <summary>Product Details</summary>
      <h4>Features</h4>
      <ul>
        <li>High quality materials</li>
        <li>Eco-friendly production</li>
        <li>2-year warranty</li>
      </ul>
      <p>
        <strong>Price:</strong> $99.99
      </p>
    </details>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><details>
  <summary>Product Details</summary>
  <h4>Features</h4>
  <ul>
    <li>High quality materials</li>
    <li>Eco-friendly production</li>
    <li>2-year warranty</li>
  </ul>
  <p><strong>Price:</strong> $99.99</p>
</details></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<details>
  <summary>Product Details</summary>
  <h4>Features</h4>
  <ul>
    <li>High quality materials</li>
    <li>Eco-friendly production</li>
    <li>2-year warranty</li>
  </ul>
  <p><strong>Price:</strong> $99.99</p>
</details>
        `,
      },
    },
  },
};
