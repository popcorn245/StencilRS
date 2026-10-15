# Foundations

## Purpose

This folder contains design tokens, configurations, and documentation that form the foundation of the UI kit. These are not components themselves, but rather the building blocks that inform how components are styled and organized.

## Contents

- **Design Tokens**: Colors, CSS Variables, Fonts, Light/Dark Mode
- **Documentation**: Atomic Design principles, Component Usage guides

## When to Add Stories Here

Add stories to this folder when you're documenting:
- Color palettes and color systems
- CSS custom properties and variables
- Typography scales and font families
- Theme configurations (light/dark mode)
- Design system principles
- General usage guidelines

## Creating a New Foundation Story

### Story Template

```typescript
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Foundations/[YourFoundationName]',
  parameters: {
    docs: {
      description: {
        component: 'Description of what this foundation element represents.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Default Example',
  render: () => `
    <!-- Your HTML here -->
  `,
  parameters: {
    docs: {
      source: {
        code: `<!-- Your code here -->`,
      },
    },
  },
};
```

### Naming Conventions

- File names: `PascalCase.stories.ts` (e.g., `CSSVariables.stories.ts`)
- Story titles: `Foundations/YourName` (e.g., `Foundations/Colors`)
- Export names: Descriptive of the variant (e.g., `Primary`, `Secondary`, `Scales`)

### Examples

Reference existing foundation stories:
- `Colors.stories.ts` - Color palette documentation
- `CSSVariables.stories.ts` - CSS custom properties
- `Fonts.stories.ts` - Typography system
- `LightAndDarkMode.stories.ts` - Theme switching
- `AtomicDesign.stories.ts` - Design methodology
- `ComponentUsage.stories.ts` - Usage guidelines

<!-- readme-gen start -->
**Purpose.** (no source files in this folder)

[↑ Parent](../README.md)
<!-- readme-gen end -->
