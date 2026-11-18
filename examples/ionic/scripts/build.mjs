// The builds of Ionic core, all into this folder:
//   node scripts/build.mjs stencil    migrated/ (Stencil v5.0.0-beta.25)  ->  dist-stencil/
//   node scripts/build.mjs stencilrs  migrated/ through stencilrs' Vite plugin (vite.config.ts)  ->  dist-stencilrs/
//   node scripts/build.mjs stencil4   stock upstream (Stencil 4.45.4)     ->  dist-stencil4/
// Each is a cold, uncached `stencil build` of the same component set with the same output targets
// (lazy loader, standalone/custom-elements, docs-json). The full log goes to logs/<name>.log; the console
// gets everything except Sass's deprecation chatter, which is ~80k lines per build of Stencil's own Sass plugin
// (the stencilrs build silences it with the plugin's `css.sass` option, and its log is printed unfiltered).
import { spawn, execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, rmSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './paths.mjs';
import { copyCore } from './copy-core.mjs';

const target = process.argv[2];
if (!['stencil', 'stencil4', 'stencilrs'].includes(target)) {
  console.error('usage: node scripts/build.mjs stencil|stencil4|stencilrs');
  process.exit(2);
}

const v5 = target !== 'stencil4';
const outDir = join(root, { stencil: 'dist-stencil', stencil4: 'dist-stencil4', stencilrs: 'dist-stencilrs' }[target]);
let cwd;
let bin;

if (v5) {
  cwd = join(root, 'migrated');
  if (!existsSync(join(cwd, 'stencil.config.ts'))) {
    console.error('migrated/ is missing: run `npm run fetch && npm run migrate` first');
    process.exit(1);
  }
  bin = join(root, 'node_modules', '.bin', target === 'stencilrs' ? 'vite' : 'stencil');
  rmSync(join(cwd, 'dist'), { recursive: true, force: true });
} else {
  const tools = join(root, 'stencil4');
  if (!existsSync(join(root, 'upstream', 'core', 'src'))) {
    console.error('upstream/ is missing: run `npm run fetch` first');
    process.exit(1);
  }
  if (!existsSync(join(tools, 'node_modules', '.bin', 'stencil'))) {
    console.log('installing the Stencil 4 toolchain (stencil4/)...');
    execFileSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: tools, stdio: 'inherit' });
  }
  // The stock source is upstream's core/ unchanged (no codemod); only the config is swapped for the trimmed one.
  cwd = join(tools, 'stock');
  console.log(`copied ${copyCore(cwd)} entries from upstream/core into stencil4/stock/`);
  copyFileSync(join(root, 'config', 'stencil.config.v4.ts'), join(cwd, 'stencil.config.ts'));
  bin = join(tools, 'node_modules', '.bin', 'stencil');
  // minimal package.json (as in migrate.mjs) so Stencil 4 does not warn about upstream's publishing fields
  const upstream = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
  writeFileSync(
    join(cwd, 'package.json'),
    JSON.stringify(
      {
        name: upstream.name,
        version: upstream.version,
        license: upstream.license ?? 'MIT',
        private: true,
        module: '../../dist-stencil4/dist/index.js',
        main: '../../dist-stencil4/dist/index.cjs.js',
        types: './dist/types/interface.d.ts',
        collection: '../../dist-stencil4/dist/collection/collection-manifest.json',
        files: ['../../dist-stencil4/dist/', '../../dist-stencil4/components/', '../../dist-stencil4/loader/', './dist/types/'],
      },
      null,
      2
    ) + '\n'
  );
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(root, 'logs'), { recursive: true });
const log = createWriteStream(join(root, 'logs', `${target}.log`));
const started = performance.now();
const child = spawn(bin, target === 'stencilrs' ? ['build', '--config', join(root, 'vite.config.ts')] : ['build'], { cwd: target === 'stencilrs' ? root : cwd, env: { ...process.env, IONIC_OUT_DIR: outDir, FORCE_COLOR: '0' } });

let noisy = false;
const filter = (chunk) => {
  log.write(chunk);
  for (const line of chunk.toString().split('\n')) {
    // A Sass deprecation is a header line plus an indented source excerpt; drop the whole block.
    if (target === 'stencilrs') console.log(line);
    else if (/^DEPRECATION WARNING|^WARNING: \d+ repetitive deprecation/.test(line)) noisy = true;
    else if (/^\[/.test(line) || /^\s*(Error|SyntaxError)/.test(line)) noisy = false;
    if (!noisy && line.trim() && !/^\s*(Suggestion:|Use color\.mix|More info|Run in verbose)/.test(line)) console.log(line);
  }
};
child.stdout.on('data', filter);
child.stderr.on('data', filter);
child.on('exit', (code) => {
  log.end();
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`\n${target}: ${target === "stencilrs" ? "vite build" : "stencil build"} exited ${code} in ${seconds}s (full log: logs/${target}.log)`);
  if (code === 0 && target === 'stencilrs') {
    // vite.config.ts writes css/ itself; `verbose: true` logs how many files stencilrs left to Stencil's compiler.
    const summary = readFileSync(join(root, 'logs', 'stencilrs.log'), 'utf8').match(/\[stencilrs\] compiled .*/)?.[0] ?? 'no [stencilrs] summary in the log';
    console.log(`${target}: ${summary.replace("[stencilrs] ", '')} -> ${outDir}`);
  } else if (code === 0) {
    // Ionic's global stylesheets (css/core.css, ...) are a separate Sass build in upstream (`npm run css.sass`)
    const sass = join(v5 ? root : join(root, 'stencil4'), 'node_modules', '.bin', 'sass');
    execFileSync(sass, ['--quiet', '--no-source-map', '--style', 'compressed', `${join(cwd, 'src', 'css')}:${join(outDir, 'css')}`]);
    const docs = JSON.parse(readFileSync(join(outDir, 'docs.json'), 'utf8'));
    console.log(`${target}: ${docs.components.length} components in docs.json -> ${outDir}`);
  }
  process.exit(code ?? 1);
});
