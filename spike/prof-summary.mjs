// Self-time by category from a .cpuprofile. node spike/prof-summary.mjs file.cpuprofile [topN]
import { readFileSync } from 'node:fs';
const p = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const top = Number(process.argv[3] ?? 25);
const byId = new Map(p.nodes.map((n) => [n.id, n]));
const self = new Map();
for (let i = 0; i < p.samples.length; i++) self.set(p.samples[i], (self.get(p.samples[i]) ?? 0) + (p.timeDeltas[i] ?? 0));
const cat = (n) => {
  const u = n.callFrame.url, f = n.callFrame.functionName;
  if (u.includes('happy-dom')) {
    if (/Serializer|outerHTML|innerHTML|getInnerHTML|escape|XMLSerializer/i.test(f + u)) return 'happy-dom: serialization';
    if (/Attr|setAttribute|getAttribute|removeAttribute|NamedNodeMap/i.test(f + u)) return 'happy-dom: attributes';
    if (/Parser|XMLParser/i.test(u)) return 'happy-dom: parsing (template innerHTML)';
    return 'happy-dom: DOM (create/insert/query/events)';
  }
  if (/entry-server|runtime-server|runtime\.js|bench-baseline|spike/.test(u)) return u.includes('runtime-server') ? 'runtime-server.js (serialize/settle)' : 'runtime + component code';
  if (!u) return f === '(garbage collector)' ? 'GC' : f === '(idle)' ? 'idle' : f === '(program)' ? 'program (native)' : 'native/builtin: ' + (f || '?');
  if (u.startsWith('node:')) return 'node internals';
  return 'other: ' + u.replace(/.*node_modules\//, '');
};
const tot = new Map();
let all = 0;
for (const [id, t] of self) {
  const n = byId.get(id);
  if (n.callFrame.functionName === '(idle)') continue;
  const c = cat(n);
  tot.set(c, (tot.get(c) ?? 0) + t);
  all += t;
}
console.log('total busy ms', (all / 1000).toFixed(0));
for (const [c, t] of [...tot].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(((t / all) * 100).toFixed(1).padStart(5) + '%', (t / 1000).toFixed(0).padStart(6) + 'ms', c);
// top functions
const fn = new Map();
for (const [id, t] of self) {
  const n = byId.get(id);
  const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').slice(-2).join('/')}:${n.callFrame.lineNumber}`;
  fn.set(k, (fn.get(k) ?? 0) + t);
}
console.log('\ntop self functions');
for (const [k, t] of [...fn].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(((t / all) * 100).toFixed(1).padStart(5) + '%', k);
