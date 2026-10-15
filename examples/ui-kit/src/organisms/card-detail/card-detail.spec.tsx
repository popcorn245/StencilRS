import { newSpecPage } from '../../test-utils/spec-page';
import { PopCardDetail } from './card-detail';
import {
  CARD_CONDITIONS,
  formatPrice,
  identityParts,
  isResolving,
  parseCardModel,
  parseContainers,
  relativeTime,
} from './card-detail-logic';

// Component render uses the real clock; keep the fixture relative to it.
const NOW = Date.now();

const CARD = {
  id: 'card1',
  name: 'Dark Magician',
  imageUrl: 'https://img.example/dm.jpg',
  photoUrl: null,
  setCode: 'SDY-006',
  rarity: 'Ultra Rare',
  edition: '1st Edition',
  condition: 'LP',
  quantity: 1,
  price: 4.55,
  priceUpdatedAt: NOW - 5 * 60_000,
  needsReview: false,
  scanState: null,
};

const CONTAINERS = [
  { id: 'b1', name: 'Blue binder' },
  { id: 'b2', name: 'Trade box' },
];

function mk(card: Record<string, unknown>, attrs = '') {
  const json = JSON.stringify(card).replace(/'/g, '&#39;');
  const containers = JSON.stringify(CONTAINERS).replace(/'/g, '&#39;');
  return `<pop-card-detail open card='${json}' containers='${containers}' ${attrs}></pop-card-detail>`;
}

// ── logic helpers ────────────────────────────────────────────────────────────

describe('card-detail-logic', () => {
  it('parseCardModel accepts a JSON string and an object; rejects junk', () => {
    expect(parseCardModel(JSON.stringify(CARD))?.name).toBe('Dark Magician');
    expect(parseCardModel({ ...CARD })?.setCode).toBe('SDY-006');
    expect(parseCardModel('not json')).toBeNull();
    expect(parseCardModel('')).toBeNull();
    expect(parseCardModel(null)).toBeNull();
    expect(parseCardModel({ id: 'x' })).toBeNull(); // no name
  });

  it('parseCardModel defaults: quantity 1, hasPasscode true, non-numeric price → null', () => {
    const m = parseCardModel({ id: 'x', name: 'Kuriboh', price: 'n/a' })!;
    expect(m.quantity).toBe(1);
    expect(m.hasPasscode).toBe(true);
    expect(m.price).toBeNull();
    expect(parseCardModel({ id: 'x', name: 'Kuriboh', hasPasscode: false })!.hasPasscode).toBe(false);
  });

  it('parseContainers handles JSON strings, arrays and junk', () => {
    expect(parseContainers(JSON.stringify(CONTAINERS))).toHaveLength(2);
    expect(parseContainers(CONTAINERS)[1].name).toBe('Trade box');
    expect(parseContainers('nope')).toEqual([]);
    expect(parseContainers([{ id: '', name: 'x' }, null])).toEqual([]);
  });

  it('isResolving is true only for scanState scanning', () => {
    expect(isResolving(parseCardModel({ ...CARD, scanState: 'scanning' }))).toBe(true);
    expect(isResolving(parseCardModel(CARD))).toBe(false);
    expect(isResolving(null)).toBe(false);
  });

  it('formatPrice renders dollars or unpriced', () => {
    expect(formatPrice(4.5)).toBe('$4.50');
    expect(formatPrice(0)).toBe('$0.00');
    expect(formatPrice(null)).toBe('unpriced');
    expect(formatPrice(undefined)).toBe('unpriced');
  });

  it('relativeTime buckets minutes/hours/days and tolerates junk', () => {
    expect(relativeTime(NOW - 10_000, NOW)).toBe('just now');
    expect(relativeTime(NOW - 5 * 60_000, NOW)).toBe('5m ago');
    expect(relativeTime(NOW - 3 * 3_600_000, NOW)).toBe('3h ago');
    expect(relativeTime(NOW - 2 * 86_400_000, NOW)).toBe('2d ago');
    expect(relativeTime(null, NOW)).toBe('');
    expect(relativeTime(NaN, NOW)).toBe('');
  });

  it('identityParts skips blanks', () => {
    expect(identityParts(parseCardModel(CARD)!)).toEqual(['SDY-006', 'Ultra Rare', '1st Edition']);
    expect(identityParts(parseCardModel({ id: 'x', name: 'Kuriboh' })!)).toEqual([]);
  });
});

// ── component rendering ──────────────────────────────────────────────────────

describe('pop-card-detail rendering', () => {
  it('renders the full resolved layout: art, identity, qty, price, printing, actions', async () => {
    const page = await newSpecPage({ components: [PopCardDetail], html: mk(CARD) });
    expect(page.root.querySelector('.pcd__art-img')?.getAttribute('src')).toBe(CARD.imageUrl);
    expect(page.root.querySelector('.pcd__name')?.textContent).toBe('Dark Magician');
    expect(page.root.querySelector('.pcd__meta')?.textContent).toContain('SDY-006');
    expect(page.root.querySelector('.pcd__qty')?.textContent).toBe('1');
    expect(page.root.querySelector('.pcd__price')?.textContent).toBe('$4.55');
    expect(page.root.querySelector('.pcd__asof')?.textContent).toContain('5m ago');
    expect(page.root.querySelector('.pcd__printing-code')?.textContent).toBe('SDY-006');
    expect(page.root.querySelector('.pcd__rowbtn--danger')).toBeTruthy();
    // qty 1 → no split action
    expect(page.root.textContent).not.toContain('Split stack');
    // no review badge
    expect(page.root.querySelector('.pcd__review-badge')).toBeNull();
  });

  it('renders nothing when closed or without a card', async () => {
    const closed = await newSpecPage({
      components: [PopCardDetail],
      html: `<pop-card-detail card='${JSON.stringify(CARD)}'></pop-card-detail>`,
    });
    expect(closed.root.querySelector('.pcd')).toBeNull();
    const noCard = await newSpecPage({ components: [PopCardDetail], html: `<pop-card-detail open></pop-card-detail>` });
    expect(noCard.root.querySelector('.pcd')).toBeNull();
  });

  it('unpriced → italic "unpriced" and the refresh CTA emphasis, no as-of', async () => {
    const page = await newSpecPage({
      components: [PopCardDetail],
      html: mk({ ...CARD, price: null, priceUpdatedAt: null }),
    });
    expect(page.root.querySelector('.pcd__price--none')?.textContent).toBe('unpriced');
    expect(page.root.querySelector('.pcd__refresh--cta')).toBeTruthy();
    expect(page.root.querySelector('.pcd__asof')).toBeNull();
  });

  it('needs review → badge + reason + Pick-the-printing CTA', async () => {
    const page = await newSpecPage({
      components: [PopCardDetail],
      html: mk({ ...CARD, needsReview: true, reviewReason: 'set code unreadable' }),
    });
    expect(page.root.querySelector('.pcd__review-badge')?.textContent).toContain('needs review');
    expect(page.root.querySelector('.pcd__review-reason')?.textContent).toBe('set code unreadable');
    expect(page.root.querySelector('.pcd__cta')?.textContent).toContain('Pick the printing');
  });

  it('needs review WITHOUT a passcode → Rescan CTA and a disabled printing row', async () => {
    const page = await newSpecPage({
      components: [PopCardDetail],
      html: mk({ ...CARD, needsReview: true, hasPasscode: false }),
    });
    expect(page.root.querySelector('.pcd__cta')?.textContent).toContain('Rescan');
    const printingRow = page.root.querySelector('.pcd__printing .pcd__rowbtn') as HTMLButtonElement;
    expect(printingRow.disabled).toBe(true);
  });

  it('scanState scanning → read-only resolving state: no stepper/price/printing, Delete only', async () => {
    const page = await newSpecPage({
      components: [PopCardDetail],
      html: mk({ ...CARD, scanState: 'scanning', quantity: 3 }),
    });
    expect(page.root.querySelector('.pcd__resolving')?.textContent).toContain('resolving printing');
    expect(page.root.querySelector('.pcd__stepper')).toBeNull();
    expect(page.root.querySelector('.pcd__price-row')).toBeNull();
    expect(page.root.querySelector('.pcd__printing')).toBeNull();
    expect(page.root.textContent).not.toContain('Split stack');
    expect(page.root.querySelector('.pcd__rowbtn--danger')).toBeTruthy();
  });

  it('quantity ≥ 2 → the Split stack action appears with the condition chips', async () => {
    const page = await newSpecPage({ components: [PopCardDetail], html: mk({ ...CARD, quantity: 3 }) });
    expect(page.root.textContent).toContain('Split stack');
    const inst = page.rootInstance as PopCardDetail;
    inst.splitOpen = true;
    await page.waitForChanges();
    const chips = Array.from(page.root.querySelectorAll('.pcd__choice--chip')).map((c) => c.textContent);
    expect(chips).toEqual(CARD_CONDITIONS);
  });

  it('no canonical art + no photo → the card-back placeholder', async () => {
    const page = await newSpecPage({
      components: [PopCardDetail],
      html: mk({ ...CARD, imageUrl: null, photoUrl: null }),
    });
    expect(page.root.querySelector('.pcd__art-ph')).toBeTruthy();
    expect(page.root.querySelector('.pcd__art-img')).toBeNull();
  });

  it('no canonical art but a user photo → the photo is primary (no toggle)', async () => {
    const page = await newSpecPage({
      components: [PopCardDetail],
      html: mk({ ...CARD, imageUrl: null, photoUrl: 'https://img.example/mine.jpg' }),
    });
    expect(page.root.querySelector('.pcd__art-img')?.getAttribute('src')).toBe('https://img.example/mine.jpg');
    expect(page.root.querySelector('.pcd__photo-toggle')).toBeNull();
  });

  it('both art and photo → the thumbnail toggle swaps the primary image', async () => {
    const page = await newSpecPage({
      components: [PopCardDetail],
      html: mk({ ...CARD, photoUrl: 'https://img.example/mine.jpg' }),
    });
    const toggle = page.root.querySelector('.pcd__photo-toggle') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect(page.root.querySelector('.pcd__art-img')?.getAttribute('src')).toBe(CARD.imageUrl);
    toggle.click();
    await page.waitForChanges();
    expect(page.root.querySelector('.pcd__art-img')?.getAttribute('src')).toBe('https://img.example/mine.jpg');
  });

  it('busy → mutation controls disable', async () => {
    const page = await newSpecPage({ components: [PopCardDetail], html: mk({ ...CARD, quantity: 2 }, 'busy') });
    const buttons = Array.from(
      page.root.querySelectorAll('.pcd__stepper button, .pcd__rowbtn, .pcd__cta'),
    ) as HTMLButtonElement[];
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) expect(b.disabled).toBe(true);
  });
});

// ── event emission ───────────────────────────────────────────────────────────

type ActionDetail = { action: string; payload?: Record<string, unknown> };

async function collectActions(card: Record<string, unknown>, attrs = '') {
  const page = await newSpecPage({ components: [PopCardDetail], html: mk(card, attrs) });
  const actions: ActionDetail[] = [];
  page.root.addEventListener('popCardAction', (ev) => actions.push((ev as CustomEvent<ActionDetail>).detail));
  return { page, actions };
}

describe('pop-card-detail events', () => {
  it('qty stepper emits qty ±1 (minus disabled at 0)', async () => {
    const { page, actions } = await collectActions({ ...CARD, quantity: 2 });
    const [minus, plus] = Array.from(page.root.querySelectorAll('.pcd__stepper button')) as HTMLButtonElement[];
    plus.click();
    minus.click();
    expect(actions).toEqual([
      { action: 'qty', payload: { delta: 1 } },
      { action: 'qty', payload: { delta: -1 } },
    ]);

    const zero = await collectActions({ ...CARD, quantity: 0 });
    const minus0 = zero.page.root.querySelector('.pcd__stepper button') as HTMLButtonElement;
    expect(minus0.disabled).toBe(true);
  });

  it('refresh button emits refresh-price', async () => {
    const { page, actions } = await collectActions(CARD);
    (page.root.querySelector('.pcd__price-row .pcd__iconbtn') as HTMLButtonElement).click();
    expect(actions).toEqual([{ action: 'refresh-price' }]);
  });

  it('printing row emits open-printings when opening (not when closing) and reveals the slot', async () => {
    const { page, actions } = await collectActions(CARD);
    const row = page.root.querySelector('.pcd__printing .pcd__rowbtn') as HTMLButtonElement;
    row.click();
    await page.waitForChanges();
    expect(actions).toEqual([{ action: 'open-printings' }]);
    expect(page.root.querySelector('.pcd__printing-body--open')).toBeTruthy();
    row.click();
    await page.waitForChanges();
    expect(actions).toHaveLength(1); // closing does not re-emit
    expect(page.root.querySelector('.pcd__printing-body--open')).toBeNull();
  });

  it('condition select emits set-condition with the new grade only', async () => {
    const { page, actions } = await collectActions(CARD); // current: LP
    const select = page.root.querySelector('.pcd__select') as HTMLSelectElement;
    select.value = 'NM';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.value = 'LP'; // same as current → no emit
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(actions).toEqual([{ action: 'set-condition', payload: { condition: 'NM' } }]);
  });

  it('move action lists the containers and emits move with the chosen id', async () => {
    const { page, actions } = await collectActions(CARD);
    const moveRow = Array.from(page.root.querySelectorAll('.pcd__actions .pcd__rowbtn')).find((b) =>
      b.textContent?.includes('Move to binder'),
    ) as HTMLButtonElement;
    moveRow.click();
    await page.waitForChanges();
    const choice = Array.from(page.root.querySelectorAll('.pcd__choice')).find((c) =>
      c.textContent?.includes('Trade box'),
    ) as HTMLButtonElement;
    choice.click();
    expect(actions).toEqual([{ action: 'move', payload: { containerId: 'b2' } }]);
  });

  it('split chooser emits split with the target condition', async () => {
    const { page, actions } = await collectActions({ ...CARD, quantity: 4 });
    const splitRow = Array.from(page.root.querySelectorAll('.pcd__actions .pcd__rowbtn')).find((b) =>
      b.textContent?.includes('Split stack'),
    ) as HTMLButtonElement;
    splitRow.click();
    await page.waitForChanges();
    const chip = Array.from(page.root.querySelectorAll('.pcd__choice--chip')).find((c) => c.textContent === 'MP') as HTMLButtonElement;
    chip.click();
    expect(actions).toEqual([{ action: 'split', payload: { condition: 'MP' } }]);
  });

  it('needs-review CTA opens the printings area and emits open-printings', async () => {
    const { page, actions } = await collectActions({ ...CARD, needsReview: true });
    (page.root.querySelector('.pcd__cta') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(actions).toEqual([{ action: 'open-printings' }]);
    expect(page.root.querySelector('.pcd__printing-body--open')).toBeTruthy();
  });

  it('rescan CTA emits rescan', async () => {
    const { page, actions } = await collectActions({ ...CARD, needsReview: true, hasPasscode: false });
    (page.root.querySelector('.pcd__cta') as HTMLButtonElement).click();
    expect(actions).toEqual([{ action: 'rescan' }]);
  });

  it('delete emits only after the confirm dialog resolves true', async () => {
    const { page, actions } = await collectActions(CARD);
    const inst = page.rootInstance as PopCardDetail & { confirmEl?: { confirm(): Promise<boolean> } };
    inst.confirmEl = { confirm: async () => true };
    (page.root.querySelector('.pcd__rowbtn--danger') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    expect(actions).toEqual([{ action: 'delete' }]);

    const declined = await collectActions(CARD);
    const inst2 = declined.page.rootInstance as PopCardDetail & { confirmEl?: { confirm(): Promise<boolean> } };
    inst2.confirmEl = { confirm: async () => false };
    (declined.page.root.querySelector('.pcd__rowbtn--danger') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    expect(declined.actions).toEqual([]);
  });
});
