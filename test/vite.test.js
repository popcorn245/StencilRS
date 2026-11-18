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

test('a mode stylesheet of a scoped component is scoped to sc-<tag>-<mode>, the class the runtime sets', async () => {
  write('moded.tsx', `import { Component, h } from '@stencil/core';
@Component({ tag: 'cmp-moded', styleUrls: { ios: 'moded.ios.css', md: 'moded.md.css' }, encapsulation: { type: 'scoped' } })
export class CmpModed { render() { return <div>x</div>; } }
`);
  write('moded.ios.css', ':host { display: block; } .a { color: red; }');
  write('moded.md.css', ':host { display: flex; }');
  const code = await run('moded.tsx');
  assert.match(code, /\.sc-cmp-moded-ios-h/);
  assert.match(code, /\.sc-cmp-moded-md-h/);
  assert.doesNotMatch(code, /\.sc-cmp-moded-h\b/);
});

test('component CSS: Stencil\'s autoprefix targets by default, `css` options to change them', async () => {
  write('styled.tsx', `import { Component, h } from '@stencil/core';
@Component({ tag: 'cmp-styled', styleUrl: 'styled.css', encapsulation: { type: 'shadow' } })
export class CmpStyled { render() { return <div>x</div>; } }
`);
  write('styled.css', ':host { backdrop-filter: blur(2px); font-weight: bold; background: none; }');
  const out = async (css) => (await run('styled.tsx', css ? { css } : {})).match(/:host[^`"]*/)?.[0] ?? '';
  const stencil = await out();
  assert.match(stencil, /-webkit-backdrop-filter/, 'prefixed for the targets of `stencil build`');
  assert.match(stencil, /font-weight:\s*bold/, 'values as authored');
  assert.match(stencil, /background:\s*none/);
  assert.doesNotMatch(stencil, /\\n/, 'whitespace compacted');
  const legacy = await out({ targets: false, minify: true });
  assert.doesNotMatch(legacy, /-webkit-backdrop-filter/);
  assert.match(legacy, /font-weight:\s*700/, 'lightningcss minify');
  assert.match(await out({ targets: ['safari 13'] }), /-webkit-backdrop-filter/);
});

test('a util importing from @stencil/core gets the runtime the components use', async () => {
  write('mode-util.ts', `import { getMode } from '@stencil/core';\nexport const m = (el: HTMLElement) => getMode(el);\n`);
  write('uses-util.ts', `import './ported.tsx';\nimport { m } from './mode-util.ts';\nconsole.log(m);\n`);
  // (the shared `run` externalizes bare '@stencil/core' before any plugin sees it: only its subpaths here)
  const result = await build({
    root: project,
    configFile: false,
    logLevel: 'silent',
    plugins: [stencilrs()],
    build: { write: false, lib: { entry: join(project, 'src', 'uses-util.ts'), formats: ['es'], fileName: 'out' }, rollupOptions: { external: [/^@stencil\/core\//] } },
  });
  const code = [result].flat().flatMap((r) => r.output.filter((o) => o.type === 'chunk').map((o) => o.code)).join('\n');
  assert.match(code, /@stencil\/core\/runtime\/client\/standalone/);
  assert.doesNotMatch(code, /from ['"]@stencil\/core['"]/);
});

test('a tsconfig with useDefineForClassFields: false makes @Prop defaults constructor assignments', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'stencilrs-udf-'));
  try {
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { jsx: 'react', jsxFactory: 'h', useDefineForClassFields: false } }));
    writeFileSync(
      join(dir, 'src', 'p.tsx'),
      `import { Component, Prop, h } from '@stencil/core';\n@Component({ tag: 'cmp-p' })\nexport class CmpP { @Prop() kind = 'a'; render() { return <div>{this.kind}</div>; } }\n`,
    );
    const result = await build({
      root: dir,
      configFile: false,
      logLevel: 'silent',
      plugins: [stencilrs()],
      build: { write: false, lib: { entry: join(dir, 'src', 'p.tsx'), formats: ['es'], fileName: 'out' }, rollupOptions: { external: [/^@stencil\/core/] } },
    });
    const code = [result].flat().flatMap((r) => r.output.filter((o) => o.type === 'chunk').map((o) => o.code)).join('\n');
    assert.match(code, /__registerHost\(\)[\s\S]*this\.kind = "a"/);
    assert.doesNotMatch(code, /^\s*kind = "a"/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
