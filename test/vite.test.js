import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { build } from 'vite';

import stencilrs from '../vite.js';

const require = createRequire(import.meta.url);
// TypeScript is CommonJS: if anything loaded it, it is in the module cache.
const typescriptLoaded = () => Object.keys(require.cache).some((f) => /[\\/]node_modules[\\/]typescript[\\/]/.test(f));

const project = mkdtempSync(join(tmpdir(), 'stencilrs-vite-'));
after(() => rmSync(project, { recursive: true, force: true }));

const component = (tag, cls) => `import { Component, h } from '@stencil/core';
@Component({ tag: '${tag}' })
export class ${cls} {
  render() { return <div>${tag}</div>; }
}
`;
// Non-string `styles` is something stencilrs has not ported yet: the file is left to Stencil's compiler.
const unported = `import { Component, h } from '@stencil/core';
const css = ':host { color: red; }';
@Component({ tag: 'cmp-unported', styles: css })
export class CmpUnported {
  render() { return <div>cmp-unported</div>; }
}
`;
const ported = component('cmp-ported', 'CmpPorted');
const write = (name, text) => {
  mkdirSync(join(project, 'src'), { recursive: true });
  writeFileSync(join(project, 'src', name), text);
};
write('ported.tsx', ported);
write('unported.tsx', unported);
// A decorated word in a doc comment is not a decorated class.
write('util.ts', `/** Kept apart: a @Component() file may only export its class. */\nexport const x: number = 1;\n`);

const run = async (entry, options = {}) => {
  const result = await build({
    root: project,
    configFile: false,
    logLevel: 'silent',
    plugins: [stencilrs(options)],
    build: {
      write: false,
      lib: { entry: join(project, 'src', entry), formats: ['es'], fileName: 'out' },
      rollupOptions: { external: [/^@stencil\/core/] },
    },
  });
  return [result].flat().flatMap((r) => r.output.filter((o) => o.type === 'chunk').map((o) => o.code)).join('\n');
};

test('a build stencilrs compiles entirely never loads TypeScript', async () => {
  write('both-ok.ts', `import './ported.tsx';\nimport { x } from './util.ts';\nconsole.log(x);\n`);
  const code = await run('both-ok.ts');
  assert.match(code, /cmp-ported/);
  assert.match(code, /defineCustomElement/);
  assert.equal(typescriptLoaded(), false, 'TypeScript was loaded');
});

test('a file stencilrs has not ported falls back to Stencil\'s compiler, loaded on demand', async () => {
  const code = await run('unported.tsx');
  assert.match(code, /cmp-unported/);
  assert.match(code, /defineCustomElement/);
  assert.equal(typescriptLoaded(), true, 'the fallback did not load Stencil\'s compiler');
});

test('fallback: false makes an unported file an error', async () => {
  await assert.rejects(run('unported.tsx', { fallback: false }), /not ported yet/);
});
