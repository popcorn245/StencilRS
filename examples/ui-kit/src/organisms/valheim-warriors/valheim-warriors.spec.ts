import { newSpecPage, setProps } from '../../test-utils/spec-page';
import { ValheimWarriors } from './valheim-warriors';

const PLAYERS = JSON.stringify([
  { name: 'Bjornwulf', class: 'Axe-thegn · iron-forged', level: 47, rune: 'ᚦ' },
  { name: 'Sigrun Frostmaiden', class: 'Bow-singer', level: 44 },
]);
const HEALTH = JSON.stringify({ uptimeSec: 3 * 86400 + 6 * 3600, tps: 58, pingMs: 32 });

describe('valheim-warriors', () => {
  it('renders the roster with runes, levels, and the health strip', async () => {
    const page = await newSpecPage({
      components: [ValheimWarriors],
      html: `<valheim-warriors players='${PLAYERS}' max-players="20" health='${HEALTH}'></valheim-warriors>`,
    });
    expect(page.root.querySelector('.vlh-count').textContent).toContain('2 / 20');
    expect(page.root.textContent).toContain('Bjornwulf');
    expect(page.root.textContent).toContain('Lv 47');
    expect(page.root.querySelector('.vw-health').textContent).toContain('3d 6h');
    expect(page.root.querySelector('.vw-health').textContent).toContain('58');
    // Explicit rune wins; a missing rune derives one deterministically.
    const runes = page.root.querySelectorAll('.vlh-rune');
    expect(runes[0].textContent).toBe('ᚦ');
    expect(runes[1].textContent.length).toBeGreaterThan(0);
  });

  it('shows the quiet-halls empty state', async () => {
    const page = await newSpecPage({
      components: [ValheimWarriors],
      html: `<valheim-warriors players='[]'></valheim-warriors>`,
    });
    expect(page.root.querySelector('.vw-empty').textContent).toContain('quiet');
  });

  it('renders offline state', async () => {
    const page = await newSpecPage({
      components: [ValheimWarriors],
      html: `<valheim-warriors players='[]'></valheim-warriors>`,
    });
    await setProps(page, { online: false });
    expect(page.root.querySelector('.vlh-count').textContent).toContain('offline');
    expect(page.root.querySelector('.vw-health').textContent).toContain('unreachable');
  });

  it('admin ops render only for isAdmin and emit valheimServerAction', async () => {
    const noAdmin = await newSpecPage({
      components: [ValheimWarriors],
      html: `<valheim-warriors players='${PLAYERS}'></valheim-warriors>`,
    });
    expect(noAdmin.root.querySelector('.vw-ops')).toBeNull();

    const admin = await newSpecPage({
      components: [ValheimWarriors],
      html: `<valheim-warriors players='${PLAYERS}' is-admin="true"></valheim-warriors>`,
    });
    const actions: string[] = [];
    admin.root.addEventListener('valheimServerAction', (e: Event) =>
      actions.push((e as CustomEvent<{ action: string }>).detail.action),
    );
    const buttons = admin.root.querySelectorAll('.vw-ops button');
    expect(buttons.length).toBe(3);
    (buttons[0] as HTMLButtonElement).click();
    (buttons[2] as HTMLButtonElement).click();
    expect(actions).toEqual(['restart', 'backup']);
  });
});
