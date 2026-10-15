import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Molecules/SyncStatus',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A compact "Last synced <relative>" row + refresh button for cache-first ' +
          'data panels. The relative label auto-updates (~30s); the refresh icon ' +
          'spins while `loading`. Emits `popRefresh` on tap.',
      },
    },
  },
};
export default meta;

const wrap = (inner: string) =>
  `<div style="width: 300px; padding: 1.25rem; background: var(--pico-background-color);">${inner}</div>`;
const minsAgo = (n: number) => String(Date.now() - n * 60_000);

export const JustNow: StoryObj = {
  render: () => wrap(`<pop-sync-status synced-at="${Date.now()}"></pop-sync-status>`),
};
export const MinutesAgo: StoryObj = {
  name: '2m ago',
  render: () => wrap(`<pop-sync-status synced-at="${minsAgo(2)}"></pop-sync-status>`),
};
export const HoursAgo: StoryObj = {
  name: '3h ago',
  render: () => wrap(`<pop-sync-status synced-at="${minsAgo(180)}"></pop-sync-status>`),
};
export const Never: StoryObj = {
  render: () => wrap(`<pop-sync-status></pop-sync-status>`),
};
export const Loading: StoryObj = {
  name: 'Refreshing (spinning)',
  render: () => wrap(`<pop-sync-status synced-at="${minsAgo(2)}" loading="true"></pop-sync-status>`),
};
