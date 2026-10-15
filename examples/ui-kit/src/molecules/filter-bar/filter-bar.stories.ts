import type { Meta, StoryObj } from '@storybook/web-components';

const sortOptions = [
  { value: 'name-asc', label: 'Name A → Z' },
  { value: 'name-desc', label: 'Name Z → A' },
  { value: 'qty-desc', label: 'Qty (High → Low)' },
  { value: 'qty-asc', label: 'Qty (Low → High)' },
];

const classOptions = [
  { value: '', label: 'All Classes' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Clothing', label: 'Clothing' },
  { value: 'Food', label: 'Food' },
];

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'Container', label: 'Container' },
  { value: 'Accessory', label: 'Accessory' },
  { value: 'Consumable', label: 'Consumable' },
];

const sampleFilters = JSON.stringify([
  { id: 'sort', label: 'Sort', value: 'name-asc', defaultValue: 'name-asc', options: sortOptions },
  { id: 'class', label: 'Class', value: '', defaultValue: '', options: classOptions },
  { id: 'type', label: 'Type', value: '', defaultValue: '', options: typeOptions },
]);

const meta: Meta = {
  title: 'Components/Molecules/FilterBar',
  parameters: {
    docs: {
      description: {
        component:
          'A compact filter bar with a popover panel and dismissible chip badges for active filters. Pass filter definitions as JSON via the `filters` prop. Emits `popFilterChange` with `{ id, value }` on change.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Default (no active filters)',
  render: () => `
    <div style="padding: 1rem; background: var(--pico-background-color);">
      <pop-filter-bar filters='${sampleFilters}'></pop-filter-bar>
    </div>
  `,
};

export const WithActiveFilters: StoryObj = {
  name: 'With Active Filters',
  render: () => {
    const filtersWithActive = JSON.stringify([
      { id: 'sort', label: 'Sort', value: 'qty-desc', defaultValue: 'name-asc', options: sortOptions },
      { id: 'class', label: 'Class', value: 'Electronics', defaultValue: '', options: classOptions },
      { id: 'type', label: 'Type', value: '', defaultValue: '', options: typeOptions },
    ]);
    return `
    <div style="padding: 1rem; background: var(--pico-background-color);">
      <pop-filter-bar filters='${filtersWithActive}'></pop-filter-bar>
    </div>
    `;
  },
};

export const Interactive: StoryObj = {
  name: 'Interactive',
  render: () => `
    <div style="padding: 1rem; background: var(--pico-background-color);">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <pop-filter-bar id="demo-filter-bar" filters='${sampleFilters}' style="flex: 1;"></pop-filter-bar>
        <pop-view-toggle id="demo-toggle" value="card"></pop-view-toggle>
      </div>
      <pre id="event-log" style="margin-top: 1rem; font-size: 0.75rem; color: var(--pico-muted-color);">Events will appear here...</pre>
    </div>
    <script>
      const bar = document.getElementById('demo-filter-bar');
      const log = document.getElementById('event-log');
      bar.addEventListener('popFilterChange', (e) => {
        log.textContent = 'popFilterChange: ' + JSON.stringify(e.detail);
      });
    </script>
  `,
};

export const Usage: StoryObj = {
  name: 'Usage Guide',
  render: () => `
    <article>
      <h2>PopFilterBar Component</h2>
      <p>A compact filter bar that shows a popover panel with filter controls, and displays active filters as dismissible chips.</p>
      <h3>Basic Usage</h3>
      <pre><code>const filters = JSON.stringify([
  { id: 'sort', label: 'Sort', value: 'name-asc', defaultValue: 'name-asc', options: [
    { value: 'name-asc', label: 'A → Z' },
    { value: 'name-desc', label: 'Z → A' },
  ]},
  { id: 'class', label: 'Class', value: '', defaultValue: '', options: [
    { value: '', label: 'All Classes' },
    { value: 'Electronics', label: 'Electronics' },
  ]},
]);

const bar = document.querySelector('pop-filter-bar');
bar.setAttribute('filters', filters);
bar.addEventListener('popFilterChange', (e) => {
  console.log(e.detail); // { id: 'class', value: 'Electronics' }
});</code></pre>
      <h3>Props</h3>
      <table>
        <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>filters</code></td><td><code>string</code> (JSON)</td><td>Array of filter definitions</td></tr>
        </tbody>
      </table>
      <h3>Events</h3>
      <table>
        <thead><tr><th>Event</th><th>Detail</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>popFilterChange</code></td><td><code>{ id, value }</code></td><td>Fired when any filter changes or is dismissed</td></tr>
        </tbody>
      </table>
    </article>
  `,
};
