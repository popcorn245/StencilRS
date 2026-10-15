import { newSpecPage, setProps } from '../../test-utils/spec-page';
import { PopSpacePicker, Space } from './space-picker';

const SPACES: Space[] = [
  { id: 'kit', name: 'Kitchen', icon: '🍳', room: 'kitchen' },
  { id: 'gar', name: 'Garage', icon: '🚗', room: 'garage' },
  { id: 'off', name: "Bobby's Office", icon: '💻', room: 'office' },
];

describe('pop-space-picker', () => {
  it('renders the placeholder when nothing is selected', async () => {
    const page = await newSpecPage({
      components: [PopSpacePicker],
      html: `<pop-space-picker placeholder="Pick a space…"></pop-space-picker>`,
    });
    const placeholder = page.root.querySelector('.psp__placeholder');
    expect(placeholder?.textContent).toBe('Pick a space…');
    expect(page.root.querySelector('.psp__chip')).toBeNull();
  });

  it('renders chips for each picked space', async () => {
    const page = await newSpecPage({
      components: [PopSpacePicker],
      html: `<pop-space-picker></pop-space-picker>`,
    });
    (page.rootInstance as any).spaces = SPACES;
    (page.rootInstance as any).value = ['kit', 'gar'];
    await page.waitForChanges();

    const chips = page.root.querySelectorAll('.psp__chip');
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toContain('Kitchen');
    expect(chips[1].textContent).toContain('Garage');
  });

  it('emits valueChanged when a chip is removed', async () => {
    const page = await newSpecPage({
      components: [PopSpacePicker],
      html: `<pop-space-picker></pop-space-picker>`,
    });
    (page.rootInstance as any).spaces = SPACES;
    (page.rootInstance as any).value = ['kit', 'gar'];
    await page.waitForChanges();

    const events: any[] = [];
    page.root.addEventListener('valueChanged', ((e: CustomEvent) => events.push(e.detail)) as EventListener);

    const removeBtn = page.root.querySelector('.psp__chip .psp__chip-remove') as HTMLButtonElement;
    removeBtn.click();

    expect(events.length).toBe(1);
    expect(events[0]).toEqual(['gar']);
  });

  it('toggles selection when an option is clicked', async () => {
    const page = await newSpecPage({
      components: [PopSpacePicker],
      html: `<pop-space-picker></pop-space-picker>`,
    });
    (page.rootInstance as any).spaces = SPACES;
    (page.rootInstance as any).value = [];
    await page.waitForChanges();

    const events: any[] = [];
    page.root.addEventListener('valueChanged', ((e: CustomEvent) => events.push(e.detail)) as EventListener);

    // open popover
    (page.rootInstance as any).open = true;
    await page.waitForChanges();

    const opts = page.root.querySelectorAll('.psp__opt');
    expect(opts.length).toBe(SPACES.length);
    (opts[0] as HTMLElement).click();

    expect(events.length).toBe(1);
    expect(events[0]).toEqual(['kit']);
  });

  it('emits spaceCreateRequested with form values', async () => {
    const page = await newSpecPage({
      components: [PopSpacePicker],
      html: `<pop-space-picker></pop-space-picker>`,
    });
    (page.rootInstance as any).spaces = SPACES;
    await page.waitForChanges();

    const events: any[] = [];
    page.root.addEventListener('spaceCreateRequested', ((e: CustomEvent) => events.push(e.detail)) as EventListener);

    const inst = page.rootInstance as any;
    inst.open = true;
    inst.showCreateForm = true;
    inst.createName = 'Pantry';
    inst.createIcon = '🥫';
    inst.createRoom = 'kitchen';
    await page.waitForChanges();

    inst.submitCreate(new Event('submit'));

    expect(events.length).toBe(1);
    expect(events[0]).toEqual({ name: 'Pantry', icon: '🥫', room: 'kitchen' });
  });

  it('does not show the New space button when allowCreate is false', async () => {
    const page = await newSpecPage({
      components: [PopSpacePicker],
      html: `<pop-space-picker></pop-space-picker>`,
    });
    await setProps(page, { allowCreate: false });
    (page.rootInstance as any).open = true;
    await page.waitForChanges();
    expect(page.root.querySelector('.psp__new')).toBeNull();
  });

  it('filters spaces by the search query', async () => {
    const page = await newSpecPage({
      components: [PopSpacePicker],
      html: `<pop-space-picker></pop-space-picker>`,
    });
    (page.rootInstance as any).spaces = SPACES;
    (page.rootInstance as any).open = true;
    (page.rootInstance as any).query = 'office';
    await page.waitForChanges();

    const opts = page.root.querySelectorAll('.psp__opt');
    expect(opts.length).toBe(1);
    expect(opts[0].textContent).toContain("Bobby's Office");
  });
});
