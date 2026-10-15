import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/Switch',
  parameters: {
    docs: {
      description: {
        component:
          'Switch toggle component using checkbox with role="switch". <a href="https://picocss.com/docs/switch">Pico CSS Switch docs</a>',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Default Switch',
  render: () => `
    <label>
      <input type="checkbox" role="switch" />
      Enable notifications
    </label>
  `,
  parameters: {
    docs: {
      source: {
        code: `<label>
  <input type="checkbox" role="switch">
  Enable notifications
</label>`,
      },
    },
  },
};

export const Checked: StoryObj = {
  name: 'Checked Switch',
  render: () => `
    <label>
      <input type="checkbox" role="switch" checked />
      Dark mode enabled
    </label>
  `,
  parameters: {
    docs: {
      source: {
        code: `<label>
  <input type="checkbox" role="switch" checked>
  Dark mode enabled
</label>`,
      },
    },
  },
};

export const Disabled: StoryObj = {
  name: 'Disabled Switch',
  render: () => `
    <label>
      <input type="checkbox" role="switch" disabled />
      Disabled switch
    </label>
    <label>
      <input type="checkbox" role="switch" checked disabled />
      Disabled checked switch
    </label>
  `,
  parameters: {
    docs: {
      source: {
        code: `<label>
  <input type="checkbox" role="switch" disabled>
  Disabled switch
</label>
<label>
  <input type="checkbox" role="switch" checked disabled>
  Disabled checked switch
</label>`,
      },
    },
  },
};

export const MultipleSwitches: StoryObj = {
  name: 'Multiple Switches',
  render: () => `
    <fieldset>
      <legend>Privacy Settings</legend>
      <label>
        <input type="checkbox" role="switch" checked />
        Show profile publicly
      </label>
      <label>
        <input type="checkbox" role="switch" />
        Allow messages from anyone
      </label>
      <label>
        <input type="checkbox" role="switch" checked />
        Email notifications
      </label>
    </fieldset>
  `,
  parameters: {
    docs: {
      source: {
        code: `<fieldset>
  <legend>Privacy Settings</legend>
  <label>
    <input type="checkbox" role="switch" checked>
    Show profile publicly
  </label>
  <label>
    <input type="checkbox" role="switch">
    Allow messages from anyone
  </label>
  <label>
    <input type="checkbox" role="switch" checked>
    Email notifications
  </label>
</fieldset>`,
      },
    },
  },
};
