import { newSpecPage } from '../../test-utils/spec-page';
import { PopFilterBar } from './filter-bar';

const sampleFilters = JSON.stringify([
  { id: 'sort', label: 'Sort', value: 'name-asc', defaultValue: 'name-asc', options: [{ value: 'name-asc', label: 'A → Z' }, { value: 'name-desc', label: 'Z → A' }] },
  { id: 'class', label: 'Class', value: '', defaultValue: '', options: [{ value: '', label: 'All Classes' }, { value: 'Electronics', label: 'Electronics' }] },
]);

describe('pop-filter-bar', () => {
  it('renders the filter trigger button', async () => {
    const page = await newSpecPage({ components: [PopFilterBar], html: `<pop-filter-bar filters='${sampleFilters}'></pop-filter-bar>` });
    const trigger = page.root.querySelector('.pfb-trigger');
    expect(trigger).toBeTruthy();
    expect(trigger!.textContent).toContain('Filters');
  });

  it('does not show popover initially', async () => {
    const page = await newSpecPage({ components: [PopFilterBar], html: `<pop-filter-bar filters='${sampleFilters}'></pop-filter-bar>` });
    expect(page.root.querySelector('.pfb-popover')).toBeNull();
  });

  it('shows popover when trigger is clicked', async () => {
    const page = await newSpecPage({ components: [PopFilterBar], html: `<pop-filter-bar filters='${sampleFilters}'></pop-filter-bar>` });
    (page.root.querySelector('.pfb-trigger') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(page.root.querySelector('.pfb-popover')).toBeTruthy();
  });

  it('shows no chips when all filters are at default', async () => {
    const page = await newSpecPage({ components: [PopFilterBar], html: `<pop-filter-bar filters='${sampleFilters}'></pop-filter-bar>` });
    expect(page.root.querySelectorAll('.pfb-chip').length).toBe(0);
  });

  it('shows badge count when active filters exist', async () => {
    const filtersWithActive = JSON.stringify([
      { id: 'sort', label: 'Sort', value: 'name-desc', defaultValue: 'name-asc', options: [{ value: 'name-asc', label: 'A → Z' }, { value: 'name-desc', label: 'Z → A' }] },
      { id: 'class', label: 'Class', value: 'Electronics', defaultValue: '', options: [{ value: '', label: 'All Classes' }, { value: 'Electronics', label: 'Electronics' }] },
    ]);
    const page = await newSpecPage({ components: [PopFilterBar], html: `<pop-filter-bar filters='${filtersWithActive}'></pop-filter-bar>` });
    const badge = page.root.querySelector('.pfb-badge');
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toBe('2');
  });

  it('emits popFilterChange when an option button is clicked', async () => {
    const page = await newSpecPage({ components: [PopFilterBar], html: `<pop-filter-bar filters='${sampleFilters}'></pop-filter-bar>` });
    const events: CustomEvent[] = [];
    page.root.addEventListener('popFilterChange', (e: Event) => events.push(e as CustomEvent));
    (page.root.querySelector('.pfb-trigger') as HTMLButtonElement).click();
    await page.waitForChanges();
    const options = page.root.querySelectorAll('.pfb-option');
    (options[1] as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(events.length).toBe(1);
    expect(events[0].detail).toEqual({ id: 'sort', value: 'name-desc' });
  });
});
