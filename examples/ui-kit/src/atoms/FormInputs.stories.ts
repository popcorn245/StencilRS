import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Atoms/Form Inputs',
  parameters: {
    docs: {
      description: {
        component:
          'Form input elements with various types. <a href="https://picocss.com/docs/forms">Pico CSS Forms docs</a>',
      },
    },
  },
};

export default meta;

export const TextInputs: StoryObj = {
  name: 'Text Inputs',
  render: () => `
    <input type="text" placeholder="Text input" />
    <input type="email" placeholder="Email input" />
    <input type="password" placeholder="Password input" />
    <input type="search" placeholder="Search input" />
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><input type="text" placeholder="Text input">
<input type="email" placeholder="Email input">
<input type="password" placeholder="Password input">
<input type="search" placeholder="Search input"></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<input type="text" placeholder="Text input">
<input type="email" placeholder="Email input">
<input type="password" placeholder="Password input">
<input type="search" placeholder="Search input">
        `,
      },
    },
  },
};

export const Textarea: StoryObj = {
  name: 'Textarea',
  render: () => `
    <textarea placeholder="Enter your message here..." rows="4"></textarea>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><textarea placeholder="Enter your message here..." rows="4"></textarea></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<textarea placeholder="Enter your message here..." rows="4"></textarea>
        `,
      },
    },
  },
};

export const Select: StoryObj = {
  name: 'Select',
  render: () => `
    <select>
      <option value="">Select an option...</option>
      <option value="1">Option 1</option>
      <option value="2">Option 2</option>
      <option value="3">Option 3</option>
    </select>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><select>
  <option value="">Select an option...</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
  <option value="3">Option 3</option>
</select></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<select>
  <option value="">Select an option...</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
  <option value="3">Option 3</option>
</select>
        `,
      },
    },
  },
};

export const RangeInput: StoryObj = {
  name: 'Range Input',
  render: () => `
    <input type="range" min="0" max="100" value="50" />
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><input type="range" min="0" max="100" value="50"></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<input type="range" min="0" max="100" value="50">
        `,
      },
    },
  },
};

export const FileInput: StoryObj = {
  name: 'File Input',
  render: () => `
    <input type="file" />
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><input type="file"></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<input type="file">
        `,
      },
    },
  },
};

export const InputStates: StoryObj = {
  name: 'Input States',
  render: () => `
    <input type="text" placeholder="Normal input" />
    <input type="text" placeholder="Disabled input" disabled />
    <input type="text" placeholder="Readonly input" readonly value="Read only value" />
    <input type="text" placeholder="Invalid input" aria-invalid="true" />
    <input type="text" placeholder="Valid input" aria-invalid="false" />
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><input type="text" placeholder="Normal input">
<input type="text" placeholder="Disabled input" disabled>
<input type="text" placeholder="Readonly input" readonly value="Read only value">
<input type="text" placeholder="Invalid input" aria-invalid="true">
<input type="text" placeholder="Valid input" aria-invalid="false"></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<input type="text" placeholder="Normal input">
<input type="text" placeholder="Disabled input" disabled>
<input type="text" placeholder="Readonly input" readonly value="Read only value">
<input type="text" placeholder="Invalid input" aria-invalid="true">
<input type="text" placeholder="Valid input" aria-invalid="false">
        `,
      },
    },
  },
};
