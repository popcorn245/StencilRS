// Ionic core's stencil.config.ts (v9.0.12), trimmed for this harness. This is the ONLY hand-edited
// copy of the config: the Stencil 4 reference build uses it as is, and `stencil migrate` turns it into
// the Stencil v5 config (scripts/migrate.mjs).
//
// What differs from upstream's core/stencil.config.ts:
//   - the Angular / React / Vue output targets, `docs-vscode`, `dist-hydrate-script` and the
//     api.txt generator are gone (they need packages outside core/ and are not what is measured)
//   - `testing` (Jest) is gone: the specs and e2e tests are not copied
//   - `IONIC_OUT_DIR` (set by scripts/build.mjs) redirects the outputs next to the harness
//   - `enableCache` is off unless IONIC_STENCIL_CACHE=1 (npm run bench's warm rows), so every build is a cold build
// Everything else (bundles, plugins, extras, global script, preamble) is upstream's.
import type { Config } from '@stencil/core';
import { sass } from '@stencil/sass';
import { relative } from 'node:path';

const out = process.env.IONIC_OUT_DIR ?? 'dist-out';

export const config: Config = {
  autoprefixCss: true,
  sourceMap: false,
  namespace: 'Ionic',
  bundles: [
    { components: ['ion-action-sheet'] },
    { components: ['ion-alert'] },
    { components: ['ion-back-button'] },
    { components: ['ion-app', 'ion-router-outlet', 'ion-buttons', 'ion-content', 'ion-footer', 'ion-header', 'ion-title', 'ion-toolbar'] },
    { components: ['ion-avatar', 'ion-badge', 'ion-thumbnail'] },
    { components: ['ion-backdrop'] },
    { components: ['ion-button', 'ion-icon'] },
    { components: ['ion-card', 'ion-card-content', 'ion-card-header', 'ion-card-title', 'ion-card-subtitle'] },
    { components: ['ion-checkbox'] },
    { components: ['ion-chip'] },
    { components: ['ion-datetime'] },
    { components: ['ion-fab', 'ion-fab-button', 'ion-fab-list'] },
    { components: ['ion-grid', 'ion-row', 'ion-col'] },
    { components: ['ion-infinite-scroll', 'ion-infinite-scroll-content'] },
    { components: ['ion-input'] },
    { components: ['ion-textarea'] },
    { components: ['ion-item', 'ion-item-divider', 'ion-item-group', 'ion-label', 'ion-list', 'ion-list-header', 'ion-skeleton-text', 'ion-note'] },
    { components: ['ion-item-sliding', 'ion-item-options', 'ion-item-option'] },
    { components: ['ion-loading'] },
    { components: ['ion-menu', 'ion-menu-toggle', 'ion-menu-button'] },
    { components: ['ion-modal'] },
    { components: ['ion-nav', 'ion-nav-link'] },
    { components: ['ion-img'] },
    { components: ['ion-popover'] },
    { components: ['ion-progress-bar'] },
    { components: ['ion-radio', 'ion-radio-group'] },
    { components: ['ion-range'] },
    { components: ['ion-refresher', 'ion-refresher-content'] },
    { components: ['ion-reorder', 'ion-reorder-group'] },
    { components: ['ion-ripple-effect'] },
    { components: ['ion-router', 'ion-route', 'ion-route-redirect', 'ion-router-link'] },
    { components: ['ion-searchbar'] },
    { components: ['ion-segment', 'ion-segment-button'] },
    { components: ['ion-select', 'ion-select-option', 'ion-select-popover'] },
    { components: ['ion-spinner'] },
    { components: ['ion-split-pane'] },
    { components: ['ion-tabs', 'ion-tab'] },
    { components: ['ion-tab-bar', 'ion-tab-button'] },
    { components: ['ion-text'] },
    { components: ['ion-toast'] },
    { components: ['ion-toggle'] },
    { components: ['ion-accordion-group', 'ion-accordion'] },
    { components: ['ion-breadcrumb', 'ion-breadcrumbs'] },
  ],
  plugins: [sass()],
  outputTargets: [
    {
      type: 'dist',
      dir: `${out}/dist`,
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
      dir: `${out}/components`,
      includeGlobalScripts: false,
      externalRuntime: false,
    },
    {
      type: 'docs-json',
      // Stencil 4 joins `file` onto the root dir, so it has to be relative
      file: relative(process.cwd(), `${out}/docs.json`),
    },
  ],
  // `stencil build --dev --watch --serve` (npm run bench) serves the build folder, not src/
  devServer: { root: out, openBrowser: false },
  preamble: '(C) Ionic http://ionicframework.com - MIT License',
  globalScript: 'src/global/ionic-global.ts',
  enableCache: process.env.IONIC_STENCIL_CACHE === '1',
  transformAliasedImportPaths: true,
  extras: {
    experimentalSlotFixes: true,
    experimentalScopedSlotChanges: true,
    enableImportInjection: true,
  },
};
