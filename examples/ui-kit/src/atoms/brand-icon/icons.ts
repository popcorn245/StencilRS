/**
 * Icon registry for `pop-brand-icon` — a bundled, offline, themeable SVG set.
 *
 * Each entry is the inner markup of a 24×24 `<svg viewBox="0 0 24 24">`. Outline
 * icons (`fill` unset) are drawn with `stroke="currentColor"`; solid icons set
 * `fill: true` and are painted with `fill="currentColor"`. Everything inherits
 * the surrounding text colour, so a single set themes for light + dark.
 *
 * Names map 1:1 to the emoji they replace across the notes-app:
 *   star ★ · link 🔗 · edit ✎ · trash 🗑 · check ✓ · close ✕ · restore ↩ ·
 *   sparkles ✦ · home ⌂ · clock ◷ · search ⌕🔍 · settings ⚙ · grid ⌗ ·
 *   graph ◍ · copy ⧉ · chevron-right ▸ · info ⓘ · warning ⚠ · sun ☀ · moon 🌙 ·
 *   menu ☰ · external ↗ · bot 🤖 · lock 🔒 · globe 🌐 · users 👪 · heart 💞 ·
 *   mic 🎙 · scissors ✂ · doc 📄 · notebook 📓 · monitor 🖥 · refresh ↻ · play ▶ ·
 *   filter · chevron-left ‹ · dot ·
 */
export interface IconDef {
  /** Inner SVG markup (paths/shapes). */
  body: string;
  /** Painted with `fill=currentColor` (solid) instead of stroke (outline). */
  fill?: boolean;
}

const ICONS = {
  // ── pinning / favourites ──────────────────────────────────────────────
  star: {
    fill: true,
    body: '<path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 2.5z"/>',
  },
  'star-outline': {
    body: '<path d="M12 3.2l2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 16.9l-5.3 2.61 1.01-5.9L3.42 9.43l5.93-.86L12 3.2z"/>',
  },

  // ── linking / navigation ──────────────────────────────────────────────
  link: {
    body: '<path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 7.07 7.07l1.14-1.14"/>',
  },
  external: {
    body: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  },
  'chevron-left': { body: '<polyline points="15 18 9 12 15 6"/>' },
  'chevron-right': { body: '<polyline points="9 18 15 12 9 6"/>' },
  'arrow-back': { body: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>' },

  // ── editing / actions ─────────────────────────────────────────────────
  edit: {
    body: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  },
  trash: {
    body: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  },
  check: { body: '<polyline points="20 6 9 17 4 12"/>' },
  close: { body: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' },
  restore: {
    body: '<polyline points="9 14 4 9 9 4"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/>',
  },
  refresh: {
    body: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  },
  copy: {
    body: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  },
  scissors: {
    body: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
  },
  filter: { body: '<path d="M3 5h18M6 12h12M10 19h4"/>' },
  play: { fill: true, body: '<path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"/>' },

  // ── AI / assistant ────────────────────────────────────────────────────
  sparkles: {
    body: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/><path d="M18.5 14.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z"/>',
  },

  // ── surfaces / structure ──────────────────────────────────────────────
  home: {
    body: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/>',
  },
  grid: {
    body: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  },
  graph: {
    body: '<circle cx="12" cy="5" r="2.4"/><circle cx="5" cy="17" r="2.4"/><circle cx="19" cy="17" r="2.4"/><line x1="11" y1="7" x2="6.5" y2="15"/><line x1="13" y1="7" x2="17.5" y2="15"/><line x1="7.2" y1="17" x2="16.8" y2="17"/>',
  },
  inbox: {
    body: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  },
  menu: { body: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>' },
  tag: {
    body: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  },
  settings: {
    body: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  },

  // ── search / info / status ────────────────────────────────────────────
  search: { body: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' },
  info: { body: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/>' },
  warning: {
    body: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  },
  clock: { body: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>' },

  // ── theme ─────────────────────────────────────────────────────────────
  sun: {
    body: '<circle cx="12" cy="12" r="4.2"/><line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/><line x1="4.2" y1="4.2" x2="6" y2="6"/><line x1="18" y1="18" x2="19.8" y2="19.8"/><line x1="1.5" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22.5" y2="12"/><line x1="4.2" y1="19.8" x2="6" y2="18"/><line x1="18" y1="6" x2="19.8" y2="4.2"/>',
  },
  moon: { body: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>' },
  monitor: {
    body: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  },

  // ── provenance / visibility ───────────────────────────────────────────
  bot: {
    body: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/><line x1="9" y1="13" x2="9" y2="14"/><line x1="15" y1="13" x2="15" y2="14"/><line x1="2" y1="13" x2="2" y2="16"/><line x1="22" y1="13" x2="22" y2="16"/>',
  },
  lock: {
    body: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  },
  globe: {
    body: '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
  },
  users: {
    body: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  },
  heart: {
    body: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>',
  },
  mic: {
    body: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>',
  },

  // ── documents ─────────────────────────────────────────────────────────
  doc: {
    body: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/>',
  },
  notebook: {
    body: '<path d="M4 4a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2z"/><line x1="8" y1="2" x2="8" y2="22"/>',
  },

  // ── misc ──────────────────────────────────────────────────────────────
  dot: { fill: true, body: '<circle cx="12" cy="12" r="3"/>' },
  'dot-outline': { body: '<circle cx="12" cy="12" r="4"/>' },
  target: {
    body: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  },
} satisfies Record<string, IconDef>;

export type BrandIconName = keyof typeof ICONS;

/** The registry, widened so `def.fill` is always accessible by name. */
export const ICON_PATHS: Record<BrandIconName, IconDef> = ICONS;

/** All registered icon names (handy for stories / a picker). */
export const ICON_NAMES = Object.keys(ICONS) as BrandIconName[];
