import { newSpecPage } from '../../test-utils/spec-page';
import { ValheimShop } from './valheim-shop';

const TIER = JSON.stringify({ name: 'Swamp', tag: 'Unlocked by felling Bonemass' });
const ITEMS = JSON.stringify([
  { name: 'Chain', desc: 'for the flail', price: 450 },
  { name: 'Megingjord', desc: 'belt of strength', price: 950 },
  { name: 'Wisp Torch', desc: 'light for the Mistlands', locked: true, lockNote: 'After Moder' },
]);
const PROPOSAL = JSON.stringify({
  subtitle: 'Bonemass has fallen — the merchant senses opportunity',
  lines: [
    { kind: 'add', text: 'Add Root Mask to stock', value: '+ 620' },
    { kind: 'raise', text: 'Raise Megingjord (scarcity)', value: '950 → 1,100' },
    { kind: 'unlock', text: 'Next unlock after Moder', value: 'Silver tier' },
  ],
});

describe('valheim-shop', () => {
  it('renders tier, stock (with prices), and locked rows with their gate', async () => {
    const page = await newSpecPage({
      components: [ValheimShop],
      html: `<valheim-shop tier='${TIER}' items='${ITEMS}'></valheim-shop>`,
    });
    expect(page.root.querySelector('.vsh-tier').textContent).toContain('Current tier: Swamp');
    expect(page.root.querySelector('.vlh-count').textContent).toContain('2 wares');
    expect(page.root.textContent).toContain('Chain');
    expect(page.root.textContent).toContain('450');
    const locked = page.root.querySelector('.vsh-item--locked');
    expect(locked.textContent).toContain('Wisp Torch');
    expect(locked.querySelector('.vsh-lock').textContent).toBe('After Moder');
  });

  it('renders the proposal lines; approve/tweak are admin-only', async () => {
    const player = await newSpecPage({
      components: [ValheimShop],
      html: `<valheim-shop items='${ITEMS}' proposal='${PROPOSAL}'></valheim-shop>`,
    });
    expect(player.root.querySelector('.vsh-proposal').textContent).toContain('Root Mask');
    expect(player.root.querySelector('.vsh-pr-actions')).toBeNull();

    const admin = await newSpecPage({
      components: [ValheimShop],
      html: `<valheim-shop items='${ITEMS}' proposal='${PROPOSAL}' is-admin="true"></valheim-shop>`,
    });
    const actions: string[] = [];
    admin.root.addEventListener('valheimShopAction', (e: Event) =>
      actions.push((e as CustomEvent<{ action: string }>).detail.action),
    );
    const buttons = admin.root.querySelectorAll('.vsh-pr-actions button');
    expect(buttons.length).toBe(2);
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();
    expect(actions).toEqual(['approve', 'tweak']);
  });

  it('degrades gracefully with no data', async () => {
    const page = await newSpecPage({
      components: [ValheimShop],
      html: `<valheim-shop></valheim-shop>`,
    });
    expect(page.root.querySelector('.vsh-empty').textContent).toContain('empty');
    expect(page.root.querySelector('.vsh-proposal')).toBeNull();
  });
});
