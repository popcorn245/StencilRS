# Molecules

## Purpose

Molecules are small, functional groups of atoms. They are the smallest components that have a distinct purpose. In Pico.css, molecules combine two or more atoms to create a cohesive, interactive unit.

## What Are Molecules?

According to Atomic Design methodology, molecules include:

- **Form Fields**: Label + input combinations
- **Checkboxes/Radios**: Input + label working as a single clickable unit
- **Switch Toggles**: Checkbox with role="switch" + label
- **Disclosure**: Single `<details>` element with `<summary>`
- **Progress Bars**: The `<progress>` element as a value display
- **Button Groups**: Multiple buttons grouped together with semantic meaning
- **Dropdowns**: Select elements with options

## When to Add Stories Here

Add stories to this folder when you're documenting:
- Combinations of 2-3 atoms that form a functional unit
- Form controls with their labels
- Interactive components that require atoms to work together
- Components that serve a single, specific purpose
- Reusable patterns that are more than one element but less than a full section

## Creating a New Molecule Story

### Story Template

```typescript
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Molecules/[YourMoleculeName]',
  parameters: {
    docs: {
      description: {
        component:
          'Description of the molecule and its purpose. <a href="https://picocss.com/docs/[relevant-page]">Pico CSS docs</a>',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    disabled: { control: 'boolean' },
  },
};

export default meta;

type StoryArgs = {
  label: string;
  disabled?: boolean;
};

export const Default: StoryObj<StoryArgs> = {
  name: 'Default',
  render: (args) => `
    <label for="example">
      ${args.label}
      <input type="text" id="example" ${args.disabled ? 'disabled' : ''}>
    </label>
  `,
  args: {
    label: 'Label',
    disabled: false,
  },
  parameters: {
    docs: {
      source: {
        code: `
<label for="example">
  Label
  <input type="text" id="example">
</label>
        `,
      },
    },
  },
};
```

### Naming Conventions

- File names: `PascalCase.stories.ts` (e.g., `FormField.stories.ts`, `Switch.stories.ts`)
- Story titles: `Molecules/YourName` (e.g., `Molecules/FormField`)
- Export names: Descriptive of the variant (e.g., `Default`, `WithError`, `Disabled`)

### Best Practices

1. **Show the relationship**: Demonstrate how atoms work together
2. **Include all states**: Show valid, invalid, disabled, focused states
3. **Demonstrate functionality**: Make interactive molecules actually work
4. **Provide accessibility info**: Explain proper labeling and ARIA attributes
5. **Link to Pico docs**: Include relevant Pico.css documentation links
6. **Keep it focused**: Don't combine too many different molecule types in one story

### Examples

Reference existing molecule stories:
- `FormField.stories.ts` - Label + input combinations
- `Checkbox.stories.ts` - Checkbox with label
- `Radio.stories.ts` - Radio buttons with labels
- `Switch.stories.ts` - Switch toggle component
- `Disclosure.stories.ts` - Single details/summary
- `Progress.stories.ts` - Progress bar element
- `Group.stories.ts` - Button groups
- `Dropdown.stories.ts` - Select dropdowns

<!-- readme-gen start -->
**Purpose.** (no source files in this folder)

### Subfolders

- [`address-autocomplete/`](./address-autocomplete/README.md) — Google Maps address autocomplete component
- [`bottom-sheet/`](./bottom-sheet/README.md) — BottomSheet molecule component and related styles
- [`carousel/`](./carousel/README.md) — Molecules: Carousel component
- [`chip-group/`](./chip-group/README.md) — Molecule components for the UI Kit
- [`chip-input/`](./chip-input/README.md) — Chip input molecule
- [`confirm-dialog/`](./confirm-dialog/README.md) — Confirm dialog molecule component
- [`date-time-picker/`](./date-time-picker/README.md) — Molecule-level components for the UI kit, including date and time pickers.
- [`empty-state/`](./empty-state/README.md) — Molecule components for the UI Kit
- [`file-preview/`](./file-preview/README.md) — Molecule for file preview and removal
- [`filter-bar/`](./filter-bar/README.md) — Filter bar component with popover and chip functionality
- [`form-dialog/`](./form-dialog/README.md) — Form dialog molecule with customizable title, description, and submit/cancel buttons
- [`gallery/`](./gallery/README.md) — Gallery component for displaying images in a scrollable and zoomable layout.
- [`message-actions/`](./message-actions/README.md) — Molecules for the UI kit's message actions component
- [`model-selector/`](./model-selector/README.md) — Molecules component for model selection
- [`nav-bar/`](./nav-bar/README.md) — Molecules: Nav Bar component
- [`quest-row/`](./quest-row/README.md) — Molecules: Quest Row component and related files
- [`radio-group/`](./radio-group/README.md) — Radio group component for short option sets, using pill-button style.
- [`tab-bar/`](./tab-bar/README.md) — Molecules: TabBar
- [`task-accordion/`](./task-accordion/README.md) — Molecule component for task detail editing
- [`task-item/`](./task-item/README.md) — Molecule component for displaying and editing tasks
- [`task-list/`](./task-list/README.md) — Molecules: Task List
- [`task-row/`](./task-row/README.md) — Molecules: Task Row component
- [`thread-summary/`](./thread-summary/README.md) — Thread summary molecule component
- [`view-toggle/`](./view-toggle/README.md) — Molecule component for view toggle functionality

[↑ Parent](../README.md)
<!-- readme-gen end -->
