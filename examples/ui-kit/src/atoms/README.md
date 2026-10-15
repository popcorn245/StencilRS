# Atoms

## Purpose

Atoms are the basic, fundamental HTML elements. They are the smallest "building blocks" of your UI. In Pico.css, these are individual HTML tags that receive default, beautiful styling out of the box.

## What Are Atoms?

According to Atomic Design methodology, atoms include:

- **Typography**: Headings (`<h1>`-`<h6>`), paragraphs (`<p>`), links (`<a>`), text formatting (`<strong>`, `<em>`, `<small>`, `<mark>`, etc.)
- **Buttons**: `<button>`, `<a role="button">`, form submit buttons
- **Form Inputs**: Text inputs, email, password, textarea, select, checkboxes, radio buttons
- **Media**: Images, horizontal rules, basic table elements
- **Loading Indicators**: Spinners, skeleton screens, progress animations
- **Tooltips**: Enhanced hover/focus information displays

## When to Add Stories Here

Add stories to this folder when you're documenting:
- Single HTML elements with no child components
- Basic form inputs and controls
- Typography elements
- Simple media elements (img, hr)
- Elements that don't combine with other elements to form a functional unit

## Creating a New Atom Story

### Story Template

```typescript
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Atoms/[YourAtomName]',
  parameters: {
    docs: {
      description: {
        component:
          'Description of the atom and its purpose. <a href="https://picocss.com/docs/[relevant-page]">Pico CSS docs</a>',
      },
    },
  },
  argTypes: {
    // Define any interactive controls here
    text: { control: 'text' },
    disabled: { control: 'boolean' },
  },
};

export default meta;

type StoryArgs = {
  text: string;
  disabled?: boolean;
};

export const Default: StoryObj<StoryArgs> = {
  name: 'Default',
  render: (args) => `
    <element ${args.disabled ? 'disabled' : ''}>
      ${args.text}
    </element>
  `,
  args: {
    text: 'Example',
    disabled: false,
  },
  parameters: {
    docs: {
      source: {
        code: `<element>Example</element>`,
      },
    },
  },
};

export const Variants: StoryObj = {
  name: 'Variants',
  render: () => `
    <element>Variant 1</element>
    <element>Variant 2</element>
  `,
};
```

### Naming Conventions

- File names: `PascalCase.stories.ts` (e.g., `Button.stories.ts`, `Typography.stories.ts`)
- Story titles: `Atoms/YourName` (e.g., `Atoms/Button`)
- Export names: Descriptive of the variant (e.g., `Default`, `Primary`, `Disabled`, `Sizes`)

### Best Practices

1. **Keep it simple**: Atoms should showcase single elements, not combinations
2. **Show all variants**: Include different states (disabled, focused, error, etc.)
3. **Provide context**: Explain when to use each variant
4. **Link to Pico docs**: Include relevant Pico.css documentation links
5. **Use controls**: Add argTypes for interactive properties when useful
6. **Show semantic HTML**: Demonstrate proper HTML usage

### Examples

Reference existing atom stories:
- `Typography.stories.ts` - All text elements and formatting
- `Button.stories.ts` - Button elements and states
- `FormInputs.stories.ts` - Input fields and controls
- `Media.stories.ts` - Images and dividers

<!-- readme-gen start -->
**Purpose.** (no source files in this folder)

### Subfolders

- [`avatar/`](./avatar/README.md) — Atom for rendering a user avatar with customizable appearance
- [`button/`](./button/README.md) — Button component for email templates with customizable properties.
- [`card/`](./card/README.md) — Card atoms for the UI Kit
- [`chip/`](./chip/README.md) — Chip atom component and its styles
- [`columns/`](./columns/README.md) — Email column layout components
- [`divider/`](./divider/README.md) — Divider component and related files
- [`list-item/`](./list-item/README.md) — List item component
- [`nav-item/`](./nav-item/README.md) — Navigation item component
- [`progress-bar/`](./progress-bar/README.md) — Progress Bar Atom Component
- [`stat/`](./stat/README.md) — Stat component
- [`status-badge/`](./status-badge/README.md) — Status badge atoms
- [`toast/`](./toast/README.md) — Toast component implementation and types

[↑ Parent](../README.md)
<!-- readme-gen end -->
