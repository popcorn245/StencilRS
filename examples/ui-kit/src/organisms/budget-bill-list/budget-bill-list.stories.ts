import type { Meta, StoryObj } from '@storybook/web-components';

/**
 * pop-budget-bill-list — a presentation-only bills table (organism) with a
 * view toggle (Active / Monthly / Yearly / All) and a status badge per row. The
 * host owns the data + network; the component displays the `bills` it is handed
 * and emits `popBillEdit` / `popBillAdd`. `bills` is passed as a
 * JSON-stringified attribute here; in an app it is set as a property. Use the
 * theme toolbar for dark.
 */
const meta: Meta = {
  title: 'Components/Organisms/BudgetBillList',
  argTypes: {
    loading: { control: 'boolean' },
  },
  parameters: {
    actions: { handles: ['popBillEdit', 'popBillAdd'] },
    docs: {
      description: {
        component:
          'pop-budget-bill-list — a bills table with an Active / Monthly / Yearly / All view toggle and per-row status badges. Presentation-only: the host hands it `bills` (array or JSON string) and listens for popBillEdit / popBillAdd.',
      },
    },
  },
};

export default meta;

const bills = [
  { id: '1', name: 'Rent', amountTotal: 1850, billDue: '2026-08-01', frequency: 'monthly', status: 'active', billee: 'Landlord', tags: ['housing'] },
  { id: '2', name: 'Electric', amountTotal: 132.5, billDue: '2026-08-05', frequency: 'monthly', status: 'active', billee: 'Ameren', tags: ['utilities'] },
  { id: '3', name: 'Car Insurance', amountTotal: 720, billDue: '2026-12-01', frequency: 'yearly', status: 'active', billee: 'Geico', tags: ['auto'] },
  { id: '4', name: 'Water', amountTotal: 44.2, billDue: '2026-07-01', frequency: 'monthly', status: 'paid', billee: 'City', tags: ['utilities'] },
];

/** Mounts the list in a bounded card with the supplied bills (JSON attr). */
function list(opts: { bills?: unknown; loading?: boolean; hideToolbar?: boolean; width?: number }) {
  const json = opts.bills != null ? JSON.stringify(opts.bills).replace(/'/g, '&#39;') : '';
  return `
    <div style="max-width: ${opts.width ?? 640}px; padding: 16px; background: var(--surface-canvas, #eef3fb); border-radius: 16px;">
      <pop-budget-bill-list
        ${opts.loading ? 'loading="true"' : ''}
        ${opts.hideToolbar ? 'hide-toolbar="true"' : ''}
        ${json ? `bills='${json}'` : ''}
      ></pop-budget-bill-list>
    </div>
  `;
}

/** Populated table (default — the Active view). */
export const Default: StoryObj = {
  name: 'Default — populated',
  render: () => list({ bills }),
};

/** Toolbar off (`hide-toolbar`) — the list only, for a host that owns the view
 *  tabs / add flow. */
export const ToolbarHidden: StoryObj = {
  name: 'Toolbar hidden (host-owned controls)',
  render: () => list({ bills, hideToolbar: true }),
};

/** Sheet width (~360px). */
export const Narrow: StoryObj = {
  name: 'Narrow (sheet ~360px)',
  render: () => list({ bills, width: 360 }),
};

/** Loading state. */
export const Loading: StoryObj = {
  name: 'Loading',
  render: () => list({ loading: true }),
};

/** No bills handed in and not loading → the empty state. */
export const Empty: StoryObj = {
  name: 'Empty',
  render: () => list({ bills: [] }),
};
