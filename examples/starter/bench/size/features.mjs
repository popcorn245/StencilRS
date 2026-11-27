// Bytes per runtime feature of runtime.js (docs/spike-runtime-size.md): the same app (apps/stencil) built with the
// whole runtime, with each feature off on its own (its marginal cost), and with all of them off.
import { measure } from './run.mjs';

const FEATURES = ['server', 'hydrate', 'resume', 'light', 'signals', 'vnode', 'hot'];
const all = Object.fromEntries(FEATURES.map((f) => [f, true]));
const base = await measure('full', { features: all, tag: 'feat-full' });
const rows = [];
// `resume` needs `hydrate`, so hydrate's own cost is measured with resume already off.
const noResume = await measure('no-resume', { features: { ...all, resume: false }, tag: 'feat-no-resume' });
for (const f of FEATURES) {
  const off = f === 'hydrate' ? { resume: false, hydrate: false } : { [f]: false };
  const from = f === 'hydrate' ? noResume : base;
  const r = await measure(f, { features: { ...all, ...off }, tag: `feat-no-${f}` });
  rows.push({ feature: f, raw: from.raw - r.raw, gz: from.gz - r.gz, br: from.br - r.br });
}
const none = await measure('none', { features: Object.fromEntries(FEATURES.map((f) => [f, false])), tag: 'feat-none' });
console.log(`full runtime + app: raw ${base.raw}  gzip ${base.gz}  brotli ${base.br}`);
console.log(`all features off:   raw ${none.raw}  gzip ${none.gz}  brotli ${none.br}`);
console.log('feature      raw    gzip   brotli   (saved by turning it off alone)');
for (const r of rows) console.log(`${r.feature.padEnd(10)} ${String(r.raw).padStart(6)} ${String(r.gz).padStart(6)} ${String(r.br).padStart(6)}`);

// Whole-app sizes for typical profiles (every feature not listed is off).
const profiles = {
  'client, shadow DOM only': {},
  '+ light DOM (slots, scoped CSS)': { light: true },
  '+ signals': { signals: true },
  'SSR hydration in place (no resume)': { hydrate: true },
  'SSR hydration + resuming': { hydrate: true, resume: true },
  'hydration + resuming + light + signals + vnode': { hydrate: true, resume: true, light: true, signals: true, vnode: true },
};
console.log('\nprofile                                            raw   gzip  brotli');
let n = 0;
for (const [name, on] of Object.entries(profiles)) {
  const off = Object.fromEntries(FEATURES.map((f) => [f, false]));
  const r = await measure(name, { features: { ...off, ...on }, tag: `profile-${n++}` });
  console.log(`${name.padEnd(48)} ${String(r.raw).padStart(6)} ${String(r.gz).padStart(6)} ${String(r.br).padStart(6)}`);
}
