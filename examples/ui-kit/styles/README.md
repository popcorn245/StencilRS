# Pico-Pollen Bridge Integration

This directory contains the bridge that connects Pollen CSS configuration to Pico CSS variables, allowing you to control Pico's design system through your `pollen.config.js` file.

## How It Works

The integration uses three layers:

1. **pollen.css** - Auto-generated from `pollen.config.js`, defines design tokens
2. **pico-pollen-bridge.css** - Maps Pollen variables to Pico CSS variables
3. **pico.css** - Uses the mapped variables for styling

### Import Order

The imports in `index.css` are ordered specifically:

```css
@import "pico.css";        /* 1. Pico's base styles with default variables */
@import "pollen.css";      /* 2. Your Pollen design tokens */
@import "pico-pollen-bridge.css"; /* 3. Bridge that maps Pollen → Pico */
@import "fonts.css";       /* 4. Custom fonts */
```

This order ensures that:
- Pico's base styles load first
- Pollen tokens override as needed
- The bridge maps Pollen tokens to Pico variables
- Custom fonts apply on top

## Customizing Colors

To change Pico's colors, edit `pollen.config.js`. For example, to change the primary color:

```js
modules: {
  color: {
    // Change blue to your brand color
    "blue-300": "#your-light-color",
    "blue-500": "#your-main-color",
    "blue-700": "#your-dark-color",
    blue: "var(--color-blue-500)",
  }
}
```

The bridge automatically maps these to:
- `--pico-primary`
- `--pico-primary-hover`
- `--pico-primary-background`
- And all other Pico primary color variants

## Mapped Variables

### Colors Mapped (Light Mode)
- Background: `--color-bg` → `--pico-background-color`
- Text: `--color-text` → `--pico-color`
- Primary: `--color-blue-*` → `--pico-primary-*`
- Secondary: `--color-grey-*` → `--pico-secondary-*`
- Success: `--color-green-*` → validation colors
- Error: `--color-red-*` → validation colors

### Colors Mapped (Dark Mode)
The same mappings apply, but automatically adapt to your dark mode configuration in `pollen.config.js`:

```js
media: {
  "(prefers-color-scheme: dark)": {
    color: {
      bg: "#your-dark-bg",
      text: "#your-dark-text",
      // ... other dark mode colors
    }
  }
}
```

### Typography Mapped
- Font families: `--font-sans` → `--pico-font-family`
- Font families: `--font-mono` → `--pico-font-family-monospace`

### Spacing Mapped
- Sizes: `--size-*` → `--pico-spacing`, `--pico-block-spacing-*`
- Border radius: `--radius-md` → `--pico-border-radius`

### Effects Mapped
- Shadows: `--shadow-md` → `--pico-box-shadow`, `--pico-card-box-shadow`
- Easing: `--ease-out-cubic` → used in `--pico-transition`

## Customizing the Bridge

If you need different mappings, edit `pico-pollen-bridge.css`. For example, to use a different primary color:

```css
[data-theme="light"],
:root:not([data-theme="dark"]) {
  /* Use purple instead of blue */
  --pico-primary: var(--color-purple);
  --pico-primary-background: var(--color-purple);
  --pico-primary-hover: var(--color-purple-700);
}
```

## Theme Switching

The bridge supports Pico's theme switching via `data-theme` attribute:

```html
<!-- Light mode (explicit) -->
<html data-theme="light">

<!-- Dark mode (explicit) -->
<html data-theme="dark">

<!-- Auto (follows system preference) -->
<html>
```

Your Pollen dark mode configuration will automatically apply when:
1. User has dark mode enabled in their system (auto)
2. You explicitly set `data-theme="dark"` (forced)

## Variables Reference

### Complete Pico Variables Mapped

**Color Variables:**
- Background & Text
- Primary colors (all states: default, hover, focus, inverse)
- Secondary colors (all states)
- Contrast colors (all states)
- Muted colors
- Heading colors (h1-h6)
- Form element colors
- Form validation colors
- Card & dropdown colors
- Code colors
- Table colors
- Accordion colors
- Progress colors
- Switch colors
- Range input colors

**Layout Variables:**
- Font families
- Border radius
- Spacing (block, typography, grid)
- Form element spacing
- Shadows
- Transitions
- Border widths

## Troubleshooting

### Colors not updating?
1. Make sure you run the build to regenerate `pollen.css` from your config
2. Check that the import order in `index.css` is correct
3. Clear your browser cache

### Custom Pico variable not working?
1. Check if it's mapped in `pico-pollen-bridge.css`
2. Add the mapping if needed
3. Ensure you're using the correct Pollen variable name

### Dark mode not working?
1. Verify your `pollen.config.js` has the dark mode media query
2. Check that your HTML doesn't have a forced `data-theme` attribute
3. Test with browser DevTools by toggling dark mode

## Examples

### Change Primary Color to Purple

In `pollen.config.js`:
```js
modules: {
  color: {
    // Define purple shades
    "purple-300": "#d6bcfa",
    "purple-500": "#9f7aea", 
    "purple-700": "#6b46c1",
    purple: "var(--color-purple-500)",
  }
}
```

In `pico-pollen-bridge.css`:
```css
[data-theme="light"],
:root:not([data-theme="dark"]) {
  --pico-primary: var(--color-purple);
  --pico-primary-background: var(--color-purple);
  --pico-primary-hover: var(--color-purple-700);
  /* ... other primary variants */
}
```

### Use Custom Border Radius

In `pollen.config.js` (already defined):
```js
modules: {
  radius: {
    "md": "8px", // Change this value
  }
}
```

The bridge automatically uses: `--pico-border-radius: var(--radius-md);`

### Custom Dark Mode Background

In `pollen.config.js`:
```js
media: {
  "(prefers-color-scheme: dark)": {
    color: {
      bg: "#0a0a0a", // Your custom dark background
      text: "#f0f0f0",
    }
  }
}
```

The bridge automatically maps these to Pico's dark mode variables.

## Benefits

✅ **Single Source of Truth**: Define colors once in `pollen.config.js`
✅ **Automatic Dark Mode**: Pollen's dark mode config controls Pico
✅ **Type-safe Tokens**: Use Pollen's design system across your app
✅ **Easy Customization**: Change one config file to restyle everything
✅ **Standards-based**: Uses CSS custom properties, no build step needed

<!-- readme-gen start -->
**Purpose.** (no source files in this folder)

[↑ Parent](../README.md)
<!-- readme-gen end -->
