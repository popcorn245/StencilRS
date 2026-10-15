// Group the failing ui-kit specs by their first error line, for one compiler's results.
//   node failures.mjs [stencilrs|stencil]
import { readFileSync } from 'node:fs';

const which = process.argv[2] ?? 'stencilrs';
const report = JSON.parse(readFileSync(new URL(`./results/${which}.json`, import.meta.url), 'utf8'));
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

const groups = new Map();
const files = new Map();
for (const f of report.testResults) {
  const file = f.name.replace(/\\/g, '/').split('/examples/ui-kit/').pop();
  if (!f.assertionResults.length && f.status === 'failed') {
    const key = `[file failed to load] ${strip(f.message ?? '').split('\n')[0].slice(0, 100)}`;
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }
  for (const t of f.assertionResults) {
    if (t.status === 'passed') continue;
    const first = strip((t.failureMessages ?? [''])[0]).split('\n')[0].slice(0, 120);
    const key = first.replace(/"[^"]*"/g, '"…"').replace(/'[^']*'/g, "'…'").replace(/\d+/g, 'N');
    groups.set(key, [...(groups.get(key) ?? []), `${file} › ${t.title}`]);
    files.set(file, (files.get(file) ?? 0) + 1);
  }
}

for (const [key, items] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${String(items.length).padStart(4)}  ${key}`);
  for (const item of items.slice(0, 3)) console.log(`        ${item}`);
}
console.log(`\n${[...files.values()].reduce((a, b) => a + b, 0)} failing tests in ${files.size} spec files`);
