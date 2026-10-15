import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/ListFilterSort',
  parameters: {
    docs: {
      description: {
        component:
          'pop-list-filter-sort — the drop-in header row for list dialogs: pop-search-filter (flex:1) + pop-view-switcher (flex:0) + a named `actions` slot for dialog-specific extras. Pass-through props (value, placeholder, filters, debounce, showClear, views, view); re-emits searchChange / filterChange / clearFilters / viewChange from its own host. Expected adopters: hub inventory (done), photos/images, tasks.',
      },
    },
  },
};

export default meta;

function frame(inner: string) {
  return `
    <div style="width: 420px; min-height: 340px; padding: 16px; border: 1px solid var(--line, #ddd); border-radius: 12px; background: var(--surface-card, #fff);">
      ${inner}
    </div>
  `;
}

const INVENTORY_FILTERS = [
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

/** Inventory-like example: Show/Category/Space filters + list/card views. */
export const Inventory: StoryObj = {
  name: 'Inventory-like (filters + list/card)',
  render: () =>
    frame(
      `<pop-list-filter-sort placeholder="Search name, tag, UPC…" filters='${JSON.stringify(INVENTORY_FILTERS).replace(/'/g, '&#39;')}' views='["list","card"]' view="list" show-clear></pop-list-filter-sort>`,
    ),
};

const TASKS_FILTERS = [
  {
    key: 'group',
    label: 'Group',
    kind: 'select',
    value: 'date',
    default: 'date',
    options: [
      { value: 'none', label: 'None' },
      { value: 'date', label: 'Date' },
      { value: 'status', label: 'Status' },
      { value: 'priority', label: 'Priority' },
    ],
  },
  {
    key: 'sort',
    label: 'Sort',
    kind: 'select',
    value: 'dueDate',
    default: 'dueDate',
    options: [
      { value: 'dueDate', label: 'Due date' },
      { value: 'priority', label: 'Priority' },
      { value: 'title', label: 'A–Z' },
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
];

/** Tasks-like: a host-owned widget in the `input` slot (passed through to
 *  pop-search-filter), Group/Sort selects with `default` values + Status tabs
 *  behind the funnel, and NO view switcher (`views="[]"`). */
export const TasksLike: StoryObj = {
  name: 'Tasks-like (input slot, no view switcher)',
  render: () =>
    frame(
      `<pop-list-filter-sort filters='${JSON.stringify(TASKS_FILTERS).replace(/'/g, '&#39;')}' views='[]' show-clear>
        <input slot="input" placeholder="Add a task…  @today  #tag" style="width:100%;box-sizing:border-box;height:2.35rem;padding:0.45rem 0.7rem;border-radius:8px;border:1px dashed var(--accent,#6366f1);background:var(--surface-sunken,rgba(127,127,127,0.08));font:inherit;font-size:0.9rem;" />
      </pop-list-filter-sort>`,
    ),
};

/** Search-only: no filters (funnel auto-hides) and no views — just the field. */
export const SearchOnly: StoryObj = {
  name: 'Search only (no funnel, no views)',
  render: () => frame(`<pop-list-filter-sort placeholder="Search your library…" filters='[]' views='[]'></pop-list-filter-sort>`),
};

/** With a dialog-specific extra in the actions slot. */
export const WithActions: StoryObj = {
  name: 'With actions slot',
  render: () =>
    frame(
      `<pop-list-filter-sort placeholder="Search…" filters='${JSON.stringify(INVENTORY_FILTERS).replace(/'/g, '&#39;')}' views='["list","card","kanban","table"]' view="table">
        <button slot="actions" aria-label="Add item" title="Add item" style="display:inline-flex;align-items:center;justify-content:center;width:2.1rem;height:2.1rem;padding:0;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--surface-card,#fff);cursor:pointer;line-height:0;">
          <pop-icon name="add"></pop-icon>
        </button>
      </pop-list-filter-sort>`,
    ),
};
