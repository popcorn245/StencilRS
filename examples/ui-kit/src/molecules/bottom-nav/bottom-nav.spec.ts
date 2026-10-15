import { newSpecPage } from '../../test-utils/spec-page';
import { BottomNav } from './bottom-nav';

const ITEMS = JSON.stringify([
  { id: 'collection', label: 'Collection', icon: 'albums-outline', badge: 6 },
  { id: 'decks', label: 'Decks', icon: 'file-tray-stacked-outline' },
  { id: 'search', label: 'Search', icon: 'search-outline' },
  { id: 'profile', label: 'Profile', icon: 'person-circle-outline' },
]);

describe('pop-bottom-nav', () => {
  it('renders the 2+2 layout: two tabs each side of the center button', async () => {
    const page = await newSpecPage({
      components: [BottomNav],
      html: `<pop-bottom-nav items='${ITEMS}' active-id="collection"></pop-bottom-nav>`,
    });
    const left = page.root.querySelectorAll('.bn-side--left .bn-tab');
    const right = page.root.querySelectorAll('.bn-side--right .bn-tab');
    expect(left.length).toBe(2);
    expect(right.length).toBe(2);
    expect(page.root.querySelector('.bn-center')).not.toBeNull();
  });

  it('marks the active tab (and only it)', async () => {
    const page = await newSpecPage({
      components: [BottomNav],
      html: `<pop-bottom-nav items='${ITEMS}' active-id="decks"></pop-bottom-nav>`,
    });
    const active = page.root.querySelectorAll('.bn-tab--active');
    expect(active.length).toBe(1);
    expect(active[0].textContent).toContain('Decks');
    expect(active[0].getAttribute('aria-current')).toBe('page');
  });

  it('renders a badge bubble only when badge > 0', async () => {
    const page = await newSpecPage({
      components: [BottomNav],
      html: `<pop-bottom-nav items='${ITEMS}' active-id="collection"></pop-bottom-nav>`,
    });
    const badges = page.root.querySelectorAll('.bn-tab-badge');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent).toBe('6');
  });

  it('emits tabselect with the pressed tab id', async () => {
    const page = await newSpecPage({
      components: [BottomNav],
      html: `<pop-bottom-nav items='${ITEMS}' active-id="collection"></pop-bottom-nav>`,
    });
    let selected: string | null = null;
    page.root.addEventListener('tabselect', (e: Event) => {
      selected = (e as CustomEvent<{ id: string }>).detail.id;
    });
    (page.root.querySelectorAll('.bn-tab')[3] as HTMLButtonElement).click();
    expect(selected).toBe('profile');
  });

  it('emits centerpress with the parent-driven action', async () => {
    const page = await newSpecPage({
      components: [BottomNav],
      html: `<pop-bottom-nav items='${ITEMS}' center-action="add"></pop-bottom-nav>`,
    });
    let action: string | null = null;
    page.root.addEventListener('centerpress', (e: Event) => {
      action = (e as CustomEvent<{ action: string }>).detail.action;
    });
    (page.root.querySelector('.bn-center') as HTMLButtonElement).click();
    expect(action).toBe('add');
  });

  it('defaults the center icon + label per centerAction', async () => {
    const scan = await newSpecPage({
      components: [BottomNav],
      html: `<pop-bottom-nav items='${ITEMS}'></pop-bottom-nav>`,
    });
    expect((scan.root.querySelector('.bn-center-ic') as any).name).toBe('camera');
    expect(scan.root.querySelector('.bn-center-label').textContent).toBe('Scan');

    const add = await newSpecPage({
      components: [BottomNav],
      html: `<pop-bottom-nav items='${ITEMS}' center-action="add"></pop-bottom-nav>`,
    });
    expect((add.root.querySelector('.bn-center-ic') as any).name).toBe('add');
    expect(add.root.querySelector('.bn-center-label').textContent).toBe('Add');
  });

  it('suppresses events while disabled', async () => {
    const page = await newSpecPage({
      components: [BottomNav],
      html: `<pop-bottom-nav items='${ITEMS}' disabled></pop-bottom-nav>`,
    });
    let fired = 0;
    page.root.addEventListener('tabselect', () => fired++);
    page.root.addEventListener('centerpress', () => fired++);
    (page.root.querySelector('.bn-tab') as HTMLButtonElement).click();
    (page.root.querySelector('.bn-center') as HTMLButtonElement).click();
    expect(fired).toBe(0);
  });

  it('applies the compact container class only when compact is set', async () => {
    const compact = await newSpecPage({
      components: [BottomNav],
      html: `<pop-bottom-nav items='${ITEMS}' compact></pop-bottom-nav>`,
    });
    expect(compact.root.querySelector('.bn-wrap--compact')).not.toBeNull();

    const plain = await newSpecPage({
      components: [BottomNav],
      html: `<pop-bottom-nav items='${ITEMS}'></pop-bottom-nav>`,
    });
    expect(plain.root.querySelector('.bn-wrap--compact')).toBeNull();
  });

  it('tolerates malformed items JSON (renders an empty bar, never throws)', async () => {
    const page = await newSpecPage({
      components: [BottomNav],
      html: `<pop-bottom-nav items='not json'></pop-bottom-nav>`,
    });
    expect(page.root.querySelectorAll('.bn-tab').length).toBe(0);
    expect(page.root.querySelector('.bn-center')).not.toBeNull();
  });
});
