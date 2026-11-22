// Aggregate a .cpuprofile: self time by package/function, and inclusive time for named "phase" functions.
// usage: node aggregate-profile.mjs file.cpuprofile [topN] [comma,separated,function,names]
import { readFileSync } from 'node:fs';
const p = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const top = +(process.argv[3] ?? 25);
const nodes = new Map(p.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = p.timeDeltas;
p.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (dt[i] ?? 0)));
const total = [...self.values()].reduce((a, b) => a + b, 0);
const ms = (us) => (us / 1000).toFixed(0).padStart(7) + ' ms';
const pct = (us) => ((100 * us) / total).toFixed(1).padStart(5) + '%';
function pkg(url) {
  if (!url) return '(native/idle)';
  const m = url.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\/(.*)/);
  if (m) return m[1] + (m[2].includes('compiler/') ? ':compiler/' + m[2].split('/').pop() : '');
  if (url.startsWith('node:')) return 'node:internal';
  return url.replace(/^file:\/\//, '').split('/').slice(-3).join('/');
}
const byPkg = new Map();
const byFn = new Map();
for (const [id, t] of self) {
  const cf = nodes.get(id).callFrame;
  const k = pkg(cf.url);
  byPkg.set(k, (byPkg.get(k) ?? 0) + t);
  const f = `${cf.functionName || '(anon)'} [${k}:${cf.lineNumber}]`;
  byFn.set(f, (byFn.get(f) ?? 0) + t);
}
const show = (title, m, n) => {
  console.log(`\n== ${title} (total sampled ${(total / 1000).toFixed(0)} ms)`);
  [...m].sort((a, b) => b[1] - a[1]).slice(0, n).forEach(([k, v]) => console.log(ms(v), pct(v), k));
};
show('self time by package', byPkg, top);
show('self time by function', byFn, top);
const parent = new Map();
for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const phases = process.argv[4]
  ? process.argv[4].split(',')
  : ['createProgram', 'getSemanticDiagnostics', 'getSyntacticDiagnostics', 'getPreEmitDiagnostics', 'transpileModule', 'transpileSync', 'emit', 'emitFiles', 'generateDocs', 'render', 'bundle', 'writeFile', 'writeFileSync', 'readFileSync', 'minify', 'transformSync'];
const incl = new Map();
for (const [id, t] of self) {
  const seen = new Set();
  for (let c = id; c !== undefined; c = parent.get(c)) {
    const nm = nodes.get(c).callFrame.functionName;
    if (phases.includes(nm) && !seen.has(nm)) {
      seen.add(nm);
      incl.set(nm, (incl.get(nm) ?? 0) + t);
    }
  }
}
show('inclusive time of selected function names', incl, 40);
