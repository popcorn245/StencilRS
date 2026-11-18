// The browser side of the Ionic pages: Ionic's global CSS and config, and lazy loading of the
// components. Every component below is TypeScript + Sass compiled by the stencilrs Vite plugin
// (config.mts) from examples/ionic/migrated, one lazy chunk per component file.
import { addIcons } from 'ionicons';
import {
  add, alarm, albums, arrowBack, arrowForward, call, camera, chevronForward, close, heart, home, informationCircle, mail, menu,
  notifications, person, search, settings, share, star, trash,
} from 'ionicons/icons';
import { defineCustomElement as defineIcon } from 'ionicons/components/ion-icon.js';

import { BUILD } from '@stencil/core/app-data';

import sources from '../../data/ionic-sources.json';

// Ionic's global stylesheet: its color variables, the `.ion-color-*` / `.ion-page` classes and the
// modal and menu rules. Not normalize / structure / typography: those take over <html> and <body>
// (`body { position: fixed; overflow: hidden }`), which would break this page. See ionic.css.
import '../../../examples/ionic/migrated/src/css/core.scss';
import './ionic.css';

// Ionic's components have one stylesheet per mode (`styleUrls: { ios, md }`). Stencil's runtime picks a mode's
// sheet only when `BUILD.mode` is on, which a `stencil build` sets from the components and the Vite plugin
// does not (finding): without it a component with mode styles gets none.
BUILD.mode = true;

export type Mode = 'ios' | 'md';

const lazy = import.meta.glob('../../../examples/ionic/migrated/src/components/*/*.tsx') as Record<string, () => Promise<unknown>>;
const base = '../../../examples/ionic/migrated/';
const loading = new Map<string, Promise<unknown>>();
let ready: Promise<void> | undefined;

/** Ionic's `initialize()` (its global script), the icons, once. Sets <html mode> and the ios / md class. */
export function setupIonic(mode: Mode) {
  ready ??= (async () => {
    const { initialize } = await import('../../../examples/ionic/migrated/src/global/ionic-global');
    document.documentElement.setAttribute('mode', mode);
    initialize({ mode, animated: !matchMedia('(prefers-reduced-motion: reduce)').matches });
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
  const ionic = (window as any).Ionic;
  if (ionic?.config?.set) { ionic.config.set('mode', mode); ionic.mode = mode; }
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
