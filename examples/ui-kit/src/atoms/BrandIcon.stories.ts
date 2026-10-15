import type { Meta, StoryObj } from '@storybook/web-components';
import { ICON_NAMES } from './brand-icon/icons';

const meta: Meta = {
  title: 'Components/Atoms/BrandIcon',
  parameters: {
    docs: {
      description: {
        component:
          'A **self-contained, themeable SVG icon** atom. Unlike `pop-icon` (which wraps a CDN-loaded `ion-icon`), `pop-brand-icon` renders inline `<svg>` from a bundled registry, works offline, and inherits `currentColor` so it themes automatically. Replaces every emoji-as-icon across the notes-app "digital brain". Size it via the `size` prop, the `--size` custom property, or an ambient `font-size`.',
      },
    },
  },
};

export default meta;

const cell =
  'display:flex; flex-direction:column; align-items:center; gap:var(--size-1); font-size:0.7rem; color:var(--pico-muted-color); width:76px;';

export const AllIcons: StoryObj = {
  render: () => `
    <div style="padding: var(--size-6); background: var(--surface-canvas, #eef3fb); color: var(--ink, #1b2333);">
      <h3 style="margin-bottom: var(--size-4);">The full set</h3>
      <div style="display:flex; flex-wrap:wrap; gap:var(--size-4); font-size:1.6rem;">
        ${ICON_NAMES.map(
          (n) => `<span style="${cell}"><pop-brand-icon name="${n}"></pop-brand-icon><span>${n}</span></span>`,
        ).join('')}
      </div>
    </div>
  `,
};

export const Sizing: StoryObj = {
  render: () => `
    <div style="padding: var(--size-6); background: var(--surface-canvas, #eef3fb); color: var(--ink, #1b2333); display:flex; align-items:center; gap:var(--size-4);">
      <pop-brand-icon name="star" size="16px"></pop-brand-icon>
      <pop-brand-icon name="star" size="24px"></pop-brand-icon>
      <pop-brand-icon name="star" size="32px"></pop-brand-icon>
      <pop-brand-icon name="star" style="--size:48px;"></pop-brand-icon>
      <span style="font-size:2.5rem;">inherits <pop-brand-icon name="star"></pop-brand-icon></span>
    </div>
  `,
};

export const Themed: StoryObj = {
  render: () => `
    <div style="display:flex; gap:var(--size-4); font-size:1.75rem;">
      <span style="color: var(--brand-blue, #4299e1);"><pop-brand-icon name="link"></pop-brand-icon></span>
      <span style="color: var(--brand-red, #e53e3e);"><pop-brand-icon name="trash"></pop-brand-icon></span>
      <span style="color: var(--brand-violet, #8b5cf6);"><pop-brand-icon name="sparkles"></pop-brand-icon></span>
      <span style="color: #f0b429;"><pop-brand-icon name="star"></pop-brand-icon></span>
    </div>
  `,
};

export const AccessibleLabel: StoryObj = {
  render: () => `
    <div style="display:flex; gap:var(--size-4); font-size:2rem;">
      <pop-brand-icon name="trash" label="Delete item"></pop-brand-icon>
      <pop-brand-icon name="link" label="Link notes"></pop-brand-icon>
      <pop-brand-icon name="close" aria-hidden></pop-brand-icon>
    </div>
  `,
};
