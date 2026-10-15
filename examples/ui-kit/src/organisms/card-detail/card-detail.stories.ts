import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Components/Organisms/CardDetail',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'pop-card-detail — the tap-a-card bottom sheet: art (with a user-photo toggle), ' +
          'identity (set code · rarity · edition · condition), quantity stepper, price + ' +
          'refresh, printing row (host fills the `printing-picker` slot), needs-review ' +
          'resolution CTA, move-to-binder, split stack (quantity ≥ 2) and delete (confirm). ' +
          'Fully presentational: pass a plain `card` view-model (JSON attr or property) and ' +
          'listen for ONE `popCardAction` event per intent — the host owns every API call. ' +
          'A `scanState: "scanning"` card renders the read-only resolving state.',
      },
    },
  },
};
export default meta;

// A stand-in for canonical art / a user photo (self-contained, no network):
// two card-ish SVG data URIs so the art area and photo toggle render offline.
const ART = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 118 172"><rect width="118" height="172" rx="8" fill="#6d28d9"/><rect x="10" y="14" width="98" height="72" rx="4" fill="#c4b5fd"/><circle cx="59" cy="50" r="22" fill="#4c1d95"/><rect x="10" y="96" width="98" height="62" rx="4" fill="#ede9fe"/><text x="59" y="132" font-size="11" text-anchor="middle" fill="#4c1d95" font-family="sans-serif">CARD ART</text></svg>`,
)}`;
const PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 118 172"><rect width="118" height="172" rx="8" fill="#334155"/><rect x="8" y="12" width="102" height="148" rx="4" fill="#94a3b8"/><text x="59" y="90" font-size="11" text-anchor="middle" fill="#1e293b" font-family="sans-serif">YOUR PHOTO</text></svg>`,
)}`;

interface StoryCard {
  id: string;
  name: string;
  imageUrl?: string | null;
  photoUrl?: string | null;
  setCode?: string | null;
  rarity?: string | null;
  edition?: string | null;
  condition?: string | null;
  quantity: number;
  price?: number | null;
  priceUpdatedAt?: number | null;
  needsReview?: boolean;
  reviewReason?: string | null;
  scanState?: string | null;
  containerName?: string | null;
  hasPasscode?: boolean;
}

const BASE: StoryCard = {
  id: 'c1',
  name: 'Dark Magician',
  imageUrl: ART,
  photoUrl: null,
  setCode: 'SDY-006',
  rarity: 'Ultra Rare',
  edition: '1st Edition',
  condition: 'LP',
  quantity: 1,
  price: 4.55,
  priceUpdatedAt: Date.now() - 2 * 3_600_000,
  needsReview: false,
};

const CONTAINERS = [
  { id: 'b1', name: 'Blue binder' },
  { id: 'b2', name: 'Trade box' },
];

const PRINTINGS = [
  { code: 'SDY-006', rarity: 'Ultra Rare', price: '$4.55', on: true },
  { code: 'LOB-005', rarity: 'Ultra Rare', price: '$12.10', on: false },
  { code: 'YGLD-ENA03', rarity: 'Common', price: '$1.02', on: false },
];

/** The host-injected printings list (what hub-inventory slots in). */
function printingPicker() {
  return `<div slot="printing-picker" style="display:flex;flex-direction:column;gap:0.35rem;">
    ${PRINTINGS.map(
      (p) => `
      <button type="button" style="display:flex;gap:0.6rem;align-items:baseline;font:inherit;text-align:left;padding:0.5rem 0.65rem;border-radius:9px;border:1px solid ${p.on ? 'var(--accent,#6366f1)' : 'var(--line,rgba(127,127,127,0.25))'};background:${p.on ? 'color-mix(in oklab, var(--accent,#6366f1) 12%, transparent)' : 'var(--surface-card,transparent)'};color:var(--ink,inherit);cursor:pointer;">
        <strong style="min-width:7.5rem;">${p.code}</strong>
        <span style="flex:1;font-size:0.85rem;color:var(--ink-soft,inherit);">${p.rarity}</span>
        <span style="font-variant-numeric:tabular-nums;">${p.price}</span>
      </button>`,
    ).join('')}
  </div>`;
}

function sheet(card: StoryCard, opts: { attrs?: string; slot?: string } = {}) {
  const json = JSON.stringify(card).replace(/'/g, '&#39;');
  const containers = JSON.stringify(CONTAINERS).replace(/'/g, '&#39;');
  return `
    <div style="min-height: 640px;">
      <p style="padding: 1rem; color: var(--ink-muted, #888);">
        The sheet is open below (bottom-sheet composition). Watch the <code>popCardAction</code>
        events in the Actions panel as you tap controls.
      </p>
      <pop-card-detail open card='${json}' containers='${containers}' ${opts.attrs ?? ''}>
        ${opts.slot ?? printingPicker()}
      </pop-card-detail>
    </div>
  `;
}

/** Priced, resolved — the full layout with every action. */
export const PricedResolved: StoryObj = {
  name: 'Priced, resolved (full layout)',
  render: () => sheet(BASE),
};

/** Unpriced — price row shows *unpriced* and the refresh CTA is emphasized. */
export const Unpriced: StoryObj = {
  name: 'Unpriced (refresh CTA emphasized)',
  render: () => sheet({ ...BASE, id: 'c2', name: 'Kuriboh', price: null, priceUpdatedAt: null, setCode: 'MRD-071', rarity: 'Common', condition: 'NM' }),
};

/** Needs review — badge + reason + the Pick-the-printing CTA. */
export const NeedsReview: StoryObj = {
  name: 'Needs review (pick the printing)',
  render: () => sheet({ ...BASE, id: 'c3', needsReview: true, reviewReason: 'set code unreadable', price: null, priceUpdatedAt: null }),
};

/** Needs review with NO passcode — the picker can't populate; offer Rescan. */
export const NeedsReviewNoPasscode: StoryObj = {
  name: 'Needs review, no passcode (rescan)',
  render: () => sheet({ ...BASE, id: 'c4', needsReview: true, hasPasscode: false, setCode: null, rarity: null, price: null, priceUpdatedAt: null }, { slot: '' }),
};

/** A streaming placeholder still resolving — read-only, Delete only. */
export const ScanningPlaceholder: StoryObj = {
  name: 'Scanning placeholder (read-only)',
  render: () => sheet({ ...BASE, id: 'c5', scanState: 'scanning', price: null, priceUpdatedAt: null, setCode: null, rarity: null, edition: null, condition: null }, { slot: '' }),
};

/** Quantity ≥ 2 — the Split stack action appears (vs hidden at 1). */
export const StackOfCopies: StoryObj = {
  name: 'Quantity 4 (split visible) + binder',
  render: () => sheet({ ...BASE, id: 'c6', quantity: 4, containerName: 'Blue binder' }),
};

/** No canonical art — the card-back placeholder; user photo (if any) primary. */
export const NoArt: StoryObj = {
  name: 'No art (placeholder)',
  render: () => sheet({ ...BASE, id: 'c7', imageUrl: null, photoUrl: null }),
};

/** Canonical art + a user photo — the thumbnail toggle swaps them. */
export const WithUserPhoto: StoryObj = {
  name: 'With a user photo (toggle)',
  render: () => sheet({ ...BASE, id: 'c8', photoUrl: PHOTO }),
};

/** A long name — headline wraps, meta stays readable. */
export const LongName: StoryObj = {
  name: 'Long name',
  render: () =>
    sheet({
      ...BASE,
      id: 'c9',
      name: 'Superheavy Samurai Beast Kyubi the Great Divine Speed Deity of the Boundless Horizon',
      setCode: 'DUNE-EN035',
      rarity: 'Quarter Century Secret Rare',
    }),
};
