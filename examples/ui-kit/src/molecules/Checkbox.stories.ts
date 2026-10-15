import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/Checkbox',
  parameters: {
    docs: {
      description: {
        component:
          'Checkbox input with label. <a href="https://picocss.com/docs/checkboxes">Pico CSS Checkboxes docs</a>',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Default Checkbox',
  render: () => `
    <label>
      <input type="checkbox" name="terms" />
      I agree to the terms and conditions
    </label>
  `,
};

export const Checked: StoryObj = {
  name: 'Checked',
  render: () => `
    <label>
      <input type="checkbox" name="subscribe" checked />
      Subscribe to newsletter
    </label>
  `,
};

export const Disabled: StoryObj = {
  name: 'Disabled',
  render: () => `
    <label>
      <input type="checkbox" name="disabled" disabled />
      Disabled checkbox
    </label>
    <label>
      <input type="checkbox" name="disabled-checked" checked disabled />
      Disabled checked checkbox
    </label>
  `,
};

export const MultipleCheckboxes: StoryObj = {
  name: 'Multiple Checkboxes',
  render: () => `
    <fieldset>
      <legend>Select your interests</legend>
      <label>
        <input type="checkbox" name="interests" value="design" />
        Design
      </label>
      <label>
        <input type="checkbox" name="interests" value="development" />
        Development
      </label>
      <label>
        <input type="checkbox" name="interests" value="marketing" />
        Marketing
      </label>
    </fieldset>
  `,
};
