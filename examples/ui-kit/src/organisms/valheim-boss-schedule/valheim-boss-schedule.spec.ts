import { newSpecPage, setProps } from '../../test-utils/spec-page';
import { ValheimBossSchedule } from './valheim-boss-schedule';

const BOSSES = JSON.stringify([
  { id: 'eikthyr', name: 'Eikthyr', biome: 'Meadows', week: 'Week 1', status: 'done' },
  { id: 'bonemass', name: 'Bonemass', biome: 'Swamp', week: 'Week 3', status: 'now' },
  { id: 'moder', name: 'Moder', biome: 'Mountain', week: 'Weeks 4–5', status: 'soon', slot2: true },
  { id: 'yagluth', name: 'Yagluth', biome: 'Plains', week: 'Weeks 6–7', status: 'soon', revealed: true },
  { id: 'odin', name: 'Odin — the Ninth Trial', biome: '???', week: 'Week 10', status: 'finale' },
]);

describe('valheim-boss-schedule', () => {
  it('renders the current boss as the target card', async () => {
    const page = await newSpecPage({
      components: [ValheimBossSchedule],
      html: `<valheim-boss-schedule bosses='${BOSSES}'></valheim-boss-schedule>`,
    });
    expect(page.root.querySelector('.vbs-target').textContent).toContain('Bonemass');
  });

  it('NEXT-ONLY SECRECY: players see revealed/past trials + ONE sealed teaser — names, weeks and the season length never leak', async () => {
    const page = await newSpecPage({
      components: [ValheimBossSchedule],
      html: `<valheim-boss-schedule bosses='${BOSSES}'></valheim-boss-schedule>`,
    });
    const list = page.root.querySelector('.vbs-list');
    // Eikthyr (done), Bonemass (now), Yagluth (revealed) are open…
    expect(list.textContent).toContain('Eikthyr');
    expect(list.textContent).toContain('Yagluth');
    // …Moder (unannounced) and the finale are sealed with NO name/biome/week.
    expect(list.textContent).not.toContain('Moder');
    expect(list.textContent).not.toContain('Odin');
    expect(list.textContent).not.toContain('Mountain');
    // Week labels never render for players — the agenda is next-only.
    expect(list.textContent).not.toContain('Week');
    // The whole hidden remainder collapses into ONE teaser row — the count of
    // sealed slots (the season's length) must not leak.
    const sealed = list.querySelectorAll('.vbs-row--sealed');
    expect(sealed.length).toBe(1);
    expect(sealed[0].textContent).toContain('???');
    expect(sealed[0].textContent).toContain('one trial at a time');
    expect(page.root.querySelector('.vlh-legend').textContent).toContain('one trial at a time');
  });

  it('NEXT-ONLY: players with an empty agenda still see only the sealed teaser', async () => {
    const page = await newSpecPage({
      components: [ValheimBossSchedule],
      html: `<valheim-boss-schedule bosses='[]'></valheim-boss-schedule>`,
    });
    const sealed = page.root.querySelectorAll('.vbs-row--sealed');
    expect(sealed.length).toBe(1);
    expect(page.root.querySelectorAll('.vbs-row').length).toBe(1);
  });

  it('SECRECY: isAdmin reveals the full agenda including the finale and week slots', async () => {
    const page = await newSpecPage({
      components: [ValheimBossSchedule],
      html: `<valheim-boss-schedule bosses='${BOSSES}' is-admin="true"></valheim-boss-schedule>`,
    });
    const list = page.root.querySelector('.vbs-list');
    expect(list.textContent).toContain('Moder');
    expect(list.textContent).toContain('Odin — the Ninth Trial');
    expect(list.textContent).toContain('Week 1');
    expect(list.querySelectorAll('.vbs-row--sealed').length).toBe(0);
    // The finale keeps its mystic styling + legend flips to the admin note.
    expect(list.querySelectorAll('.vbs-row--finale').length).toBe(1);
    expect(page.root.querySelector('.vlh-legend').textContent).toContain('Admin view');
  });

  it('EVENT trials render as an Event card — name + prize + the opt-in PvP tag', async () => {
    const trials = JSON.stringify([
      { id: 'regatta', name: 'The Karve Regatta', week: 'Week 4', status: 'now', kind: 'event', prize: 'A silver-lined drinking horn', pvp: true },
      { id: 'toss', name: 'Troll Toss', week: 'Week 6', status: 'soon', kind: 'event', prize: '50 coin', revealed: true },
    ]);
    const page = await newSpecPage({
      components: [ValheimBossSchedule],
      html: `<valheim-boss-schedule bosses='${trials}'></valheim-boss-schedule>`,
    });
    const target = page.root.querySelector('.vbs-target');
    expect(target.classList.contains('vbs-target--event')).toBe(true);
    expect(target.textContent).toContain('The Karve Regatta');
    expect(target.textContent).toContain('Prize: A silver-lined drinking horn');
    expect(target.querySelector('.vbs-pvptag').textContent).toContain('Opt-in PvP');
    // Non-PvP event row: Event pill + prize, no PvP tag.
    const rows = page.root.querySelectorAll('.vbs-row--event');
    expect(rows.length).toBe(2);
    expect(rows[1].textContent).toContain('Prize: 50 coin');
    expect(rows[1].querySelector('.vbs-pvptag')).toBeNull();
  });

  it('rows without a kind stay boss trials (graceful default)', async () => {
    const page = await newSpecPage({
      components: [ValheimBossSchedule],
      html: `<valheim-boss-schedule bosses='${BOSSES}'></valheim-boss-schedule>`,
    });
    expect(page.root.querySelector('.vbs-target').classList.contains('vbs-target--event')).toBe(false);
    expect(page.root.querySelectorAll('.vbs-row--event').length).toBe(0);
  });

  it('emits valheimRsvp from the Answer button', async () => {
    const page = await newSpecPage({
      components: [ValheimBossSchedule],
      html: `<valheim-boss-schedule bosses='${BOSSES}' rsvp-count="12"></valheim-boss-schedule>`,
    });
    let fired = false;
    page.root.addEventListener('valheimRsvp', () => (fired = true));
    expect(page.root.querySelector('.vbs-rsvp').textContent).toContain('12');
    (page.root.querySelector('.vbs-rsvp-go') as HTMLButtonElement).click();
    expect(fired).toBe(true);
  });

  it('showList=false renders only the glance (target + rsvp, no list)', async () => {
    const page = await newSpecPage({
      components: [ValheimBossSchedule],
      html: `<valheim-boss-schedule bosses='${BOSSES}'></valheim-boss-schedule>`,
    });
    await setProps(page, { showList: false });
    expect(page.root.querySelector('.vbs-target')).not.toBeNull();
    expect(page.root.querySelector('.vbs-list')).toBeNull();
  });
});
