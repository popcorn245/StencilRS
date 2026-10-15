import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Valheim/BossSchedule',
  parameters: {
    docs: {
      description: {
        component:
          'valheim-boss-schedule — the trials agenda + countdown + RSVP block, with the NEXT-ONLY secrecy rule both Popcorn\'s Pantheon surfaces share: players see only announced (`revealed`) + past trials (week labels stripped) and the whole hidden remainder collapses into ONE sealed "???" teaser — the gods reveal one trial at a time, so not even the season length leaks; `is-admin` overrides and shows the full agenda. The finale is never revealed to players early. Theme-agnostic via `--vlh-*` (wrap in `.vlh-skin--hub` / `.vlh-skin--norse`).',
      },
    },
  },
};
export default meta;

const BOSSES = JSON.stringify([
  { id: 'eikthyr', name: 'Eikthyr', biome: 'Meadows', week: 'Week 1', status: 'done' },
  { id: 'regatta', name: 'The Karve Regatta', week: 'Week 2', status: 'done', kind: 'event', prize: 'A silver-lined drinking horn', pvp: true },
  { id: 'elder', name: 'The Elder', biome: 'Black Forest', week: 'Week 3', status: 'done' },
  { id: 'bonemass', name: 'Bonemass', biome: 'Swamp', week: 'Week 4', status: 'now' },
  { id: 'toss', name: 'Troll Toss', week: 'Week 5', status: 'soon', kind: 'event', prize: '50 coin' },
  { id: 'moder', name: 'Moder', biome: 'Mountain', week: 'Weeks 6–7', status: 'soon', slot2: true },
  { id: 'yagluth', name: 'Yagluth', biome: 'Plains', week: 'Weeks 8–9', status: 'soon', slot2: true },
  { id: 'odin', name: 'Odin — the Final Trial', biome: '??? · the finale realm', week: 'The last week', status: 'finale' },
]);
const NIGHT = Date.now() + (2 * 86400 + 14 * 3600 + 22 * 60) * 1000;

function frame(inner: string, skin = 'vlh-skin--hub') {
  return `<div class="${skin}" style="max-width: 420px; padding: 12px; background: var(--vlh-bg, #eef3fb); border-radius: 12px;">${inner}</div>`;
}

/** ADMIN view (the hub panel): full schedule, finale visible but styled sealed. */
export const AdminFullSchedule: StoryObj = {
  render: () =>
    frame(`<valheim-boss-schedule bosses='${BOSSES}' is-admin="true" rsvp-count="12" boss-night-at="${NIGHT}"></valheim-boss-schedule>`),
};

/** PLAYER view (the public page): next-only — revealed trials + ONE sealed teaser. */
export const PlayerSealed: StoryObj = {
  render: () =>
    frame(`<valheim-boss-schedule bosses='${BOSSES}' rsvp-count="12" boss-night-at="${NIGHT}"></valheim-boss-schedule>`, 'vlh-skin--norse'),
};

/** The Overview-tab glance: target + RSVP only, no list. */
export const Glance: StoryObj = {
  render: () =>
    frame(`<valheim-boss-schedule bosses='${BOSSES}' heading="The next trial" show-list="false" rsvp-count="12" boss-night-at="${NIGHT}"></valheim-boss-schedule>`),
};
