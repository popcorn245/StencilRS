import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Atoms/Button',
  parameters: {
    docs: {
      description: {
        component:
          'Button elements with various states and styles. <a href="https://picocss.com/docs/button">Pico CSS Button docs</a>',
      },
    },
  },
};

export default meta;

export const ButtonElement: StoryObj = {
  name: 'Button Element',
  render: () => `
    <button>Button</button>
    <button class="secondary">Secondary</button>
    <button class="contrast">Contrast</button>
  `,
};

export const LinkAsButton: StoryObj = {
  name: 'Link as Button',
  render: () => `
    <a href="#" role="button">Link Button</a>
    <a href="#" role="button" class="secondary">Secondary</a>
    <a href="#" role="button" class="contrast">Contrast</a>
  `,
};

export const InputButtons: StoryObj = {
  name: 'Input Buttons',
  render: () => `
    <input type="submit" value="Submit">
    <input type="button" value="Button">
    <input type="reset" value="Reset">
  `,
};

export const OutlineButtons: StoryObj = {
  name: 'Outline Buttons',
  render: () => `
    <button class="outline">Primary Outline</button>
    <button class="outline secondary">Secondary Outline</button>
    <button class="outline contrast">Contrast Outline</button>
  `,
};

export const ButtonStates: StoryObj = {
  name: 'Button States',
  render: () => `
    <button>Normal</button>
    <button disabled>Disabled</button>
    <button aria-busy="true">Loading</button>
  `,
};
