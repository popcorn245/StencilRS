import { newSpecPage } from '../../test-utils/spec-page';
import { PopBudgetBillList } from './budget-bill-list';

const bills = [
  { id: '1', name: 'Rent', amountTotal: 1850, billDue: '2026-08-01', frequency: 'monthly', status: 'active', billee: 'Landlord', tags: ['housing'] },
  { id: '2', name: 'Electric', amountTotal: 132.5, billDue: '2026-08-05', frequency: 'monthly', status: 'active', billee: 'Ameren', tags: ['utilities'] },
];

const asAttr = (o: unknown) => JSON.stringify(o).replace(/"/g, '&quot;');

describe('pop-budget-bill-list', () => {
  it('renders active bills (from a JSON-string attribute)', async () => {
    const page = await newSpecPage({
      components: [PopBudgetBillList],
      html: `<pop-budget-bill-list bills="${asAttr(bills)}"></pop-budget-bill-list>`,
    });
    const rows = page.root.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(page.root.querySelector('.name')?.textContent).toContain('Rent');
  });

  it('hides the internal toolbar when hide-toolbar is set', async () => {
    const shown = await newSpecPage({
      components: [PopBudgetBillList],
      html: `<pop-budget-bill-list bills="${asAttr(bills)}"></pop-budget-bill-list>`,
    });
    expect(shown.root.querySelector('.toolbar')).not.toBeNull();

    const hidden = await newSpecPage({
      components: [PopBudgetBillList],
      html: `<pop-budget-bill-list hide-toolbar="true" bills="${asAttr(bills)}"></pop-budget-bill-list>`,
    });
    expect(hidden.root.querySelector('.toolbar')).toBeNull();
    expect(hidden.root.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('shows the empty state when handed no bills', async () => {
    const page = await newSpecPage({
      components: [PopBudgetBillList],
      html: `<pop-budget-bill-list bills="[]"></pop-budget-bill-list>`,
    });
    expect(page.root.querySelector('.empty')?.textContent).toContain('No bills');
  });

  it('emits popBillAdd when the Add Bill button is tapped', async () => {
    const page = await newSpecPage({
      components: [PopBudgetBillList],
      html: `<pop-budget-bill-list bills="${asAttr(bills)}"></pop-budget-bill-list>`,
    });
    let fired = 0;
    page.root.addEventListener('popBillAdd', () => fired++);
    (page.root.querySelector('.add-btn') as HTMLButtonElement).click();
    expect(fired).toBe(1);
  });

  it('emits popBillEdit with the bill on Edit', async () => {
    const page = await newSpecPage({
      components: [PopBudgetBillList],
      html: `<pop-budget-bill-list bills="${asAttr(bills)}"></pop-budget-bill-list>`,
    });
    let detail: any = null;
    page.root.addEventListener('popBillEdit', (e: any) => (detail = e.detail));
    (page.root.querySelector('tbody tr .action-btn') as HTMLButtonElement).click();
    expect(detail?.name).toBe('Rent');
  });
});
