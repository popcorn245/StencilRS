// Classify the dart-vs-grass differences left by dart-vs-grass.mjs (files in /tmp/claude-0/diffs/<n>.{dart,grass}.css).
// Level 2: compare as a multiset of (at-rule context, selector list sorted, declarations sorted, ", " collapsed): what remains is a real difference.
import { readdirSync, readFileSync } from 'node:fs';
import postcss from 'postcss';

const dir = '/tmp/claude-0/diffs';
const list = readFileSync('/tmp/claude-0/sheets.txt', 'utf8').split('\n').filter(Boolean);
const flat = (css) => {
  const out = [];
  const walk = (node, ctx) => {
    for (const n of node.nodes ?? []) {
      if (n.type === 'rule') {
        const sels = n.selector.split(',').map((s) => s.trim()).sort().join(',');
        const decls = n.nodes.filter((d) => d.type === 'decl').map((d) => `${d.prop}:${d.value.replace(/\s*,\s*/g, ',')}${d.important ? '!' : ''}`).sort();
        out.push(`${ctx}|${sels}{${decls.join(';')}}`);
        walk(n, ctx);
      } else if (n.type === 'atrule') walk(n, `${ctx}@${n.name} ${n.params}`);
    }
  };
  walk(postcss.parse(css.replace(/^WS:/, '')), '');
  return out;
};
const ids = [...new Set(readdirSync(dir).map((f) => +f.split('.')[0]))].sort((a, b) => a - b);
const cats = { 'equal after sorting declarations/selectors and comma spacing (order only)': [], 'same rules, different declaration values': [], 'different rule set (merged/split/dropped rules)': [] };
for (const i of ids) {
  const a = flat(readFileSync(`${dir}/${i}.dart.css`, 'utf8'));
  const b = flat(readFileSync(`${dir}/${i}.grass.css`, 'utf8'));
  const sa = [...a].sort().join('\n');
  const sb = [...b].sort().join('\n');
  const name = list[i].split('/migrated/src/')[1];
  if (sa === sb) cats['equal after sorting declarations/selectors and comma spacing (order only)'].push(name);
  else {
    const ka = new Set(a.map((r) => r.split('{')[0]));
    const kb = new Set(b.map((r) => r.split('{')[0]));
    const sameKeys = [...ka].every((k) => kb.has(k)) && [...kb].every((k) => ka.has(k));
    (sameKeys ? cats['same rules, different declaration values'] : cats['different rule set (merged/split/dropped rules)']).push(name);
  }
}
for (const [k, v] of Object.entries(cats)) console.log(`${v.length}  ${k}\n    ${v.slice(0, 8).join(', ')}`);
