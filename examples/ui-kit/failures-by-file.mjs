// Failing specs per file with their first error lines (stencilrs results).
//   node failures-by-file.mjs [filter]
import { readFileSync } from 'node:fs';

const filter = process.argv[2] ?? '';
const report = JSON.parse(readFileSync(new URL('./results/stencilrs.json', import.meta.url), 'utf8'));
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
for (const f of report.testResults) {
  const file = f.name.replace(/\\/g, '/').split('/examples/ui-kit/').pop();
  if (!file.includes(filter)) continue;
  const failed = f.assertionResults.filter((t) => t.status !== 'passed');
  if (!failed.length && f.status !== 'failed') continue;
  console.log(`\n## ${file}`);
  if (!f.assertionResults.length) console.log(`  [load] ${strip(f.message ?? '').split('\n').slice(0, 3).join(' | ')}`);
  for (const t of failed) {
    const lines = strip((t.failureMessages ?? [''])[0]).split('\n');
    const at = lines.find((l) => l.includes('.spec.')) ?? '';
    console.log(`  ✗ ${t.title}\n      ${lines[0].slice(0, 160)}\n      ${at.trim().slice(0, 140)}`);
  }
}
