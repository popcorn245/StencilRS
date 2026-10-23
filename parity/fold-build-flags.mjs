// stencilrs' foldBuildFlags against Stencil v5's own, byte for byte.
//
//   node fold-build-flags.mjs [--verbose]
//
// Inputs: every parity fixture (most never import `Build`, so both return null), the repo's
// example sources, and hand-written cases for what the fold must and must not touch. Each input
// is folded with the flag sets the Vite plugin uses (client, ssr) plus a few odd ones.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { foldBuildFlags as stencilFold } from '@stencil/core/compiler';

import { foldBuildFlags } from '../index.js';
import { listFixtures, root } from './lib.mjs';

const verbose = process.argv.includes('--verbose');
const flagSets = {
  client: { isBrowser: true, isServer: false },
  ssr: { isBrowser: false, isServer: true },
  partial: { isDev: true },
  mixed: { isBrowser: true, isServer: 'no', isDev: undefined, toString: true },
  none: {},
};

/** @type {{ name: string, file: string, code: string }[]} */
const cases = listFixtures().map(({ id, file }) => ({ name: id, file: id, code: readFileSync(file, 'utf8') }));

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.') || name === 'dist') return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?|mjs)$/.test(p) && !p.endsWith('.d.ts') ? [p] : [];
  });
const repo = join(root, '..');
for (const dir of ['examples/starter/src', 'examples/ui-kit/src', 'storybook']) {
  try {
    for (const file of walk(join(repo, dir))) cases.push({ name: file.slice(repo.length + 1), file, code: readFileSync(file, 'utf8') });
  } catch {}
}

const imp = (spec = 'Build', from = '@stencil/core') => `import { Component, ${spec} } from '${from}';\n`;
const hand = {
  'plain read': imp() + 'if (Build.isBrowser) a(); if (Build.isServer) b();',
  'else branch': imp() + 'if (Build.isServer) { a(); } else { b(); }',
  'nested ternaries': imp() + 'const x = Build.isServer ? (Build.isBrowser ? 1 : 2) : Build.isBrowser ? 3 : 4;',
  'aliased import': imp('Build as B') + 'x(B.isServer, B.isBrowser, Build.isServer);',
  'short alias is padded past its length': imp('Build as B') + 'x(B.isServer);',
  'element access': imp() + "x(Build[\"isServer\"], Build['isBrowser'], Build[`isServer`], Build[`${y}`], Build[k]);",
  'optional chain': imp() + 'x(Build?.isServer, Build?.["isBrowser"]);',
  'line break inside the read': imp() + 'x(Build\n  .isServer, Build\r\n\t.isBrowser);',
  'comment and unicode inside the read': imp() + 'x(Build /* é😀 */ .isServer, Build\n /* é😀 */ .isBrowser);',
  'unicode before the read': imp() + 'const s = "é😀"; x(Build.isServer);',
  'flag not given is left': imp() + 'x(Build.isDev, Build.isTesting, Build.isServer, Build.nope);',
  'inherited names are not flags': imp() + 'x(Build.toString, Build.constructor, Build["hasOwnProperty"]);',
  'not from stencil core': "import { Build } from 'other';\nx(Build.isServer);",
  'a different Build': imp('h') + 'const Build = { isServer: 1 };\nx(Build.isServer);',
  'global Build': 'x(Build.isServer);',
  'Build in a string and a comment': imp('h') + '// import { Build } from "@stencil/core"\nx(Build.isServer, "Build.isServer");',
  'default import plus Build': "import Core, { Build } from '@stencil/core';\nx(Build.isServer);",
  'namespace import': "import * as core from '@stencil/core';\nx(core.Build.isServer);",
  'namespace import of Build': "import * as Build from '@stencil/core';\nx(Build.isServer);",
  'import type': "import type { Build } from '@stencil/core';\nx(Build.isServer);",
  'inline type specifier': "import { type Build } from '@stencil/core';\nx(Build.isServer);",
  'inline type specifier beside a value': "import { type Build, Build as B } from '@stencil/core';\nx(B.isServer);",
  'string-named import': "import { 'Build' as B } from '@stencil/core';\nx(B.isServer);",
  'runtime subpaths': "import { Build } from '@stencil/core/runtime/client/standalone';\nx(Build.isServer);",
  'server subpath': "import { Build } from '@stencil/core/runtime/server';\nx(Build.isServer);",
  'other stencil subpath': "import { Build } from '@stencil/core/internal';\nx(Build.isServer);",
  'two imports': imp() + "import { Build as B } from '@stencil/core/runtime/client';\nx(Build.isServer, B.isServer);",
  'shadowed by a parameter': imp() + 'function f(Build) { return Build.isServer; }\nx(Build.isServer);',
  'shadowed by a local': imp() + 'function f() { const Build = {}; return Build.isServer; }\nx(Build.isServer);',
  'shadowed by destructuring': imp() + 'function f({ Build }) { return Build.isServer; }\nx(Build.isServer);',
  'shadowed by a catch clause': imp() + 'try {} catch (Build) { Build.isServer; }\nx(Build.isServer);',
  'shadowed by a function': imp() + 'function g() { function Build() {} }\nx(Build.isServer);',
  'a property named Build is not a shadow': imp() + 'const o = { Build: 1, f(Build2) {} }; x(o.Build, Build.isServer);',
  'shorthand is not a shadow': imp() + 'const o = { Build }; x(o, Build.isServer);',
  'type alias and interface named Build': imp() + 'type Build = number; interface Build {} function f<Build>() {}\nx(Build.isServer);',
  'type query is left': imp() + 'let t: typeof Build.isServer; x(Build.isServer);',
  'assigned to': imp() + 'Build.isServer = true; x(Build.isServer);',
  'compound assigned': imp() + 'Build.isServer ||= true; x(Build.isServer);',
  'incremented': imp() + 'Build.isServer++; x(Build.isServer);',
  'deleted': imp() + 'delete Build.isServer; x(Build.isServer);',
  'assigned to an unrelated flag': imp() + 'Build.other = 1; x(Build.isServer);',
  'parenthesised object': imp() + 'x((Build).isServer);',
  'in a class and a decorator': imp() + '@Component({ tag: "a-b" }) class A { @Prop() p = Build.isServer; render() { return Build.isBrowser ? 1 : null; } }',
  'in JSX': imp() + 'const j = <div hidden={Build.isServer}>{Build.isBrowser && <b/>}</div>;',
  'a type-only reference': imp() + 'let x: Build; let y = Build.isServer;',
  'no Build use': imp(),
};
for (const [name, code] of Object.entries(hand)) {
  // JSX only parses as .tsx / .jsx, and type syntax as TypeScript.
  const files = name === 'in JSX' ? ['hand.tsx', 'hand.jsx'] : ['hand.tsx', 'hand.ts', 'hand.mts'];
  for (const file of files) cases.push({ name: `${name} (${file})`, file, code });
}

const show = (s) => (s === null ? 'null' : JSON.stringify(s));
let compared = 0;
let folded = 0;
const failures = [];
for (const c of cases) {
  for (const [setName, flags] of Object.entries(flagSets)) {
    const expected = stencilFold(c.code, c.file, flags);
    const actual = foldBuildFlags(c.code, c.file, flags);
    compared++;
    if (expected !== null) folded++;
    if (expected !== actual) failures.push({ name: `${c.name} [${setName}]`, expected, actual });
    else if (verbose && expected !== null) console.log(`ok   ${c.name} [${setName}] ${show(expected).slice(0, 100)}`);
  }
}

console.log(`foldBuildFlags: ${compared - failures.length}/${compared} match Stencil (${cases.length} inputs, ${folded} folded by Stencil)`);
for (const f of failures.slice(0, 20)) {
  console.log(`FAIL ${f.name}\n  stencil:   ${show(f.expected)}\n  stencilrs: ${show(f.actual)}`);
}
process.exit(failures.length ? 1 : 0);
