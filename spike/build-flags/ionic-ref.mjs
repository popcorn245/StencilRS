// Bundles the app-tabs subset of Stencil's own standalone output (examples/ionic/dist-stencil/components) into one chunk with Vite, for gzip size.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const [ionicDir, work] = process.argv.slice(2);
const SUBSET = ['app', 'tabs', 'tab', 'tab-bar', 'tab-button', 'label', 'header', 'toolbar', 'title', 'content', 'card', 'card-header', 'card-title', 'card-subtitle', 'card-content', 'list', 'item', 'avatar', 'note', 'searchbar', 'toggle', 'select', 'select-option', 'input', 'checkbox', 'button', 'ripple-effect', 'backdrop', 'spinner', 'popover', 'text', 'badge', 'chip', 'skeleton-text'];
const dir = join(ionicDir, 'dist-stencil/components');
mkdirSync(work, { recursive: true });
let i = 0;
const lines = [];
for (const c of process.env.ALL ? [] : SUBSET) {
  const f = join(dir, `ion-${c}.js`);
  if (!existsSync(f)) { console.log('missing', c); continue; }
  lines.push(`import { defineCustomElement as d${i} } from ${JSON.stringify(f)}; d${i++}();`);
}
writeFileSync(join(work, 'entry.js'), lines.join('\n') + '\n');
const { build } = await import(pathToFileURL(createRequire(ionicDir + '/x.js').resolve('vite')).href);
await build({ root: work, configFile: false, logLevel: 'warn', build: { lib: { entry: join(work, 'entry.js'), formats: ['es'], fileName: 'ref' }, outDir: join(work, 'dist'), emptyOutDir: true } });
console.log('built', i, 'components');
