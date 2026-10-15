import { newSpecPage } from '../../test-utils/spec-page';
import { PopUserSelect, UserOption } from './user-select';

const PEOPLE: UserOption[] = [
  { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 'u2', name: 'Alan Turing', email: 'alan@example.com' },
  { id: 'u3', name: 'Grace Hopper', email: 'grace@example.com' },
];

/** A resolver that filters the fixture by name/email substring. */
const resolver = (q: string): Promise<UserOption[]> => {
  const s = q.toLowerCase();
  return Promise.resolve(
    PEOPLE.filter((p) => `${p.name} ${p.email}`.toLowerCase().includes(s)),
  );
};

/** Mount with an instant (0ms) debounce and an optional resolver / value. */
async function mount(props: Partial<PopUserSelect> = {}) {
  const page = await newSpecPage({
    components: [PopUserSelect],
    html: `<pop-user-select debounce="0"></pop-user-select>`,
  });
  Object.assign(page.rootInstance as PopUserSelect, props);
  await page.waitForChanges();
  return page;
}

/** Type into the field and let the (0ms) debounce + async resolve settle. */
async function type(page: Awaited<ReturnType<typeof mount>>, text: string) {
  const input = page.root!.querySelector('.pus__input') as HTMLInputElement;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 0));
  await page.waitForChanges();
  return input;
}

describe('pop-user-select', () => {
  it('renders the text field with the placeholder and no chips by default', async () => {
    const page = await mount({ placeholder: 'Invite…' });
    const input = page.root!.querySelector('.pus__input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('placeholder')).toBe('Invite…');
    expect(page.root!.querySelectorAll('.pus__chip').length).toBe(0);
  });

  it('renders a chip per selected value', async () => {
    const page = await mount({ value: [PEOPLE[0], { email: 'x@y.com' }] });
    const chips = page.root!.querySelectorAll('.pus__chip');
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toContain('Ada Lovelace');
    // A value with no name falls back to the email as its label.
    expect(chips[1].textContent).toContain('x@y.com');
  });

  it('searches via the injected resolver and lists matches in the popover', async () => {
    const page = await mount({ resolve: resolver });
    await type(page, 'a');
    const opts = page.root!.querySelectorAll('.pus__opt');
    // "a" matches all three fixtures (ada / alan / grace).
    expect(opts.length).toBe(3);
    expect(opts[0].textContent).toContain('Ada Lovelace');
    expect(opts[0].textContent).toContain('ada@example.com');
  });

  it('adds a chip and emits valueChanged when an option is picked', async () => {
    const page = await mount({ resolve: resolver });
    const spy = vi.fn();
    page.root!.addEventListener('valueChanged', (e) => spy((e as CustomEvent<UserOption[]>).detail));
    await type(page, 'grace');
    (page.root!.querySelector('.pus__opt') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toEqual([PEOPLE[2]]);
    // The draft input clears after a pick.
    expect((page.root!.querySelector('.pus__input') as HTMLInputElement).value).toBe('');
  });

  it('hides already-selected people from the suggestions', async () => {
    const page = await mount({ resolve: resolver, value: [PEOPLE[0]] });
    await type(page, 'a');
    const names = Array.from(page.root!.querySelectorAll('.pus__opt-name')).map((n) => n.textContent);
    expect(names).not.toContain('Ada Lovelace');
    expect(names).toContain('Alan Turing');
  });

  it('offers a free-text email add option only when allow-free-text is set', async () => {
    const off = await mount({ resolve: resolver });
    await type(off, 'nobody@example.com');
    expect(off.root!.querySelector('.pus__opt--add')).toBeNull();

    const on = await mount({ resolve: resolver, allowFreeText: true });
    await type(on, 'nobody@example.com');
    const add = on.root!.querySelector('.pus__opt--add') as HTMLButtonElement;
    expect(add).toBeTruthy();
    expect(add.textContent).toContain('nobody@example.com');

    const spy = vi.fn();
    on.root!.addEventListener('valueChanged', (e) => spy((e as CustomEvent<UserOption[]>).detail));
    add.click();
    await on.waitForChanges();
    expect(spy.mock.calls[0][0]).toEqual([{ email: 'nobody@example.com' }]);
  });

  it('does not treat a non-email free-text query as an add option', async () => {
    const page = await mount({ resolve: resolver, allowFreeText: true });
    await type(page, 'zzz-no-match');
    expect(page.root!.querySelector('.pus__opt--add')).toBeNull();
    expect(page.root!.querySelector('.pus__hint')!.textContent).toContain('No matches');
  });

  it('removes a chip and emits the trimmed selection', async () => {
    const page = await mount({ value: [PEOPLE[0], PEOPLE[1]] });
    const spy = vi.fn();
    page.root!.addEventListener('valueChanged', (e) => spy((e as CustomEvent<UserOption[]>).detail));
    (page.root!.querySelectorAll('.pus__chip-x')[0] as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(spy.mock.calls[0][0]).toEqual([PEOPLE[1]]);
  });

  it('does not add a duplicate when the same email is picked twice', async () => {
    const page = await mount({ resolve: resolver, value: [PEOPLE[0]] });
    const spy = vi.fn();
    page.root!.addEventListener('valueChanged', (e) => spy((e as CustomEvent<UserOption[]>).detail));
    // Ada is already selected → filtered out of results, so nothing new can be picked.
    await type(page, 'ada');
    expect(page.root!.querySelectorAll('.pus__opt').length).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('honours max by ignoring picks once the cap is reached', async () => {
    const page = await mount({ resolve: resolver, value: [PEOPLE[0]], max: 1 });
    const spy = vi.fn();
    page.root!.addEventListener('valueChanged', (e) => spy((e as CustomEvent<UserOption[]>).detail));
    await type(page, 'alan');
    (page.root!.querySelector('.pus__opt') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(spy).not.toHaveBeenCalled();
    expect(page.root!.querySelectorAll('.pus__chip').length).toBe(1);
  });
});
