// What the always-on parts of runtime.js cost (docs/spike-runtime-size.md): the app built with every optional feature off
// (features.mjs), then again with one part of the core stubbed out of a temporary copy of runtime.js. The stubbed app does not
// work; only its size counts. runtime.js is restored afterwards.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { measure } from './run.mjs';

const file = join(import.meta.dirname, '../../../../runtime.js');
const backup = `${file}.bak-size`;
const off = { server: false, hydrate: false, resume: false, light: false, signals: false, vnode: false, hot: false };

// [name, regex of the part, replacement]
const stubs = [
  ['keyed lists: longest increasing subsequence', /const lis = \(a\) => \{[\s\S]*?\n\};\n/, 'const lis = (a) => new Uint8Array(a.length);\n'],
  ['class= parts (string or object)', /const classSet = [\s\S]*?\nclass StylePart/, 'class ClassPart { set() {} }\nclass StylePart'],
  ['style= parts (string or object)', /class StylePart \{[\s\S]*?\n\}\n/, 'class StylePart { set() {} }\n'],
  ['ref parts', /class RefPart \{[\s\S]*?\n\}\n/, 'class RefPart { set() {} }\n'],
  ['attribute and property parts', /class AttrPart \{[\s\S]*?\n\}\n/, 'class AttrPart { set() {} }\n'],
  ['event parts (onClick, ...)', /class EventPart \{[\s\S]*?\n\}\n/, 'class EventPart { constructor() {} set() {} }\n'],
  ['attribute reflection and serializers', /  const reflect = \(el, name, value\) => \{[\s\S]*?\n  \};\n  meta\.reflectAll = [\s\S]*?\n  \};\n/, '  const reflect = () => {};\n  meta.reflectAll = () => {};\n'],
  ['@Watch', /        if \(this\.__f & HAS_LOADED\) \{\n          if \(watchers\) for \(const m of watchers\) this\[m\]\(value, old, name\);/, '        if (this.__f & HAS_LOADED) {'],
  ['@Listen (window, document, host listeners)', /      for \(const \[ev, method, target\] of meta\.listeners\) \{[\s\S]*?\n      \}\n/, ''],
  ['parent waits for children (loading counter)', /    const pending = \[\];\n[\s\S]*?if \(pending\.length\) await Promise\.all\(pending\);\n/, ''],
  ['componentOnReady and the READY promise', /  componentOnReady\(\) \{[\s\S]*?\n  \}\n  \/\*\* Made on first use[\s\S]*?\n  \}\n/, ''],
  ['adopted stylesheets (and the <style> fallback)', /const sheets = new WeakMap\(\);[\s\S]*?\n\};\n\n\/\/ On the server/, "const sheets = new WeakMap();\nconst cssOf = () => '';\n\n// On the server"],
];

const sizes = async (tag) => {
  const r = await measure(tag, { features: off, tag: `stub-${tag.replace(/\W+/g, '-')}` });
  return r;
};

copyFileSync(file, backup);
try {
  const base = await sizes('base');
  console.log(`all optional features off: raw ${base.raw} gzip ${base.gz} brotli ${base.br}\n`);
  console.log('part of the core'.padEnd(52), '   raw  gzip  brotli');
  for (const [name, re, to] of stubs) {
    copyFileSync(backup, file);
    const src = readFileSync(backup, 'utf8');
    if (!re.test(src)) {
      console.log(`${name.padEnd(52)} (pattern not found)`);
      continue;
    }
    writeFileSync(file, src.replace(re, to));
    try {
      const r = await sizes(name);
      console.log(`${name.padEnd(52)} ${String(base.raw - r.raw).padStart(5)} ${String(base.gz - r.gz).padStart(5)} ${String(base.br - r.br).padStart(6)}`);
    } catch (e) {
      console.log(`${name.padEnd(52)} build failed: ${String(e.message).split('\n')[0]}`);
    }
  }
} finally {
  copyFileSync(backup, file);
}
