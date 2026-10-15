import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/PanelFab',
  parameters: {
    docs: {
      description: {
        component:
          "pop-panel-fab — the bottom-right floating action button for a data panel, with an expanding tray for that panel's list controls (view switcher / search / filter-sort, slotted into `controls`). Set `action` for the panel's primary create verb; with both an action and controls the FAB shows the action plus a chevron that opens the tray, and with only one the FAB *is* that one thing (no disclosure control that reveals nothing). Positioned `absolute` against the nearest positioned ancestor — NOT fixed — because the hub's sheet and dialog tiers keep persistent CSS transforms that re-base fixed positioning. Safe-area inset is handled internally.",
      },
    },
  },
};

export default meta;

/** A panel-body stand-in: the positioning ancestor the FAB anchors to. */
function panel(inner: string, height = 260) {
  return `
    <div style="position: relative; width: 420px; height: ${height}px; padding: 16px;
                border: 1px solid var(--line, #ddd); border-radius: 16px;
                background: var(--surface-card, #fff); overflow: hidden;">
      <div style="opacity: .5; font-size: .85rem;">panel content</div>
      ${inner}
    </div>
  `;
}

/** The common case: a create verb plus a tray of list controls. */
export const ActionAndControls: StoryObj = {
  name: 'Action + list controls',
  render: () =>
    panel(`
      <pop-panel-fab action="Add recipe" icon="add">
        <pop-view-switcher slot="controls" views='["list","card"]' value="list"></pop-view-switcher>
        <pop-search-filter slot="controls" placeholder="Search recipes"></pop-search-filter>
      </pop-panel-fab>
    `),
};

/** No create verb — the FAB becomes the controls tray itself. */
export const ControlsOnly: StoryObj = {
  name: 'Controls only (no primary action)',
  render: () =>
    panel(`
      <pop-panel-fab>
        <pop-view-switcher slot="controls" views='["list","card","table"]' value="card"></pop-view-switcher>
      </pop-panel-fab>
    `),
};

/** No list to control — just the primary action, no chevron. */
export const ActionOnly: StoryObj = {
  name: 'Action only (no controls)',
  render: () => panel(`<pop-panel-fab action="New tag" icon="add" no-controls></pop-panel-fab>`),
};

/** Icon-only, for a cramped panel or a narrow sheet. */
export const Compact: StoryObj = {
  name: 'Compact (icon only)',
  render: () =>
    panel(`
      <pop-panel-fab action="Add item" icon="add" compact>
        <pop-view-switcher slot="controls" views='["list","card"]' value="list"></pop-view-switcher>
      </pop-panel-fab>
    `),
};

/** Disabled primary action — a busy panel or an unmet precondition. */
export const DisabledAction: StoryObj = {
  name: 'Disabled action',
  render: () => panel(`<pop-panel-fab action="Add item" icon="add" disabled no-controls></pop-panel-fab>`),
};
