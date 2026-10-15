import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/Form Field',
  parameters: {
    docs: {
      description: {
        component:
          'Form field combining label and input elements. <a href="https://picocss.com/docs/forms">Pico CSS Forms docs</a>',
      },
    },
  },
};

export default meta;

export const TextFieldinsideLabel: StoryObj = {
  name: 'Text Field (inside label)',
  render: () => `
    <label>
      Name
      <input type="text" name="name" placeholder="Enter your name" />
    </label>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><label>
  Name
  <input type="text" name="name" placeholder="Enter your name">
</label></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<label>
  Name
  <input type="text" name="name" placeholder="Enter your name">
</label>
        `,
      },
    },
  },
};

export const TextFieldWithFor: StoryObj = {
  name: 'Text Field (with for attribute)',
  render: () => `
    <label for="email">Email</label>
    <input type="email" id="email" name="email" placeholder="Enter your email" />
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><label for="email">Email</label>
<input type="email" id="email" name="email" placeholder="Enter your email"></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<label for="email">Email</label>
<input type="email" id="email" name="email" placeholder="Enter your email">
        `,
      },
    },
  },
};

export const TextareaField: StoryObj = {
  name: 'Textarea Field',
  render: () => `
    <label>
      Message
      <textarea name="message" placeholder="Enter your message" rows="4"></textarea>
    </label>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><label>
  Message
  <textarea name="message" placeholder="Enter your message" rows="4"></textarea>
</label></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<label>
  Message
  <textarea name="message" placeholder="Enter your message" rows="4"></textarea>
</label>
        `,
      },
    },
  },
};

export const SelectField: StoryObj = {
  name: 'Select Field',
  render: () => `
    <label>
      Country
      <select name="country">
        <option value="">Select a country...</option>
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
        <option value="ca">Canada</option>
      </select>
    </label>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><label>
  Country
  <select name="country">
    <option value="">Select a country...</option>
    <option value="us">United States</option>
    <option value="uk">United Kingdom</option>
    <option value="ca">Canada</option>
  </select>
</label></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<label>
  Country
  <select name="country">
    <option value="">Select a country...</option>
    <option value="us">United States</option>
    <option value="uk">United Kingdom</option>
    <option value="ca">Canada</option>
  </select>
</label>
        `,
      },
    },
  },
};

export const FieldWithHelper: StoryObj = {
  name: 'Field with Helper Text',
  render: () => `
    <label>
      Password
      <input type="password" name="password" placeholder="Enter password" />
      <small>Must be at least 8 characters</small>
    </label>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><label>
  Password
  <input type="password" name="password" placeholder="Enter password">
  <small>Must be at least 8 characters</small>
</label></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<label>
  Password
  <input type="password" name="password" placeholder="Enter password">
  <small>Must be at least 8 characters</small>
</label>
        `,
      },
    },
  },
};

export const InvalidField: StoryObj = {
  name: 'Invalid Field',
  render: () => `
    <label>
      Email
      <input type="email" name="email" placeholder="Enter your email" aria-invalid="true" />
      <small>Please enter a valid email address</small>
    </label>
    <br><br>
    <details>
      <summary>View Code</summary>
      <pre><code><label>
  Email
  <input type="email" name="email" placeholder="Enter your email" aria-invalid="true">
  <small>Please enter a valid email address</small>
</label></code></pre>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `
<label>
  Email
  <input type="email" name="email" placeholder="Enter your email" aria-invalid="true">
  <small>Please enter a valid email address</small>
</label>
        `,
      },
    },
  },
};
