import { newSpecPage } from '../../test-utils/spec-page';
import { PopThreadSelect, ThreadOption } from './thread-select';

/** Mount the picker and assign the OBJECT props, then re-render. */
async function mount(props: Partial<PopThreadSelect> = {}) {
  const page = await newSpecPage<PopThreadSelect>({
    components: [PopThreadSelect],
    html: `<pop-thread-select></pop-thread-select>`,
  });
  Object.assign(page.rootInstance, props);
  await page.waitForChanges();
  return page;
}

const threads: ThreadOption[] = [
  { id: 't-kitchen', title: 'Kitchen remodel', kind: 'topic' },
  { id: 'd-today', title: 'Today', kind: 'daily' },
  { id: 't-groceries', title: 'Groceries', kind: 'topic' },
];

describe('pop-thread-select', () => {
  it('pins the daily thread above the topics when showToday is on', async () => {
    const page = await mount({ threads, value: 'd-today' });
    const values = Array.from(page.root.querySelectorAll('option')).map((o) => o.getAttribute('value'));
    expect(values).toEqual(['d-today', 't-kitchen', 't-groceries']);
    const groups = Array.from(page.root.querySelectorAll('optgroup')).map((g) => g.getAttribute('label'));
    expect(groups).toEqual(['Today', 'Topics']);
  });

  it('keeps the server order untouched when showToday is off', async () => {
    const page = await mount({ threads, value: 'd-today', showToday: false });
    const values = Array.from(page.root.querySelectorAll('option')).map((o) => o.getAttribute('value'));
    expect(values).toEqual(['t-kitchen', 'd-today', 't-groceries']);
    expect(page.root.querySelectorAll('optgroup')).toHaveLength(0);
  });

  it('marks the value as selected', async () => {
    const page = await mount({ threads, value: 't-kitchen' });
    const selected = Array.from(page.root.querySelectorAll('option')).filter((o) =>
      o.hasAttribute('selected'),
    );
    expect(selected).toHaveLength(1);
    expect(selected[0].getAttribute('value')).toBe('t-kitchen');
  });

  it('emits popThreadChange with the picked id and stores nothing itself', async () => {
    const page = await mount({ threads, value: 'd-today' });
    const seen: any[] = [];
    page.root.addEventListener('popThreadChange', (e) => seen.push((e as CustomEvent).detail));

    const select = page.root.querySelector('select') as HTMLSelectElement;
    select.value = 't-groceries';
    select.dispatchEvent(new Event('change'));

    expect(seen).toEqual([{ threadId: 't-groceries' }]);
    // The component is stateless — `value` is still whatever the host gave it.
    expect(page.rootInstance.value).toBe('d-today');
  });

  it('disabled: the select is disabled', async () => {
    const page = await mount({ threads, value: 'd-today', disabled: true });
    expect((page.root.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
  });

  it('no threads: shows a placeholder and disables itself', async () => {
    const page = await mount({ threads: [], value: '' });
    expect(page.root.textContent).toContain('No threads yet');
    expect((page.root.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
  });

  it('renders the label prop', async () => {
    const page = await mount({ threads, value: 'd-today', label: 'Send to' });
    expect(page.root.textContent).toContain('Send to');
  });
});
