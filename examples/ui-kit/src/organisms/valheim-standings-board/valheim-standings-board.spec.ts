import { newSpecPage } from '../../test-utils/spec-page';
import { ValheimStandingsBoard } from './valheim-standings-board';

const STANDINGS = JSON.stringify([
  { name: 'Bjornwulf', rune: 'ᚦ', kills: 318, deaths: 11, bounties: 9, coin: 2480, bosses: 3 },
  { name: 'Rurik Ironside', rune: 'ᚱ', kills: 276, deaths: 7, bounties: 8, coin: 2110, bosses: 2 },
]);

describe('valheim-standings-board', () => {
  it('CO-OP DEFAULT: The Pantheon table shows bounties · coin · bosses · Falls with medal ranks — no PvP kills column', async () => {
    const page = await newSpecPage({
      components: [ValheimStandingsBoard],
      html: `<valheim-standings-board standings='${STANDINGS}'></valheim-standings-board>`,
    });
    const table = page.root.querySelector('table.vsb-board');
    expect(table.textContent).toContain('Bjornwulf');
    expect(table.textContent).toContain('2,480');
    const headers = Array.from(table.querySelectorAll('th')).map((th) => th.textContent);
    expect(headers).toEqual(['#', 'Warrior', 'Bounties', 'Coin', 'Bosses', 'Falls']);
    expect(headers).not.toContain('Kills');
    expect(headers).not.toContain('Shame');
    // PvP kill counts never render on the co-op board.
    expect(table.textContent).not.toContain('318');
    expect(table.querySelector('.vsb-rank--g1')).not.toBeNull();
    expect(table.querySelector('.vsb-falls').textContent).toBe('11');
  });

  it('shows the co-op-by-default note under the table', async () => {
    const page = await newSpecPage({
      components: [ValheimStandingsBoard],
      html: `<valheim-standings-board standings='${STANDINGS}'></valheim-standings-board>`,
    });
    expect(page.root.querySelector('.vsb-coop').textContent).toContain('PvP events');
  });

  it('SECRECY: the Juggernaut toggle stays hidden from players until the finale is active', async () => {
    const page = await newSpecPage({
      components: [ValheimStandingsBoard],
      html: `<valheim-standings-board standings='${STANDINGS}'></valheim-standings-board>`,
    });
    expect(page.root.querySelector('.vsb-tabs')).toBeNull();
  });

  it('admins see the toggle early; players see it once active', async () => {
    const admin = await newSpecPage({
      components: [ValheimStandingsBoard],
      html: `<valheim-standings-board standings='${STANDINGS}' is-admin="true"></valheim-standings-board>`,
    });
    expect(admin.root.querySelector('.vsb-tabs')).not.toBeNull();

    const live = await newSpecPage({
      components: [ValheimStandingsBoard],
      html: `<valheim-standings-board standings='${STANDINGS}' juggernaut='{"active":true}'></valheim-standings-board>`,
    });
    expect(live.root.querySelector('.vsb-tabs')).not.toBeNull();
  });

  it('juggernaut view shows the PvP banner, the target, and the bounty', async () => {
    const jug = JSON.stringify({ active: true, targetName: 'Bjornwulf', bounty: 5000, pvpOn: true });
    const page = await newSpecPage({
      components: [ValheimStandingsBoard],
      html: `<valheim-standings-board standings='${STANDINGS}' juggernaut='${jug}'></valheim-standings-board>`,
    });
    const buttons = page.root.querySelectorAll('.vsb-tabs button');
    (buttons[1] as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(page.root.querySelector('.vsb-pvp').textContent).toBe('PvP ON');
    expect(page.root.querySelector('.vsb-tc-name').textContent).toBe('Bjornwulf');
    expect(page.root.querySelector('.vsb-b-val').textContent).toBe('5,000');
  });
});
