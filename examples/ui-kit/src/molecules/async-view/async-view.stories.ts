import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Components/Molecules/AsyncView',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Declarative loading / empty / error / content states for any data-backed ' +
          'region. Pairs with `pop-sync-status` (freshness) — this shows lifecycle. ' +
          'All four regions stay mounted; `state` toggles visibility, so slotted ' +
          'content survives state flips (content stays mounted during revalidation ' +
          '— `loading` is for the cold hydrate only). Default error state emits ' +
          '`popRetry`.',
      },
    },
  },
  argTypes: {
    state: { control: 'radio', options: ['loading', 'empty', 'error', 'content'] },
  },
  args: { state: 'loading' },
};
export default meta;

const card = (inner: string) =>
  `<div style="width: 340px; padding: 1rem; border-radius: var(--radius-card, 22px); background: var(--surface-card, var(--pico-card-background-color)); color: var(--ink, inherit);">${inner}</div>`;

const CONTENT = `
  <ul style="margin: 0; padding-left: 1.1rem; font-size: 0.9rem;">
    <li>Grey Knight quest — step 3/7</li>
    <li>Water the tomatoes</li>
    <li>Ship the feature pipeline</li>
  </ul>`;

export const Playground: StoryObj = {
  render: (args) => {
    const host = document.createElement('div');
    host.innerHTML = card(`<pop-async-view state="${args.state}">${CONTENT}</pop-async-view>`);
    host.addEventListener('popRetry', () => console.log('popRetry'));
    return host;
  },
};

export const Loading: StoryObj = {
  render: () => card(`<pop-async-view state="loading"></pop-async-view>`),
};

export const Empty: StoryObj = {
  render: () => card(`<pop-async-view state="empty" empty-label="No NFC tags yet"></pop-async-view>`),
};

export const ErrorRetry: StoryObj = {
  name: 'Error + retry',
  render: () => {
    const host = document.createElement('div');
    host.innerHTML = card(
      `<pop-async-view state="error" error-label="Couldn’t load the calendar" retry-label="Try again"></pop-async-view>`,
    );
    host.addEventListener('popRetry', () => console.log('popRetry'));
    return host;
  },
};

export const Content: StoryObj = {
  render: () => card(`<pop-async-view state="content">${CONTENT}</pop-async-view>`),
};

export const CustomSlots: StoryObj = {
  name: 'Custom state slots',
  render: () =>
    card(`<pop-async-view state="loading">
      <div slot="loading" style="display:grid; gap:8px;">
        <div style="height:14px; border-radius:6px; background: var(--surface-sunken, #e8eef8);"></div>
        <div style="height:14px; width:70%; border-radius:6px; background: var(--surface-sunken, #e8eef8);"></div>
        <div style="height:14px; width:85%; border-radius:6px; background: var(--surface-sunken, #e8eef8);"></div>
      </div>
      ${CONTENT}
    </pop-async-view>`),
};

export const WithSyncStatus: StoryObj = {
  name: 'Paired with pop-sync-status',
  render: () =>
    card(`<pop-sync-status synced-at="${Date.now() - 2 * 60_000}"></pop-sync-status>
      <hr style="margin: 0.6rem 0;" />
      <pop-async-view state="content">${CONTENT}</pop-async-view>`),
};
