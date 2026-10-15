import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/ViewSwitcher',
  parameters: {
    docs: {
      description: {
        component:
          'pop-view-switcher — the segmented list/card view toggle, generalized to any subset of list · card · kanban · table. Square icon buttons with centered pop-icons and aria-pressed; NO role=group (pico would stretch it). Controlled via `value`; emits `viewChange`. Shared toolbar piece for the hub photos/tasks/inventory/images dialogs (usually via pop-list-filter-sort).',
      },
    },
  },
};

export default meta;

function frame(inner: string) {
  return `
    <div style="width: 380px; padding: 16px; border: 1px solid var(--line, #ddd); border-radius: 12px; background: var(--surface-card, #fff); display: flex; gap: 12px; align-items: center;">
      ${inner}
    </div>
  `;
}

/** The classic two-view toggle (list ↔ card). */
export const TwoViews: StoryObj = {
  name: 'Two views (list/card)',
  render: () => frame(`<pop-view-switcher views='["list","card"]' value="list"></pop-view-switcher>`),
};

/** All four views. */
export const FourViews: StoryObj = {
  name: 'Four views (list/card/kanban/table)',
  render: () => frame(`<pop-view-switcher views='["list","card","kanban","table"]' value="kanban"></pop-view-switcher>`),
};
