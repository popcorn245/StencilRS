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

// The Ionic data (site/data/benchmarks-ionic.json) carries the like-for-like rows the Benchmarks page's tables read. The published
// file may predate them (the rows arrive with the next full run on the benchmark machine): then the page draws nothing for them
// (`hasLf` in site/benchmarks.md), and this checks only that the page still has its guard; once the rows are there it checks their numbers.
test('Ionic like-for-like rows: absent is fine, present must be complete', (t) => {
  const io = JSON.parse(read('../site/data/benchmarks-ionic.json'));
  const page = read('../site/benchmarks.md');
  assert.equal(typeof io.preview, 'boolean');
  assert.ok(page.includes('### What each row does') && page.includes('v-if="hasLf"'), 'the page explains each row, guarded for data without them');
  const present = ['stencil-standalone', 'stencilrs+check'].filter((r) => io.rows[r]);
  if (!present.length) return t.diagnostic('the Ionic data has no like-for-like rows yet; the page hides their sections');
  assert.equal(present.length, 2, 'both like-for-like rows, or neither');
  for (const row of ['stencil', 'stencil-standalone', 'stencilrs', 'stencilrs+check']) {
    for (const m of ['coldBuild', 'warmBuild']) {
      const r = io.metrics[m].rows[row];
      assert.ok(r && r.n > 0 && r.median > 0 && r.min <= r.median && r.median <= r.max, `${m} ${row}`);
    }
  }
  for (const tool of ['tsgo', 'tsc']) assert.ok(io.metrics.typecheck.rows[tool].median > 0, `typecheck ${tool}`);
});
