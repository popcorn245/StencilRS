// Print the heaviest call-tree paths (inclusive ms) of a .cpuprofile. usage: node tree.mjs file [minMs] [maxDepth]
import { readFileSync } from 'node:fs';
const p = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const min = +(process.argv[3] ?? 300) * 1000;
const maxDepth = +(process.argv[4] ?? 14);
const nodes = new Map(p.nodes.map((n) => [n.id, n]));
const self = new Map();
p.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (p.timeDeltas[i] ?? 0)));
const incl = new Map();
const f = (id) => {
  const n = nodes.get(id);
  let t = self.get(id) ?? 0;
  for (const c of n.children ?? []) t += f(c);
  incl.set(id, t);
  return t;
};
f(p.nodes[0].id);
const lbl = (n) => {
  const c = n.callFrame;
  return `${c.functionName || '(anon)'} ${c.url.split('node_modules/').pop().slice(0, 40)}:${c.lineNumber}`;
};
const walk = (id, d) => {
  const n = nodes.get(id);
  if (d > maxDepth) return;
  console.log(`${' '.repeat(d)}${(incl.get(id) / 1000).toFixed(0)} ${lbl(n)}`);
  for (const c of [...(n.children ?? [])].sort((a, b) => incl.get(b) - incl.get(a))) if (incl.get(c) >= min) walk(c, d + 1);
};
walk(p.nodes[0].id, 0);
