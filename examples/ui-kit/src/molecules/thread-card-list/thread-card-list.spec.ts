import { newSpecPage } from '../../test-utils/spec-page';
import { PopThreadCardList } from './thread-card-list';

/** Mount the card and assign the OBJECT payload as a property, then re-render. */
async function mount(payload: unknown, attrs = '') {
  const page = await newSpecPage<PopThreadCardList>({
    components: [PopThreadCardList],
    html: `<pop-thread-card-list ${attrs}></pop-thread-card-list>`,
  });
  page.rootInstance.payload = payload as any;
  await page.waitForChanges();
  return page;
}

const groceries = {
  title: 'Grocery run',
  data: {
    postedAt: Date.now(),
    listId: 'grocery',
    lines: [
      { id: 'l1', label: 'Milk', checked: true, qty: '1 gal' },
      { id: 'l2', label: 'Eggs', checked: true },
      { id: 'l3', label: 'Sourdough', checked: false },
      { id: 'l4', label: 'Coffee beans', checked: false },
    ],
  },
};

describe('pop-thread-card-list', () => {
  it('renders every line and the "N left" count', async () => {
    const page = await mount(groceries);
    expect(page.root.querySelectorAll('.tcl__line')).toHaveLength(4);
    expect(page.root.textContent).toContain('2 left');
    expect(page.root.textContent).toContain('Sourdough');
  });

  it("emits check with { lineId, checked } when a line is tapped", async () => {
    const page = await mount(groceries);
    const seen: any[] = [];
    page.root.addEventListener('popCardAction', (e) => seen.push((e as CustomEvent).detail));
    const rows = page.root.querySelectorAll('.tcl__tap');
    (rows[2] as HTMLButtonElement).click(); // Sourdough, currently unchecked
    (rows[0] as HTMLButtonElement).click(); // Milk, currently checked
    expect(seen).toEqual([
      { actionId: 'check', params: { lineId: 'l3', checked: true } },
      { actionId: 'check', params: { lineId: 'l1', checked: false } },
    ]);
  });

  it('offers add (mutating) + open panel (navigational) when live', async () => {
    const page = await mount(groceries);
    const footer = Array.from(page.root.querySelectorAll('.tcl__actions button')).map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(footer).toEqual(['Add an item', 'Open panel']);
  });

  it('frozen: lines are read-only (no tap targets) and only "Open panel" remains', async () => {
    const page = await mount(groceries, 'liveness="frozen"');
    expect(page.root.querySelector('.tcl--frozen')).toBeTruthy();
    expect(page.root.querySelectorAll('.tcl__tap')).toHaveLength(0);
    expect(page.root.querySelectorAll('.tcl__static')).toHaveLength(4);
    const footer = Array.from(page.root.querySelectorAll('.tcl__actions button')).map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(footer).toEqual(['Open panel']);
  });

  it('readonly: no buttons anywhere, including the per-line taps', async () => {
    const page = await mount(groceries, 'readonly');
    expect(page.root.querySelectorAll('button')).toHaveLength(0);
  });

  it('renders an empty-list message rather than an empty box', async () => {
    const page = await mount({ title: 'Grocery run', data: { postedAt: Date.now(), lines: [] } });
    expect(page.root.textContent).toContain('Nothing on this list yet.');
    expect(page.root.textContent).toContain('0 left');
  });

  it('falls back instead of throwing on a garbage payload', async () => {
    const page = await mount('not a payload');
    expect(page.root.textContent).toContain("couldn't render this card");
  });
});
