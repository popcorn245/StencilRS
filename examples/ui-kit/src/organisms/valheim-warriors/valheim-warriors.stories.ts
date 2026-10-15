import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Valheim/Warriors',
  parameters: {
    docs: {
      description: {
        component:
          'valheim-warriors — the online-roster + server-health block of the Valheim raid-league surfaces. Theme-agnostic: ALL color rides the `--vlh-*` token layer (styles/valheim-skins.css) — wrap in `.vlh-skin--hub` for the Popcorn 245 hub look or `.vlh-skin--norse` for the in-universe public page. Admin server ops (restart/stop/backup) render only when `is-admin` and emit `valheimServerAction` for the host to enqueue a valheimCommands outbox doc.',
      },
    },
  },
};
export default meta;

const PLAYERS = JSON.stringify([
  { name: 'Bjornwulf', class: 'Axe-thegn · iron-forged', level: 47, rune: 'ᚦ' },
  { name: 'Sigrun Frostmaiden', class: 'Bow-singer · light of foot', level: 44, rune: 'ᛗ' },
  { name: 'Rurik Ironside', class: 'Shield-wall · never yields', level: 45, rune: 'ᚱ' },
]);
const HEALTH = JSON.stringify({ uptimeSec: 14 * 86400 + 6 * 3600, tps: 58, pingMs: 32, lastBackupAt: Date.now() - 22 * 60000 });

function frame(inner: string, skin = 'vlh-skin--hub') {
  return `<div class="${skin}" style="max-width: 420px; padding: 12px; background: var(--vlh-bg, #eef3fb); border-radius: 12px;">${inner}</div>`;
}

/** The hub (admin panel) skin — matches hub-inventory's visual language. */
export const Hub: StoryObj = {
  render: () => frame(`<valheim-warriors players='${PLAYERS}' max-players="20" health='${HEALTH}'></valheim-warriors>`),
};

/** Admin view adds the server-ops row (restart / stop / backup). */
export const HubAdmin: StoryObj = {
  render: () => frame(`<valheim-warriors players='${PLAYERS}' max-players="20" health='${HEALTH}' is-admin="true"></valheim-warriors>`),
};

/** The SAME component under the in-universe Norse skin (public event page). */
export const Norse: StoryObj = {
  render: () => frame(`<valheim-warriors players='${PLAYERS}' max-players="20" health='${HEALTH}'></valheim-warriors>`, 'vlh-skin--norse'),
};

/** Server unreachable / empty halls. */
export const Offline: StoryObj = {
  render: () => frame(`<valheim-warriors players='[]' online="false" is-admin="true"></valheim-warriors>`),
};
