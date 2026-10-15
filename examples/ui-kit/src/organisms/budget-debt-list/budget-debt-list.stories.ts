import type { Meta, StoryObj } from '@storybook/web-components';

/**
 * pop-budget-debt-list — a presentation-only debts panel (organism): a Total
 * Owed line plus a card per ACTIVE debt with a credit-utilization bar (when a
 * credit limit is known), APR / due / frequency meta, and an Edit button. The
 * host owns the data + network; the component displays the `debts` it is handed
 * and emits `popDebtEdit` / `popDebtAdd`. `debts` is passed as a
 * JSON-stringified attribute here; in an app it is set as a property. Use the
 * theme toolbar for dark.
 */
const meta: Meta = {
  title: 'Components/Organisms/BudgetDebtList',
  argTypes: {
    loading: { control: 'boolean' },
  },
  parameters: {
    actions: { handles: ['popDebtEdit', 'popDebtAdd'] },
    docs: {
      description: {
        component:
          'pop-budget-debt-list — a Total Owed line + a card per active debt (credit-utilization bar when a limit is known, APR / due / frequency meta). Presentation-only: the host hands it `debts` (array or JSON string) and listens for popDebtEdit / popDebtAdd. APR is a FRACTION (0.2874 → 28.7%).',
      },
    },
  },
};

export default meta;

const debts = [
  { id: '1', name: 'Best Buy Visa', amount: 1240.55, creditLimit: 3000, interestRate: 0.2874, billDue: '2026-08-10', frequency: 'monthly', status: 'active', person: 'Owner' },
  { id: '2', name: 'Chase Freedom', amount: 480.0, creditLimit: 5000, interestRate: 0.2649, billDue: '2026-08-15', frequency: 'monthly', status: 'active', person: 'Owner' },
  { id: '3', name: 'Car Loan', amount: 8600, interestRate: 0.049, billDue: '2026-08-01', frequency: 'monthly', status: 'active', person: 'Owner' },
];

/** Mounts the panel in a bounded card with the supplied debts (JSON attr). */
function list(opts: { debts?: unknown; loading?: boolean; hideToolbar?: boolean; width?: number }) {
  const json = opts.debts != null ? JSON.stringify(opts.debts).replace(/'/g, '&#39;') : '';
  return `
    <div style="max-width: ${opts.width ?? 640}px; padding: 16px; background: var(--surface-canvas, #eef3fb); border-radius: 16px;">
      <pop-budget-debt-list
        ${opts.loading ? 'loading="true"' : ''}
        ${opts.hideToolbar ? 'hide-toolbar="true"' : ''}
        ${json ? `debts='${json}'` : ''}
      ></pop-budget-debt-list>
    </div>
  `;
}

/** Populated cards (default). */
export const Default: StoryObj = {
  name: 'Default — populated',
  render: () => list({ debts }),
};

/** Toolbar off (`hide-toolbar`) — cards only, for a host that renders its own
 *  debt summary (so Total Owed isn't shown twice). */
export const ToolbarHidden: StoryObj = {
  name: 'Toolbar hidden (host-owned summary)',
  render: () => list({ debts, hideToolbar: true }),
};

/** Sheet width (~360px) — cards stack to one column without overflow. */
export const Narrow: StoryObj = {
  name: 'Narrow (sheet ~360px)',
  render: () => list({ debts, hideToolbar: true, width: 360 }),
};

/** Loading state. */
export const Loading: StoryObj = {
  name: 'Loading',
  render: () => list({ loading: true }),
};

/** No active debts handed in and not loading → the empty state. */
export const Empty: StoryObj = {
  name: 'Empty',
  render: () => list({ debts: [] }),
};
