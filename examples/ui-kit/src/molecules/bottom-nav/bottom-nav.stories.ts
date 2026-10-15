import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/BottomNav',
  parameters: {
    docs: {
      description: {
        component:
          'pop-bottom-nav — a detached, rounded bottom navigation bar with a large center action button in `--grad-brand` (blue→red). Two tabs flank each side of the center button (2+2). The component is presentation-only: `tabselect {id}` fires on a tab press and `centerpress {action}` on the center button — the PARENT decides `center-action` ("scan" for scan-capable users, "add" for manual-add-only users) and does the routing. `compact` is a container query (bar width < 400px) that collapses tab labels; `position="static"` renders in place (used here — the default is detached-fixed above the safe area). Built for yugioh.popcorn245.com, generic for any app. Note: "fab" in this repo means the Fabulous theme — this is deliberately not named pop-fab.',
      },
    },
  },
};

export default meta;

const TABS = JSON.stringify([
  { id: 'collection', label: 'Collection', icon: 'albums-outline', badge: 6 },
  { id: 'decks', label: 'Decks', icon: 'file-tray-stacked-outline' },
  { id: 'search', label: 'Search', icon: 'search-outline' },
  { id: 'profile', label: 'Profile', icon: 'person-circle-outline' },
]);

const NO_BADGE_TABS = JSON.stringify([
  { id: 'collection', label: 'Collection', icon: 'albums-outline' },
  { id: 'decks', label: 'Decks', icon: 'file-tray-stacked-outline' },
  { id: 'search', label: 'Search', icon: 'search-outline' },
  { id: 'profile', label: 'Profile', icon: 'person-circle-outline' },
]);

/** A phone-ish frame so the detached bar reads against a canvas. */
function frame(inner: string, width = 380) {
  return `
    <div style="width:${width}px; max-width:100%; padding: 48px 12px 18px; border:1px solid var(--line,#ddd); border-radius:20px; background: var(--surface-canvas, #f5f7fb);">
      ${inner}
    </div>
  `;
}

/** Default: scan-capable user — the center button opens the scanner. */
export const ScanAction: StoryObj = {
  render: () =>
    frame(`<pop-bottom-nav items='${NO_BADGE_TABS}' active-id="collection" position="static"></pop-bottom-nav>`),
};

/** Allowlist-gated: a user without scan access gets an ADD center action —
 *  the parent picks, the button always renders. */
export const AddAction: StoryObj = {
  render: () =>
    frame(`<pop-bottom-nav items='${NO_BADGE_TABS}' active-id="collection" center-action="add" position="static"></pop-bottom-nav>`),
};

/** The review-count badge bubble on the Collection tab. */
export const ReviewBadge: StoryObj = {
  render: () =>
    frame(`<pop-bottom-nav items='${TABS}' active-id="decks" position="static"></pop-bottom-nav>`),
};

/** Compact (container query): in a narrow frame the tab labels collapse;
 *  widen past 400px of bar width and they come back. */
export const CompactPhone: StoryObj = {
  render: () =>
    frame(`<pop-bottom-nav items='${TABS}' active-id="collection" compact position="static"></pop-bottom-nav>`, 320),
};

/** Disabled (e.g. offline): events are suppressed, the bar dims. */
export const Disabled: StoryObj = {
  render: () =>
    frame(`<pop-bottom-nav items='${TABS}' active-id="collection" disabled position="static"></pop-bottom-nav>`),
};

/** Slot override for the center content. */
export const CenterSlot: StoryObj = {
  render: () =>
    frame(`
      <pop-bottom-nav items='${NO_BADGE_TABS}' active-id="search" center-label="Go" position="static">
        <span slot="center" style="font-weight:800; font-size:0.8rem; color:#fff;">GO</span>
      </pop-bottom-nav>
    `),
};
