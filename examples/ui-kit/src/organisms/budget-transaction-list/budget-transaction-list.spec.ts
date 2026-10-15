import { newSpecPage } from '../../test-utils/spec-page';
import { PopBudgetTransactionList } from './budget-transaction-list';

const transactions = [
  { id: '1', name: 'Paycheck', date: '2026-07-15', amount: 3200, type: 'income', tags: ['salary'], source: 'Checking' },
  { id: '2', name: 'Whole Foods', date: '2026-07-14', amount: 86.42, type: 'expense', tags: ['groceries'], source: 'Visa' },
];

const asAttr = (o: unknown) => JSON.stringify(o).replace(/"/g, '&quot;');

describe('pop-budget-transaction-list', () => {
  it('renders a row per transaction (from a JSON-string attribute)', async () => {
    const page = await newSpecPage({
      components: [PopBudgetTransactionList],
      html: `<pop-budget-transaction-list transactions="${asAttr(transactions)}"></pop-budget-transaction-list>`,
    });
    const rows = page.root.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(page.root.querySelector('.name')?.textContent).toContain('Paycheck');
  });

  it('hides the internal toolbar when hide-toolbar is set', async () => {
    const shown = await newSpecPage({
      components: [PopBudgetTransactionList],
      html: `<pop-budget-transaction-list transactions="${asAttr(transactions)}"></pop-budget-transaction-list>`,
    });
    expect(shown.root.querySelector('.toolbar')).not.toBeNull();
    expect(shown.root.querySelector('.search-input')).not.toBeNull();

    const hidden = await newSpecPage({
      components: [PopBudgetTransactionList],
      html: `<pop-budget-transaction-list hide-toolbar="true" transactions="${asAttr(transactions)}"></pop-budget-transaction-list>`,
    });
    expect(hidden.root.querySelector('.toolbar')).toBeNull();
    expect(hidden.root.querySelector('.search-input')).toBeNull();
    // the list itself still renders
    expect(hidden.root.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('shows the empty state when handed no rows', async () => {
    const page = await newSpecPage({
      components: [PopBudgetTransactionList],
      html: `<pop-budget-transaction-list transactions="[]"></pop-budget-transaction-list>`,
    });
    expect(page.root.querySelector('.empty')?.textContent).toContain('No transactions');
  });

  it('emits popAddTransaction when the Add button is tapped', async () => {
    const page = await newSpecPage({
      components: [PopBudgetTransactionList],
      html: `<pop-budget-transaction-list transactions="${asAttr(transactions)}"></pop-budget-transaction-list>`,
    });
    let fired = 0;
    page.root.addEventListener('popAddTransaction', () => fired++);
    (page.root.querySelector('.add-btn') as HTMLButtonElement).click();
    expect(fired).toBe(1);
  });

  it('emits popTransactionEdit with the row on Edit', async () => {
    const page = await newSpecPage({
      components: [PopBudgetTransactionList],
      html: `<pop-budget-transaction-list transactions="${asAttr(transactions)}"></pop-budget-transaction-list>`,
    });
    let detail: any = null;
    page.root.addEventListener('popTransactionEdit', (e: any) => (detail = e.detail));
    (page.root.querySelector('tbody tr .action-btn') as HTMLButtonElement).click();
    expect(detail?.id).toBeDefined();
  });
});
