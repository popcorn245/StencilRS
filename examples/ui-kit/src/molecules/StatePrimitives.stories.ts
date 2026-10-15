import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/State Primitives',
  parameters: {
    docs: {
      description: {
        component:
          'The shared empty / loading / error state primitives for the notes-app. `pop-loading-state` card-skeletons mirror the note-card silhouette (title + snippet + meta) so loading has the same shape as the content that replaces it.',
      },
    },
  },
};

export default meta;

const frame = 'padding:var(--size-6); background:var(--surface-canvas,#eef3fb); color:var(--ink,#1b2333);';

export const Empty: StoryObj = {
  render: () => `
    <div style="${frame}">
      <pop-empty-state icon-name="home" heading="Your brain is empty" message="Capture your first thought to get started." size="full"></pop-empty-state>
    </div>
  `,
};

export const LoadingSpinner: StoryObj = {
  render: () => `
    <div style="${frame}">
      <pop-loading-state variant="spinner" show-label="true" label="Building your brain…"></pop-loading-state>
    </div>
  `,
};

export const LoadingCardSkeleton: StoryObj = {
  render: () => `
    <div style="${frame} max-width:520px;">
      <pop-loading-state variant="card-skeleton" count="4"></pop-loading-state>
    </div>
  `,
};

export const LoadingGridSkeleton: StoryObj = {
  render: () => `
    <div style="${frame}">
      <pop-loading-state variant="card-skeleton" grid="true" count="6"></pop-loading-state>
    </div>
  `,
};

export const Error: StoryObj = {
  render: () => `
    <div style="${frame}">
      <pop-error-state heading="Couldn't reach your brain" message="Check your connection and try again." size="full" retryable="true"></pop-error-state>
    </div>
  `,
};
