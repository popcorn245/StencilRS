// The browser side of the Ionic pages: Ionic's global CSS and config, and lazy loading of the
// components. Every component below is TypeScript + Sass compiled by the stencilrs Vite plugin
// (config.mts) from examples/ionic/migrated, one lazy chunk per component file.
import { addIcons } from 'ionicons';
import {
  add, alarm, albums, arrowBack, arrowForward, call, camera, chevronForward, close, heart, home, informationCircle, mail, menu,
  notifications, person, search, settings, share, star, trash,
} from 'ionicons/icons';
import { defineCustomElement as defineIcon } from 'ionicons/components/ion-icon.js';

import sources from '../../data/ionic-sources.json';

// Ionic's global stylesheet: its color variables, the `.ion-color-*` / `.ion-page` classes and the
// modal and menu rules. Not normalize / structure / typography: those take over <html> and <body>
// (`body { position: fixed; overflow: hidden }`), which would break this page. See ionic.css.
import '../../../examples/ionic/migrated/src/css/core.scss';
import './ionic.css';

export type Mode = 'ios' | 'md';

const lazy = import.meta.glob('../../../examples/ionic/migrated/src/components/*/*.tsx') as Record<string, () => Promise<unknown>>;
const base = '../../../examples/ionic/migrated/';
const loading = new Map<string, Promise<unknown>>();
let ready: Promise<void> | undefined;
let init: ((config?: Record<string, unknown>) => void) | undefined;
const config = (mode: Mode) => ({ mode, animated: !matchMedia('(prefers-reduced-motion: reduce)').matches });

/** Ionic's `initialize()` (its global script), the icons, once. Sets <html mode> and the ios / md class. */
export function setupIonic(mode: Mode) {
  ready ??= (async () => {
    const { initialize } = await import('../../../examples/ionic/migrated/src/global/ionic-global');
    init = initialize;
    document.documentElement.setAttribute('mode', mode);
    initialize(config(mode));
    addIcons({ add, alarm, albums, arrowBack, arrowForward, call, camera, chevronForward, close, heart, home, informationCircle, mail, menu, notifications, person, search, settings, share, star, trash });
    // ion-icon is Ionicons' own package (a prebuilt Stencil component), not Ionic core.
    defineIcon();
  })();
  return ready;
}

/** `<html mode>` and its class, which Ionic's mode lookup and its global CSS (`html.ios ...`) read. */
export function applyMode(mode: Mode) {
  const html = document.documentElement;
  html.setAttribute('mode', mode);
  html.classList.remove('ios', 'md');
  html.classList.add(mode);
  // Ionic's own `initialize()` again: it keeps the default mode in a variable of its own, which a component with a
  // single stylesheet (no per-mode `$modeName$`; ion-content, ion-modal's content) reads for its `md` / `ios` class.
  init?.(config(mode));
}

/** The tags and everything they render, as far as the source names it. */
export function closure(tags: Iterable<string>, extra: string[] = []): string[] {
  const out = new Set<string>();
  const visit = (t: string) => {
    if (out.has(t) || !(sources as any)[t]) return;
    out.add(t);
    for (const d of (sources as any)[t].deps) visit(d);
  };
  for (const t of tags) visit(t);
  for (const t of extra) visit(t);
  return [...out];
}

export function loadTags(tags: Iterable<string>, extra: string[] = []) {
  return Promise.all(
    closure(tags, extra).map((tag) => {
      let p = loading.get(tag);
      if (!p) {
        const load = lazy[base + (sources as any)[tag].file];
        p = load ? load() : Promise.reject(new Error(`no source for <${tag}>`));
        loading.set(tag, p);
      }
      return p;
    }),
  );
}

export function tagsIn(html: string) {
  return new Set([...html.matchAll(/<(ion-[a-z-]+)/g)].map((m) => m[1]));
}

export const knownTags = Object.keys(sources);
