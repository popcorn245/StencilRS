import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/SearchFilter',
  parameters: {
    docs: {
      description: {
        component:
          'pop-search-filter — a search input with the funnel filter button INSIDE the field (right edge) and a leading search glyph (left edge). The funnel opens a popover of filter groups (tabs or selects) passed as a JSON `filters` prop; an active-filter dot shows when any group is non-default. Events: `searchChange` (debounced string), `filterChange` ({key,value}), `clearFilters`. Shared toolbar piece for the hub photos/tasks/inventory/images dialogs (usually via pop-list-filter-sort).',
      },
    },
  },
};

export default meta;

/** Mount in a dialog-width frame so the popover has room below. */
function frame(inner: string) {
  return `
    <div style="width: 380px; min-height: 320px; padding: 16px; border: 1px solid var(--line, #ddd); border-radius: 12px; background: var(--surface-card, #fff);">
      ${inner}
    </div>
  `;
}

const FILTERS = [
  {
    key: 'show',
    label: 'Show',
    kind: 'tabs',
    value: '',
    options: [
      { value: '', label: 'All' },
      { value: 'low', label: 'Low stock' },
      { value: 'grocery', label: 'On list' },
    ],
  },
  {
    key: 'category',
    label: 'Category',
    kind: 'select',
    value: '',
    options: [
      { value: '', label: 'All categories' },
      { value: 'Grocery', label: 'Grocery' },
      { value: 'Tools', label: 'Tools' },
      { value: 'Cleaning', label: 'Cleaning' },
    ],
  },
  {
    key: 'space',
    label: 'Space',
    kind: 'select',
    value: '',
    options: [
      { value: '', label: 'All spaces' },
      { value: 'pantry', label: '🥫 Pantry' },
      { value: 'garage', label: '🚗 Garage' },
    ],
  },
];

/** Search only — no filter groups, so no funnel. */
export const Default: StoryObj = {
  name: 'Default (search only)',
  render: () => frame(`<pop-search-filter placeholder="Search…"></pop-search-filter>`),
};

/** With tabs + select filter groups behind the funnel. */
export const WithFilters: StoryObj = {
  name: 'With filters',
  render: () =>
    frame(
      `<pop-search-filter placeholder="Search name, tag, UPC…" filters='${JSON.stringify(FILTERS).replace(/'/g, '&#39;')}' show-clear></pop-search-filter>`,
    ),
};

const ACTIVE = FILTERS.map((f) => (f.key === 'show' ? { ...f, value: 'low' } : f.key === 'category' ? { ...f, value: 'Grocery' } : f));

/** Non-default filter values — the funnel shows the active dot; popover offers Clear all. */
export const ActiveFilters: StoryObj = {
  name: 'Active filters (dot + clear all)',
  render: () =>
    frame(
      `<pop-search-filter value="paper towels" placeholder="Search name, tag, UPC…" filters='${JSON.stringify(ACTIVE).replace(/'/g, '&#39;')}' show-clear></pop-search-filter>`,
    ),
};

/** A host-owned widget rides the `input` slot; the funnel + popover chrome is
 *  kept as a static field-height sibling. The host owns the widget's
 *  value/events — searchChange only fires from the built-in input. */
export const CustomInputSlot: StoryObj = {
  name: 'Custom input (slot mode)',
  render: () =>
    frame(
      `<pop-search-filter filters='${JSON.stringify(FILTERS).replace(/'/g, '&#39;')}' show-clear>
        <input slot="input" placeholder="Host-owned widget (slot=input)…" style="width:100%;box-sizing:border-box;height:2.35rem;padding:0.45rem 0.7rem;border-radius:8px;border:1px dashed var(--accent,#6366f1);background:var(--surface-sunken,rgba(127,127,127,0.08));font:inherit;font-size:0.9rem;" />
      </pop-search-filter>`,
    ),
};

/** Groups whose at-rest value is NOT '' declare it via `default` — the dot and
 *  Clear all only engage when a value leaves its default (the tasks
 *  Group/Sort idiom); Clear all resets to defaults, not blanks. */
export const GroupDefaults: StoryObj = {
  name: 'Group defaults (tasks Group/Sort idiom)',
  render: () =>
    frame(
      `<pop-search-filter placeholder="Search tasks…" filters='${JSON.stringify([
        {
          key: 'group',
          label: 'Group',
          kind: 'select',
          value: 'date',
          default: 'date',
          options: [
            { value: 'none', label: 'None' },
            { value: 'date', label: 'Date' },
            { value: 'priority', label: 'Priority' },
          ],
        },
        {
          key: 'status',
          label: 'Status',
          kind: 'tabs',
          value: '',
          options: [
            { value: '', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'done', label: 'Done' },
          ],
        },
      ]).replace(/'/g, '&#39;')}' show-clear></pop-search-filter>`,
    ),
};
