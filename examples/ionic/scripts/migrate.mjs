// Turn upstream/core (Stencil 4) into migrated/ (Stencil v5), reproducibly.
//
//   1. copy core/ without tests and stories                     (copy-core.mjs)
//   2. drop in config/stencil.config.v4.ts, the trimmed config
//   3. `stencil migrate`: Stencil's own codemod for the config and the components
//   4. our patches for what `stencil migrate` leaves: see the numbered list below
//
// Nothing in upstream/ or migrated/ is ever committed. Re-running starts from a fresh copy.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './paths.mjs';
import { patches, tsconfigPatches } from './patches.mjs';
import { copyCore } from './copy-core.mjs';

const dest = join(root, 'migrated');
if (!existsSync(join(root, 'upstream', 'core', 'src'))) throw new Error('upstream/ is missing: run `npm run fetch` first');

const copied = copyCore(dest);
console.log(`copied ${copied} entries from upstream/core into migrated/`);
copyFileSync(join(root, 'config', 'stencil.config.v4.ts'), join(dest, 'stencil.config.ts'));

// --- step 3: stencil migrate -------------------------------------------------------------------
const stencil = join(root, 'node_modules', '.bin', 'stencil');
mkdirSync(join(root, 'logs'), { recursive: true });
let migrateOut;
try {
  migrateOut = execFileSync(stencil, ['migrate'], { cwd: dest, encoding: 'utf8' });
} catch (err) {
  console.error(`stencil migrate exited with ${err.status}:\n${err.stdout ?? ''}${err.stderr ?? ''}`);
  process.exit(1);
}
writeFileSync(join(root, 'logs', 'migrate.log'), migrateOut);
const summary = migrateOut.slice(migrateOut.indexOf('Migration Summary'));
console.log(summary.split('\n').map((l) => l.replace(/^\[[\d:.]+\]\s+/, '')).join('\n').trim());
console.log('(full stencil migrate output: logs/migrate.log)\n');

// --- step 4: our patches ---------------------------------------------------------------------
// 4a. tsconfig.json
{
  const file = join(dest, 'tsconfig.json');
  let text = readFileSync(file, 'utf8');
  if (tsconfigPatches.removeBaseUrl) text = text.replace(/\n\s*"baseUrl": "\.",/, '');
  text = text.replace(/"(src\/utils|src\/global)\//g, '"./$1/');
  const extra = Object.entries(tsconfigPatches.extraPaths)
    .map(([k, v]) => `"${k}": ${JSON.stringify(v)},`)
    .join('\n      ');
  text = text.replace('"paths": {', `"paths": {\n      ${extra}`);
  writeFileSync(file, text);
}

// 4a'. config: v5 discovers every .css/.scss under src as a possible "CSS-only component" and runs the Sass
// plugin on each partial standalone, which fails on partials that rely on their importer's variables.
{
  const file = join(dest, 'stencil.config.ts');
  const text = readFileSync(file, 'utf8');
  const anchor = /^  enableCache: .*,\n/m;
  if (!anchor.test(text)) throw new Error('stencil.config.ts: enableCache anchor not found');
  writeFileSync(file, text.replace(anchor, (line) => `${line}  enableCssOnlyComponents: false,\n`));
}
// 4a-ter. config: `stencil migrate` rewrites esmLoaderPath '../loader' to loaderPath '../../loader', which lands
// outside the build folder (next to package.json). Put the loader beside `dist/`, as the Stencil 4 build does.
{
  const file = join(dest, 'stencil.config.ts');
  const text = readFileSync(file, 'utf8');
  if (!text.includes("loaderPath: '../../loader'")) throw new Error('stencil.config.ts: loaderPath anchor not found');
  writeFileSync(file, text.replace("loaderPath: '../../loader'", "loaderPath: '../loader'"));
}
// 4a-bis. config: `stencil migrate` turns `extras` into `compat` but leaves `experimentalScopedSlotChanges`, an
// option v5 no longer has (the behaviour is built in; `compat.lightDomPatches` already defaults to true).
{
  const file = join(dest, 'stencil.config.ts');
  const text = readFileSync(file, 'utf8');
  const next = text.replace(/\n  compat: \{\s*experimentalScopedSlotChanges: true,\s*\},/, '');
  if (next === text) throw new Error('stencil.config.ts: compat block not found');
  writeFileSync(file, next);
}

// 4a''. config: ionicons ships invalid CSS that lightningcss rejects; config/ionicons-css-fix.ts repairs it in flight.
{
  const file = join(dest, 'stencil.config.ts');
  let text = readFileSync(file, 'utf8');
  for (const anchor of ['plugins: [sass()],', "import { sass } from '@stencil/sass';"]) {
    if (!text.includes(anchor)) throw new Error(`stencil.config.ts: anchor not found: ${anchor}`);
  }
  text = text
    .replace('plugins: [sass()],', 'plugins: [sass(), ioniconsCssFix],')
    .replace("import { sass } from '@stencil/sass';", "import { sass } from '@stencil/sass';\nimport { ioniconsCssFix } from './ionicons-css-fix';");
  writeFileSync(file, text);
  copyFileSync(join(root, 'config', 'ionicons-css-fix.ts'), join(dest, 'ionicons-css-fix.ts'));
}

// 4a'''. package.json: v5 validates it against the build output. Build outputs go to ../dist-stencil, so keep
// a minimal one that points there (upstream's exports map, scripts and devDependencies are not used).
{
  const file = join(dest, 'package.json');
  const upstream = JSON.parse(readFileSync(file, 'utf8'));
  const pkg = {
    name: upstream.name,
    version: upstream.version,
    license: upstream.license ?? 'MIT',
    private: true,
    type: 'module',
    module: '../dist-stencil/dist/index.js',
    // v5 always writes declarations to ./dist/types (next to package.json), whatever `dir` says
    types: './dist/types/index.d.ts',
    collection: 'dist/collection/collection-manifest.json',
    files: ['../dist-stencil/dist/', '../dist-stencil/components/', './dist/types/', './dist/assets/', './dist/collection/'],
  };
  writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
}

// 4b. source patches
for (const { file, find, replace, why } of patches) {
  const path = join(dest, file);
  const text = readFileSync(path, 'utf8');
  const hits = text.split(find).length - 1;
  if (hits !== 1) throw new Error(`patch for ${file} matched ${hits} times (expected 1): ${why}`);
  writeFileSync(path, text.replace(find, () => replace));
}
console.log(`applied ${patches.length} source patches and the tsconfig patch`);
