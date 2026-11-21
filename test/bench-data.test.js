// The README's headline benchmark numbers must match storybook/docs/data/benchmarks.json,
// the data the site draws its charts from. Re-run a benchmark, and this says what to update.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const data = JSON.parse(read('../storybook/docs/data/benchmarks.json'));
const readme = read('../README.md');
const x = (n) => `${n >= 10 ? Math.round(n) : n.toFixed(1)}×`;

test('README headline matches the warm ui-kit numbers', () => {
  const t = data.transpile.rows;
  const v = data.viteBuild.rows;
  assert.ok(readme.includes(`**${x(t[0].medianMs / t[2].medianMs)} faster per file**`), 'per-file speedup');
  assert.ok(readme.includes(`**${x(v[0].warmMedianMs / v[1].warmMedianMs)} faster** for a production Vite build`), 'vite build speedup');
});

test('cold-start rows exist and the README headline matches them', () => {
  assert.ok(data.coldBuild && data.coldDev, 'benchmarks.json has coldBuild and coldDev');
  for (const e of [data.coldBuild, data.coldDev]) {
    assert.equal(e.rows.length, 2);
    assert.equal(typeof e.preview, 'boolean');
    assert.ok(e.machine && e.date && e.runs > 0);
  }
  const b = data.coldBuild.rows;
  const d = data.coldDev.rows;
  assert.ok(readme.includes(`about **${x(b[1].wallMedianMs / b[0].wallMedianMs)} faster**`), 'cold build speedup');
  // stencilrs first (d[0]), Stencil v5 second: "N× sooner" when stencilrs answers first, "N× slower" when it does not.
  const dev = d[1].firstResponseMedianMs / d[0].firstResponseMedianMs;
  const devText = dev >= 1 ? `about **${x(dev)} sooner**` : `about **${x(1 / dev)} slower**`;
  assert.ok(readme.includes(devText), `cold dev: README should say ${devText}`);
});
