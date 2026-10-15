import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Accordion',
  parameters: {
    docs: {
      description: {
        component:
          'Toggle sections of content in pure HTML, without JavaScript, using minimal and semantic markup. <a href="https://picocss.com/docs/accordion">Pico CSS Accordion docs</a>',
      },
    },
  },
  argTypes: {
    open: { control: 'boolean' },
  },
};

export default meta;

type AccordionArgs = {
  open: boolean;
};

export const Default: StoryObj<AccordionArgs> = {
  name: 'Default Accordion',
  render: (args: AccordionArgs) => `
    <details open=${args.open}>
      <summary>Accordion 1</summary>
      <p>Content for accordion 1</p>
    </details>
    <details open=${args.open}>
      <summary>Accordion 2</summary>
      <p>Content for accordion 2</p>
    </details>
  `,
  args: {
    open: true,
  },
  parameters: {
    docs: {
      source: {
        code: `<details open>
  <summary>Accordion 1</summary>
  <p>Content for accordion 1</p>
</details>
<details open>
  <summary>Accordion 2</summary>
  <p>Content for accordion 2</p>
</details>`,
      },
    },
  },
};

export const ButtonVariants: StoryObj = {
  name: 'Button Variants',
  render: () => `
    <details>
      <summary role="button">Button</summary>
      <p>Content for button</p>
    </details>
    <details>
      <summary role="button" class="secondary">
        Secondary
      </summary>
      <p>Content for secondary</p>
    </details>
    <details>
      <summary role="button" class="contrast">
        Contrast
      </summary>
      <p>Content for contrast</p>
    </details>
    <details>
      <summary role="button" class="outline">
        Primary outline
      </summary>
      <p>Content for primary outline</p>
    </details>
    <details>
      <summary role="button" class="secondary outline">
        Secondary outline
      </summary>
      <p>Content for secondary outline</p>
    </details>
    <details>
      <summary role="button" class="contrast outline">
        Contrast outline
      </summary>
      <p>Content for contrast outline</p>
    </details>
  `,
  parameters: {
    docs: {
      source: {
        code: `<details>
  <summary role="button">Button</summary>
  <p>Content for button</p>
</details>
<details>
  <summary role="button" class="secondary">Secondary</summary>
  <p>Content for secondary</p>
</details>
<details>
  <summary role="button" class="contrast">Contrast</summary>
  <p>Content for contrast</p>
</details>`,
      },
    },
  },
};
