# Organisms

## Purpose

Organisms are more complex components made of molecules and atoms. They form a distinct, standalone section of an interface. Organisms are substantial enough to stand on their own as meaningful sections of a user interface.

## What Are Organisms?

According to Atomic Design methodology, organisms include:

- **Cards**: The `<article>` element with header, body, and footer
- **Modals**: The `<dialog>` element with title, content, and actions
- **Navigation**: The `<nav>` element with logo and links
- **Accordion Groups**: Multiple `<details>` elements working together
- **Complete Tables**: Full data tables with thead and tbody
- **Grid Layouts**: Sections using Pico's grid class to organize content

## When to Add Stories Here

Add stories to this folder when you're documenting:
- Complex components that combine multiple molecules and atoms
- Standalone UI sections that could exist independently on a page
- Components with significant internal structure
- Layout patterns that organize multiple components
- Components that represent a complete feature or interaction

## Creating a New Organism Story

### Story Template

```typescript
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Organisms/[YourOrganismName]',
  parameters: {
    docs: {
      description: {
        component:
          'Description of the organism and its purpose. <a href="https://picocss.com/docs/[relevant-page]">Pico CSS docs</a>',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    showFooter: { control: 'boolean' },
  },
};

export default meta;

type StoryArgs = {
  title: string;
  showFooter?: boolean;
};

export const Default: StoryObj<StoryArgs> = {
  name: 'Default',
  render: (args) => `
    <article>
      <header>${args.title}</header>
      <p>Content goes here</p>
      ${args.showFooter ? '<footer>Footer content</footer>' : ''}
    </article>
  `,
  args: {
    title: 'Example Title',
    showFooter: true,
  },
  parameters: {
    docs: {
      source: {
        code: `
<article>
  <header>Example Title</header>
  <p>Content goes here</p>
  <footer>Footer content</footer>
</article>
        `,
      },
    },
  },
};
```

### Naming Conventions

- File names: `PascalCase.stories.ts` (e.g., `Card.stories.ts`, `Modal.stories.ts`)
- Story titles: `Organisms/YourName` (e.g., `Organisms/Card`)
- Export names: Descriptive of the variant (e.g., `Default`, `WithImage`, `Complex`)

### Best Practices

1. **Show composition**: Demonstrate how molecules and atoms combine
2. **Include variants**: Show different configurations and layouts
3. **Demonstrate real use cases**: Use realistic content and examples
4. **Explain structure**: Document the semantic HTML structure
5. **Link to Pico docs**: Include relevant Pico.css documentation links
6. **Consider responsiveness**: Show how organisms adapt to different viewports
7. **Test interactivity**: Ensure interactive organisms function properly

### Examples

Reference existing organism stories:
- `Card.stories.ts` - Article elements with sections
- `Modal.stories.ts` - Dialog elements
- `Nav.stories.ts` - Navigation components
- `Accordion.stories.ts` - Accordion groups
- `Table.stories.ts` - Complete data tables
- `Grid.stories.ts` - Grid layout systems

<!-- readme-gen start -->
**Purpose.** (no source files in this folder)

### Subfolders

- [`action-picker/`](./action-picker/README.md) — Action picker component with customizable actions and types
- [`ai-block/`](./ai-block/README.md) — Organisms for the UI Kit's AI-related components.
- [`ai-chat/`](./ai-chat/README.md) — Organisms for the UI Kit, containing the Pop AI Chat component
- [`budget-bill-list/`](./budget-bill-list/README.md) — Organisms for the UI Kit: Budget Bill List component
- [`budget-debt-list/`](./budget-debt-list/README.md) — Budget debt list component and related utilities.
- [`budget-transaction-list/`](./budget-transaction-list/README.md) — Organisms for the UI Kit, including the Budget Transaction List component.
- [`cafeteria-panel/`](./cafeteria-panel/README.md) — Cafeteria Panel component and related utilities
- [`celebration/`](./celebration/README.md) — Celebration component files
- [`chat/`](./chat/README.md) — Chat component with features like infinite scrolling, message editing, and deletion.
- [`chat-toolbar/`](./chat-toolbar/README.md) — Chat toolbar component with customizable tools and models
- [`community-chat/`](./community-chat/README.md) — Community chat component with features like message sending and loading history
- [`conflict-resolver/`](./conflict-resolver/README.md) — Conflict resolver component for UI Kit
- [`editor/`](./editor/README.md) — Folder editor.
- [`event-planner/`](./event-planner/README.md) — Event Planner component and related files
- [`file-mention/`](./file-mention/README.md) — File mention component implementation
- [`firebase-auth/`](./firebase-auth/README.md) — Firebase Auth UI component
- [`intent-actions/`](./intent-actions/README.md) — Intent actions component
- [`kanban/`](./kanban/README.md) — Kanban board component and related utilities
- [`mention-input/`](./mention-input/README.md) — MentionInput component implementation
- [`message/`](./message/README.md) — Message component with editing and thread functionality.
- [`message-box/`](./message-box/README.md) — PopMessageBox component implementation
- [`message-bubble/`](./message-bubble/README.md) — Message bubble component with customizable layout and features
- [`poll/`](./poll/README.md) — Poll component files
- [`popcoin-counter/`](./popcoin-counter/README.md) — Popcoin Counter component with customizable display format and confetti effects
- [`quest-card/`](./quest-card/README.md) — Contains the PopQuestCard component implementation
- [`recurrence-editor/`](./recurrence-editor/README.md) — Recurrence Editor component
- [`research-message/`](./research-message/README.md) — Deprecated message display component
- [`ring-menu/`](./ring-menu/README.md) — Ring menu component with customizable items and actions.
- [`routine-step/`](./routine-step/README.md) — Organisms for the UI Kit's Routine feature
- [`search/`](./search/README.md) — Search component with features like live filtering and AI chat integration
- [`Sidebar/`](./Sidebar/README.md) — Sidebar component with toggle and overlay functionality
- [`slideshow/`](./slideshow/README.md) — Slideshow component implementation and tests
- [`space-picker/`](./space-picker/README.md) — Space Picker Organism
- [`split-pane/`](./split-pane/README.md) — Layout primitives for split panes
- [`swipe-cards/`](./swipe-cards/README.md) — Swipe cards component and its tests
- [`tabbed-chat/`](./tabbed-chat/README.md) — Tabbed chat UI component implementation
- [`task-quick-add/`](./task-quick-add/README.md) — Quick add task component with quest selection and due date input
- [`token-pill/`](./token-pill/README.md) — Token Pill UI component
- [`voice-recorder/`](./voice-recorder/README.md) — Voice recorder component with customizable visual mode and playback features

[↑ Parent](../README.md)
<!-- readme-gen end -->
