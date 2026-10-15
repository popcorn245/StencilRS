import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Atoms/Icon',
  parameters: {
    docs: {
      description: {
        component:
          'A perfectly-centered icon atom that wraps `ion-icon`. Renders as a centered inline-flex block with `line-height: 0`, so the glyph never picks up inline/baseline offset. Size it via CSS `font-size`, the `--size` custom property, or the `size` prop.',
      },
    },
  },
};

export default meta;

const row = 'display:flex; align-items:center; gap:var(--size-4); flex-wrap:wrap;';

export const NamedIcons: StoryObj = {
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h3 style="margin-bottom: var(--size-4);">Named icons</h3>
      <div style="${row} font-size: 1.75rem;">
        <pop-icon name="close"></pop-icon>
        <pop-icon name="checkmark"></pop-icon>
        <pop-icon name="add"></pop-icon>
        <pop-icon name="heart"></pop-icon>
        <pop-icon name="star"></pop-icon>
        <pop-icon name="settings-outline"></pop-icon>
      </div>
    </div>
  `,
};

export const SizingViaFontSize: StoryObj = {
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h3 style="margin-bottom: var(--size-4);">Sizing via inherited font-size</h3>
      <p style="margin-bottom: var(--size-4); color: var(--pico-muted-color);">
        When no <code>size</code> prop is set, the icon inherits <code>1em</code> from the
        cascade, so it tracks the surrounding text size.
      </p>
      <div style="${row}">
        <span style="font-size: 0.875rem;">small <pop-icon name="star"></pop-icon></span>
        <span style="font-size: 1.5rem;">medium <pop-icon name="star"></pop-icon></span>
        <span style="font-size: 2.5rem;">large <pop-icon name="star"></pop-icon></span>
      </div>
      <h4 style="margin: var(--size-5) 0 var(--size-3);">Via the <code>--size</code> custom property</h4>
      <div style="${row}">
        <pop-icon name="heart" style="--size: 1rem;"></pop-icon>
        <pop-icon name="heart" style="--size: 2rem;"></pop-icon>
        <pop-icon name="heart" style="--size: 3rem;"></pop-icon>
      </div>
    </div>
  `,
};

export const SizingViaSizeProp: StoryObj = {
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h3 style="margin-bottom: var(--size-4);">Sizing via the <code>size</code> prop</h3>
      <div style="${row}">
        <pop-icon name="add" size="16px"></pop-icon>
        <pop-icon name="add" size="1.5rem"></pop-icon>
        <pop-icon name="add" size="32px"></pop-icon>
        <pop-icon name="add" size="3rem"></pop-icon>
      </div>
    </div>
  `,
};

export const AccessibleLabel: StoryObj = {
  render: () => `
    <div style="padding: var(--size-6); background: var(--color-bg); color: var(--color-text);">
      <h3 style="margin-bottom: var(--size-4);">Accessible (labeled) variant</h3>
      <p style="margin-bottom: var(--size-4); color: var(--pico-muted-color);">
        With a <code>label</code>, the icon exposes <code>role="img"</code> +
        <code>aria-label</code>. Without one it is <code>aria-hidden</code> (decorative).
      </p>
      <div style="${row} font-size: 2rem;">
        <pop-icon name="trash" label="Delete item"></pop-icon>
        <pop-icon name="download" label="Download"></pop-icon>
        <pop-icon name="close" aria-hidden></pop-icon>
      </div>
    </div>
  `,
};
