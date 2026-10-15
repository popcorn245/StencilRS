import { newSpecPage } from '../../test-utils/spec-page';
import { PopTaskControls } from './task-controls';

const groupOptions = JSON.stringify([
  { id: 'none', label: 'No grouping' },
  { id: 'date', label: 'Date' },
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
]);
const sortOptions = JSON.stringify([
  { id: 'dueDate', label: 'Due date' },
  { id: 'priority', label: 'Priority' },
]);
const statusOptions = JSON.stringify([
  { id: '', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
]);

const mk = (attrs = '') =>
  `<pop-task-controls group-options='${groupOptions}' sort-options='${sortOptions}' status-options='${statusOptions}' ${attrs}></pop-task-controls>`;

describe('pop-task-controls', () => {
  it('renders the three dropdowns when all option lists are non-empty', async () => {
    const page = await newSpecPage({ components: [PopTaskControls], html: mk() });
    expect(page.root.querySelectorAll('.ptc__dd').length).toBe(3);
  });

  it('omits a dropdown whose options array is empty', async () => {
    const page = await newSpecPage({
      components: [PopTaskControls],
      html: `<pop-task-controls group-options='${groupOptions}' sort-options='[]' status-options='[]'></pop-task-controls>`,
    });
    expect(page.root.querySelectorAll('.ptc__dd').length).toBe(1);
  });

  it('parses malformed option JSON defensively (no dropdown, no crash)', async () => {
    const page = await newSpecPage({
      components: [PopTaskControls],
      html: `<pop-task-controls group-options='not json' sort-options='[]' status-options='[]'></pop-task-controls>`,
    });
    expect(page.root.querySelectorAll('.ptc__dd').length).toBe(0);
  });

  it('shows the current selection label and does not open a popover initially', async () => {
    const page = await newSpecPage({ components: [PopTaskControls], html: mk(`group-by="status"`) });
    const groupBtn = page.root.querySelector('.ptc__dd-btn') as HTMLButtonElement;
    expect(groupBtn.textContent).toContain('Status');
    expect(page.root.querySelector('.ptc__dd-menu')).toBeNull();
  });

  it('opens the listbox on trigger click and marks the current option selected', async () => {
    const page = await newSpecPage({ components: [PopTaskControls], html: mk(`group-by="date"`) });
    (page.root.querySelector('.ptc__dd-btn') as HTMLButtonElement).click();
    await page.waitForChanges();
    const menu = page.root.querySelector('.ptc__dd-menu');
    expect(menu).toBeTruthy();
    const selected = menu!.querySelector('.ptc__dd-opt[aria-selected="true"]');
    expect(selected!.textContent).toContain('Date');
  });

  it('emits groupChange with the picked value and closes the popover', async () => {
    const page = await newSpecPage({ components: [PopTaskControls], html: mk(`group-by="none"`) });
    const events: any[] = [];
    page.root.addEventListener('groupChange', (e: any) => events.push(e.detail));
    (page.root.querySelector('.ptc__dd-btn') as HTMLButtonElement).click();
    await page.waitForChanges();
    const opts = page.root.querySelectorAll('.ptc__dd-menu .ptc__dd-opt');
    (opts[2] as HTMLButtonElement).click(); // 'status'
    await page.waitForChanges();
    expect(events).toEqual([{ value: 'status' }]);
    expect(page.root.querySelector('.ptc__dd-menu')).toBeNull();
  });

  it('emits sortChange and taskStatusChange from their dropdowns', async () => {
    const page = await newSpecPage({ components: [PopTaskControls], html: mk() });
    const sortEvents: any[] = [];
    const statusEvents: any[] = [];
    page.root.addEventListener('sortChange', (e: any) => sortEvents.push(e.detail));
    page.root.addEventListener('taskStatusChange', (e: any) => statusEvents.push(e.detail));
    const dds = page.root.querySelectorAll('.ptc__dd');

    (dds[1].querySelector('.ptc__dd-btn') as HTMLButtonElement).click();
    await page.waitForChanges();
    (dds[1].querySelectorAll('.ptc__dd-opt')[1] as HTMLButtonElement).click(); // 'priority'
    await page.waitForChanges();

    (dds[2].querySelector('.ptc__dd-btn') as HTMLButtonElement).click();
    await page.waitForChanges();
    (dds[2].querySelectorAll('.ptc__dd-opt')[1] as HTMLButtonElement).click(); // 'open'
    await page.waitForChanges();

    expect(sortEvents).toEqual([{ value: 'priority' }]);
    expect(statusEvents).toEqual([{ value: 'open' }]);
  });

  it('renders a Clear affordance only when show-clear is set and emits clearAll', async () => {
    const off = await newSpecPage({ components: [PopTaskControls], html: mk() });
    expect(off.root.querySelector('.ptc__clear')).toBeNull();

    const page = await newSpecPage({ components: [PopTaskControls], html: mk('show-clear') });
    const clearBtn = page.root.querySelector('.ptc__clear') as HTMLButtonElement;
    expect(clearBtn).toBeTruthy();
    const events: any[] = [];
    page.root.addEventListener('clearAll', () => events.push(true));
    clearBtn.click();
    expect(events.length).toBe(1);
  });

  it('hides in-button labels in compact mode', async () => {
    const page = await newSpecPage({ components: [PopTaskControls], html: mk('compact') });
    expect(page.root.querySelector('.ptc--compact')).toBeTruthy();
    expect(page.root.querySelector('.ptc__dd-label')).toBeNull();
  });

  it('applies the variant class hook', async () => {
    const page = await newSpecPage({ components: [PopTaskControls], html: mk('variant="sidenav"') });
    expect(page.root.querySelector('.ptc--sidenav')).toBeTruthy();
  });

  describe("layout='menu' (collapsed filter button)", () => {
    it('renders a single filter trigger, no inline pills, and no popover initially', async () => {
      const page = await newSpecPage({ components: [PopTaskControls], html: mk('layout="menu"') });
      expect(page.root.querySelector('.ptc--menu')).toBeTruthy();
      expect(page.root.querySelector('.ptc__filter-trigger')).toBeTruthy();
      // inline pills only render once the menu is open
      expect(page.root.querySelector('.ptc__menu')).toBeNull();
      expect(page.root.querySelector('.ptc__dd-btn')).toBeNull();
    });

    it('opens the popover with the three dropdowns on trigger click', async () => {
      const page = await newSpecPage({ components: [PopTaskControls], html: mk('layout="menu"') });
      (page.root.querySelector('.ptc__filter-trigger') as HTMLButtonElement).click();
      await page.waitForChanges();
      const menu = page.root.querySelector('.ptc__menu');
      expect(menu).toBeTruthy();
      expect(menu!.querySelectorAll('.ptc__dd-btn').length).toBe(3);
      const labels = Array.from(menu!.querySelectorAll('.ptc__menu-label')).map((e) => e.textContent);
      expect(labels).toEqual(['Group', 'Sort', 'Status']);
    });

    it('renders custom dropdown headings via group-label / sort-label / status-label', async () => {
      const page = await newSpecPage({
        components: [PopTaskControls],
        html: mk('layout="menu" group-label="Tool" sort-label="Order" status-label="Result"'),
      });
      (page.root.querySelector('.ptc__filter-trigger') as HTMLButtonElement).click();
      await page.waitForChanges();
      const labels = Array.from(page.root.querySelectorAll('.ptc__menu-label')).map((e) => e.textContent);
      expect(labels).toEqual(['Tool', 'Order', 'Result']);
    });

    it('clear-variant="icon" renders an icon-only Clear (svg + aria-label, no text); default stays the text link', async () => {
      const page = await newSpecPage({
        components: [PopTaskControls],
        html: mk('layout="menu" show-clear clear-variant="icon"'),
      });
      (page.root.querySelector('.ptc__filter-trigger') as HTMLButtonElement).click();
      await page.waitForChanges();
      const clear = page.root.querySelector('.ptc__menu-clear') as HTMLButtonElement;
      expect(clear).toBeTruthy();
      expect(clear.classList.contains('ptc__menu-clear--icon')).toBe(true);
      expect(clear.getAttribute('aria-label')).toBe('Clear filters');
      expect(clear.querySelector('svg')).toBeTruthy();
      expect((clear.textContent ?? '').trim()).toBe('');

      const text = await newSpecPage({ components: [PopTaskControls], html: mk('layout="menu" show-clear') });
      (text.root.querySelector('.ptc__filter-trigger') as HTMLButtonElement).click();
      await text.waitForChanges();
      expect((text.root.querySelector('.ptc__menu-clear')!.textContent ?? '').trim()).toBe('Clear all');
    });

    it('shows the active dot only when a filter differs from the provided defaults', async () => {
      const atRest = await newSpecPage({
        components: [PopTaskControls],
        html: mk('layout="menu" group-by="date" sort-by="dueDate" default-group="date" default-sort="dueDate"'),
      });
      expect(atRest.root.querySelector('.ptc__filter-dot')).toBeNull();

      const filtered = await newSpecPage({
        components: [PopTaskControls],
        html: mk('layout="menu" group-by="status" sort-by="dueDate" default-group="date" default-sort="dueDate"'),
      });
      expect(filtered.root.querySelector('.ptc__filter-dot')).toBeTruthy();

      const statusFiltered = await newSpecPage({
        components: [PopTaskControls],
        html: mk('layout="menu" group-by="date" sort-by="dueDate" status-filter="open" default-group="date" default-sort="dueDate"'),
      });
      expect(statusFiltered.root.querySelector('.ptc__filter-dot')).toBeTruthy();
    });

    it('emits groupChange and keeps the menu open when a selection is made', async () => {
      const page = await newSpecPage({ components: [PopTaskControls], html: mk('layout="menu" group-by="none"') });
      const events: any[] = [];
      page.root.addEventListener('groupChange', (e: any) => events.push(e.detail));
      (page.root.querySelector('.ptc__filter-trigger') as HTMLButtonElement).click();
      await page.waitForChanges();
      // open the group dropdown, then pick an option
      (page.root.querySelectorAll('.ptc__menu .ptc__dd-btn')[0] as HTMLButtonElement).click();
      await page.waitForChanges();
      const opts = page.root.querySelectorAll('.ptc__menu .ptc__dd-opt');
      (opts[2] as HTMLButtonElement).click(); // 'status'
      await page.waitForChanges();
      expect(events).toEqual([{ value: 'status' }]);
      // the menu stays open so the user can adjust multiple filters
      expect(page.root.querySelector('.ptc__menu')).toBeTruthy();
    });
  });
});
