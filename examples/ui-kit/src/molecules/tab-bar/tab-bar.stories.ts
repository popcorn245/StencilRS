import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/TabBar',
  parameters: {
    docs: {
      description: {
        component:
          'pop-tab-bar — the shared tab row. Tabs come in as a JSON `tabs` prop ({label, value, count?, icon?}); `popTabChange` fires with the picked value. Optional per-tab count bubbles ride after the label, and an optional ionicon rides before it. The `compact` variant is a CONTAINER query: when the bar itself is narrower than 480px, inactive iconed tabs collapse to icon + count (label visually hidden, still in the DOM for a11y) while the active tab keeps its label — five tabs fit a phone without horizontal scroll.',
      },
    },
  },
};

export default meta;

const INVENTORY_TABS = JSON.stringify([
  { label: 'Items', value: 'items', count: 42, icon: 'cube-outline' },
  { label: 'Containers', value: 'containers', count: 6, icon: 'file-tray-stacked-outline' },
  { label: 'Outfits', value: 'outfits', count: 3, icon: 'shirt-outline' },
  { label: 'Lists', value: 'lists', count: 9, icon: 'cart-outline' },
  { label: 'Cards', value: 'cards', count: 61, icon: 'albums-outline' },
]);

function frame(inner: string, width = 640) {
  return `
    <div style="width: ${width}px; max-width: 100%; padding: 12px; border: 1px solid var(--line, #ddd); border-radius: 12px; background: var(--surface-card, #fff);">
      ${inner}
    </div>
  `;
}

/** Plain labeled tabs with count bubbles (today's hub-inventory idiom). */
export const Counts: StoryObj = {
  render: () =>
    frame(`<pop-tab-bar tabs='${INVENTORY_TABS}' active-tab="items" scrollable></pop-tab-bar>`),
};

/** Icons ahead of the labels — full width, nothing collapsed. */
export const WithIcons: StoryObj = {
  render: () =>
    frame(`<pop-tab-bar tabs='${INVENTORY_TABS}' active-tab="cards" scrollable></pop-tab-bar>`),
};

/** The compact variant in a phone-width frame: inactive tabs are icon + count,
 *  only the active tab keeps its label. Resize the frame past 480px and the
 *  labels come back (container query, not viewport). */
export const CompactPhone: StoryObj = {
  render: () =>
    frame(`<pop-tab-bar tabs='${INVENTORY_TABS}' active-tab="items" compact scrollable></pop-tab-bar>`, 360),
};

/** Compact prop set but the bar is wide — labels stay (the query is on the
 *  bar's own width). */
export const CompactWide: StoryObj = {
  render: () =>
    frame(`<pop-tab-bar tabs='${INVENTORY_TABS}' active-tab="items" compact scrollable></pop-tab-bar>`, 640),
};
