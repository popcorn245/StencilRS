import type { Meta, StoryObj } from '@storybook/web-components';

/**
 * pop-budget-transaction-list — a presentation-only transaction table (organism)
 * with a client-side type filter (All / Income / Expenses), a search box, and
 * sortable Date / Name / Amount columns. The host owns the data + network; the
 * component displays the `transactions` it is handed and emits
 * `popTransactionEdit` / `popTransactionDelete` / `popAddTransaction`.
 * `transactions` is passed as a JSON-stringified attribute here; in an app it is
 * set as a property. Use the theme toolbar for dark.
 */
const meta: Meta = {
  title: 'Components/Organisms/BudgetTransactionList',
  argTypes: {
    loading: { control: 'boolean' },
  },
  parameters: {
    actions: { handles: ['popTransactionEdit', 'popTransactionDelete', 'popAddTransaction'] },
    docs: {
      description: {
        component:
          'pop-budget-transaction-list — a sortable, filterable transaction table. Presentation-only: the host hands it `transactions` (array or JSON string) and listens for popTransactionEdit / popTransactionDelete / popAddTransaction.',
      },
    },
  },
};

export default meta;

const transactions = [
  { id: '1', name: 'Paycheck — Acme Corp', date: '2026-07-15', amount: 3200, type: 'income', tags: ['salary'], source: 'Checking' },
  { id: '2', name: 'Whole Foods Market', date: '2026-07-14', amount: 86.42, type: 'expense', tags: ['groceries'], source: 'Visa' },
  { id: '3', name: 'Netflix', date: '2026-07-12', amount: 15.49, type: 'expense', tags: ['subscriptions', 'streaming'], source: 'Visa' },
  { id: '4', name: 'Shell Gas', date: '2026-07-11', amount: 52.1, type: 'expense', tags: ['auto'], source: 'Visa' },
  { id: '5', name: 'Interest', date: '2026-07-01', amount: 4.12, type: 'income', tags: ['interest'], source: 'Savings' },
];

/** Mounts the list in a bounded card with the supplied rows (JSON attr). */
function list(opts: { transactions?: unknown; loading?: boolean; hideToolbar?: boolean; width?: number }) {
  const json = opts.transactions != null ? JSON.stringify(opts.transactions).replace(/'/g, '&#39;') : '';
  return `
    <div style="max-width: ${opts.width ?? 640}px; padding: 16px; background: var(--surface-canvas, #eef3fb); border-radius: 16px;">
      <pop-budget-transaction-list
        ${opts.loading ? 'loading="true"' : ''}
        ${opts.hideToolbar ? 'hide-toolbar="true"' : ''}
        ${json ? `transactions='${json}'` : ''}
      ></pop-budget-transaction-list>
    </div>
  `;
}

/** Populated table (default). */
export const Default: StoryObj = {
  name: 'Default — populated',
  render: () => list({ transactions }),
};

/** Toolbar off (`hide-toolbar`) — how a host that owns filtering/search/add
 *  (e.g. the Bucket Hub) embeds it: just the list, no internal toolbar. */
export const ToolbarHidden: StoryObj = {
  name: 'Toolbar hidden (host-owned filters)',
  render: () => list({ transactions, hideToolbar: true }),
};

/** Sheet width (~360px) — verifies the table stays legible (and Tags/Actions
 *  drop) on a phone-sized surface with no horizontal overflow. */
export const Narrow: StoryObj = {
  name: 'Narrow (sheet ~360px)',
  render: () => list({ transactions, hideToolbar: true, width: 360 }),
};

/** Loading state. */
export const Loading: StoryObj = {
  name: 'Loading',
  render: () => list({ loading: true }),
};

/** No transactions handed in and not loading → the empty state. */
export const Empty: StoryObj = {
  name: 'Empty',
  render: () => list({ transactions: [] }),
};
