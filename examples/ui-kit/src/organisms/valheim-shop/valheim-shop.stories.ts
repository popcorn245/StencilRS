import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Valheim/Shop',
  parameters: {
    docs: {
      description: {
        component:
          "valheim-shop — the curated-economy block: current tier, Haldor's stock (locked wares show their unlock gate), and the bot's weekly stock/unlock proposal. Approve/Tweak render only when `is-admin` and emit `valheimShopAction` — the host writes the real valheimCommands outbox doc the valheim-agent applies to the TradersExtended/WAP configs. Theme-agnostic via `--vlh-*`.",
      },
    },
  },
};
export default meta;

const TIER = JSON.stringify({ name: 'Swamp', tag: 'Unlocked by felling Bonemass' });
const ITEMS = JSON.stringify([
  { name: 'Chain', desc: 'for the flail', price: 450 },
  { name: 'Fishing Rod', desc: 'patience of Njord', price: 350 },
  { name: 'Ymir Flesh', desc: 'frost-cold meat', price: 120 },
  { name: 'Megingjord', desc: 'belt of strength', price: 950 },
  { name: 'Wisp Torch', desc: 'light for the Mistlands', locked: true, lockNote: 'After Moder' },
  { name: 'Feather Cape', desc: 'glide from the peaks', locked: true, lockNote: 'After Moder' },
]);
const PROPOSAL = JSON.stringify({
  subtitle: 'Bonemass has fallen — the merchant senses opportunity',
  lines: [
    { kind: 'add', text: 'Add Root Mask to stock', value: '+ 620' },
    { kind: 'raise', text: 'Raise Megingjord (scarcity)', value: '950 → 1,100' },
    { kind: 'unlock', text: 'Next unlock after Moder', value: 'Silver tier' },
  ],
});

function frame(inner: string, skin = 'vlh-skin--hub') {
  return `<div class="${skin}" style="max-width: 420px; padding: 12px; background: var(--vlh-bg, #eef3fb); border-radius: 12px;">${inner}</div>`;
}

/** Player view: tier + stock + the pending proposal (read-only). */
export const Player: StoryObj = {
  render: () => frame(`<valheim-shop tier='${TIER}' items='${ITEMS}' proposal='${PROPOSAL}'></valheim-shop>`),
};

/** Admin view adds Approve / Tweak on the proposal. */
export const Admin: StoryObj = {
  render: () => frame(`<valheim-shop tier='${TIER}' items='${ITEMS}' proposal='${PROPOSAL}' is-admin="true"></valheim-shop>`),
};

/** The same component under the Norse (public page) skin. */
export const Norse: StoryObj = {
  render: () => frame(`<valheim-shop tier='${TIER}' items='${ITEMS}'></valheim-shop>`, 'vlh-skin--norse'),
};
