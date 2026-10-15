import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Valheim/StandingsBoard',
  parameters: {
    docs: {
      description: {
        component:
          "valheim-standings-board — The Pantheon ⟷ Juggernaut standings. The Pantheon (default, CO-OP) table carries bounties · coin · bosses · Falls (deaths to the world — playful, never PvP) with medal ranks; the Juggernaut view is the hidden FINALE bounty board (PvP banner + current target + price). The Juggernaut toggle only renders once the finale is active (or for admins) so its existence never leaks the season-end twist. Theme-agnostic via `--vlh-*`.",
      },
    },
  },
};
export default meta;

const STANDINGS = JSON.stringify([
  { name: 'Bjornwulf', rune: 'ᚦ', kills: 318, deaths: 11, bounties: 9, coin: 2480, bosses: 3 },
  { name: 'Rurik Ironside', rune: 'ᚱ', kills: 276, deaths: 7, bounties: 8, coin: 2110, bosses: 3 },
  { name: 'Sigrun Frostmaiden', rune: 'ᛗ', kills: 254, deaths: 14, bounties: 7, coin: 1940, bosses: 2 },
  { name: 'Eldgrim Stoneheart', rune: 'ᛖ', kills: 221, deaths: 9, bounties: 6, coin: 1620, bosses: 2 },
  { name: 'Astrid Runecaster', rune: 'ᚨ', kills: 198, deaths: 19, bounties: 5, coin: 1405, bosses: 1 },
  { name: 'Halvard the Green', rune: 'ᛟ', kills: 142, deaths: 6, bounties: 7, coin: 1190, bosses: 1 },
]);
const JUG = JSON.stringify({ active: true, targetName: 'Bjornwulf', bounty: 5000, pvpOn: true });

function frame(inner: string, skin = 'vlh-skin--hub') {
  return `<div class="${skin}" style="max-width: 460px; padding: 12px; background: var(--vlh-bg, #eef3fb); border-radius: 12px;">${inner}</div>`;
}

/** The Pantheon — the co-op default view (no Juggernaut toggle pre-finale). */
export const League: StoryObj = {
  render: () => frame(`<valheim-standings-board standings='${STANDINGS}'></valheim-standings-board>`),
};

/** Finale live: the Juggernaut toggle appears for everyone. */
export const JuggernautLive: StoryObj = {
  render: () => frame(`<valheim-standings-board standings='${STANDINGS}' juggernaut='${JUG}'></valheim-standings-board>`),
};

/** Admin preview of the (not yet active) finale board, under the Norse skin. */
export const NorseAdmin: StoryObj = {
  render: () => frame(`<valheim-standings-board standings='${STANDINGS}' is-admin="true"></valheim-standings-board>`, 'vlh-skin--norse'),
};
