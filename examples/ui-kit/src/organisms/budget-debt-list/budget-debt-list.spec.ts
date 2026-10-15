import { newSpecPage } from '../../test-utils/spec-page';
import { PopBudgetDebtList } from './budget-debt-list';

const debts = [
  { id: '1', name: 'Best Buy Visa', amount: 1240.55, creditLimit: 3000, interestRate: 0.2874, billDue: '2026-08-10', frequency: 'monthly', status: 'active', person: 'Owner' },
  { id: '2', name: 'Paid Card', amount: 0, creditLimit: 2000, interestRate: 0.19, billDue: '', frequency: 'monthly', status: 'paid', person: 'Owner' },
];

const asAttr = (o: unknown) => JSON.stringify(o).replace(/"/g, '&quot;');

describe('pop-budget-debt-list', () => {
  it('renders a card only for ACTIVE debts (from a JSON-string attribute)', async () => {
    const page = await newSpecPage({
      components: [PopBudgetDebtList],
      html: `<pop-budget-debt-list debts="${asAttr(debts)}"></pop-budget-debt-list>`,
    });
    const cards = page.root.querySelectorAll('.debt-card');
    expect(cards.length).toBe(1);
    expect(page.root.querySelector('.card-name')?.textContent).toBe('Best Buy Visa');
    // APR is a fraction → rendered as a percent.
    expect(page.root.querySelector('.card-meta')?.textContent).toContain('28.7% APR');
  });

  it('hides the internal toolbar (Total Owed + Add) when hide-toolbar is set', async () => {
    const shown = await newSpecPage({
      components: [PopBudgetDebtList],
      html: `<pop-budget-debt-list debts="${asAttr(debts)}"></pop-budget-debt-list>`,
    });
    expect(shown.root.querySelector('.toolbar')).not.toBeNull();
    expect(shown.root.querySelector('.total-owed')).not.toBeNull();

    const hidden = await newSpecPage({
      components: [PopBudgetDebtList],
      html: `<pop-budget-debt-list hide-toolbar="true" debts="${asAttr(debts)}"></pop-budget-debt-list>`,
    });
    expect(hidden.root.querySelector('.toolbar')).toBeNull();
    expect(hidden.root.querySelector('.total-owed')).toBeNull();
    // cards still render
    expect(hidden.root.querySelectorAll('.debt-card').length).toBe(1);
  });

  it('shows the empty state when there are no active debts', async () => {
    const page = await newSpecPage({
      components: [PopBudgetDebtList],
      html: `<pop-budget-debt-list debts="[]"></pop-budget-debt-list>`,
    });
    expect(page.root.querySelector('.empty')?.textContent).toContain('No active debts');
  });

  it('emits popDebtAdd when the Add Debt button is tapped', async () => {
    const page = await newSpecPage({
      components: [PopBudgetDebtList],
      html: `<pop-budget-debt-list debts="${asAttr(debts)}"></pop-budget-debt-list>`,
    });
    let fired = 0;
    page.root.addEventListener('popDebtAdd', () => fired++);
    (page.root.querySelector('.add-btn') as HTMLButtonElement).click();
    expect(fired).toBe(1);
  });

  it('emits popDebtEdit with the debt on Edit', async () => {
    const page = await newSpecPage({
      components: [PopBudgetDebtList],
      html: `<pop-budget-debt-list debts="${asAttr(debts)}"></pop-budget-debt-list>`,
    });
    let detail: any = null;
    page.root.addEventListener('popDebtEdit', (e: any) => (detail = e.detail));
    (page.root.querySelector('.debt-card .action-btn') as HTMLButtonElement).click();
    expect(detail?.name).toBe('Best Buy Visa');
  });
});
