// Finer breakdown of the dart-vs-grass differences (files in /tmp/claude-0/diffs written by dart-vs-grass.mjs), per rule.
import { readdirSync, readFileSync } from 'node:fs';
import postcss from 'postcss';

const dir = '/tmp/claude-0/diffs';
const flat = (css) => {
  const m = new Map();
  const walk = (node, ctx) => {
    for (const n of node.nodes ?? []) {
      if (n.type === 'rule') {
        // per single selector (rule splitting / selector-list merging is not a difference), declarations as a set
        const d = n.nodes.filter((x) => x.type === 'decl').map((x) => `${x.prop}:${x.value.replace(/\s*,\s*/g, ',')}`);
        for (const sel of n.selector.split(',').map((x) => x.trim())) {
          const k = ctx + '|' + sel;
          m.set(k, [...new Set([...(m.get(k) ?? []), ...d])]);
        }
        walk(n, ctx);
      } else if (n.type === 'atrule') walk(n, ctx + '@' + n.name + ' ' + n.params);
    }
  };
  walk(postcss.parse(css.replace(/^WS:/, '')), '');
  return m;
};
const kinds = {};
const ex = {};
const add = (kind, msg) => {
  kinds[kind] = (kinds[kind] ?? 0) + 1;
  (ex[kind] ??= []).push(msg);
};
for (const i of new Set(readdirSync(dir).map((f) => +f.split('.')[0]))) {
  const a = flat(readFileSync(`${dir}/${i}.dart.css`, 'utf8'));
  const b = flat(readFileSync(`${dir}/${i}.grass.css`, 'utf8'));
  for (const [k, da] of a) {
    const db = b.get(k) ?? [];
    if ([...da].sort().join(';') === [...db].sort().join(';')) continue;
    const onlyA = da.filter((x) => !db.includes(x));
    const onlyB = db.filter((x) => !da.includes(x));
    let kind;
    if (onlyA.length && onlyA.length === onlyB.length && onlyA.every((x, j) => x.replace(/#[0-9a-f]{6}/g, '#') === onlyB[j]?.replace(/#[0-9a-f]{6}/g, '#'))) kind = 'color rounding (#1a65eb vs #1965eb: tint/shade/mix)';
    else if (!onlyA.length || !onlyB.length) kind = onlyA.length ? 'declaration only in dart' : 'declaration only in grass';
    else if (onlyA.map((x) => x.split(':')[0]).sort().join() === onlyB.map((x) => x.split(':')[0]).sort().join()) kind = 'same props, different values';
    else kind = 'different properties';
    add(kind, `#${i} ${k.slice(0, 70)} dart:${onlyA.slice(0, 3)} | grass:${onlyB.slice(0, 3)}`);
  }
  for (const k of b.keys()) if (!a.has(k)) add('rule (selector) only in grass', `#${i} ${k.slice(0, 100)}`);
}
console.log(kinds);
for (const k in ex) console.log('\n' + k + '\n  ' + ex[k].slice(0, 4).join('\n  '));

// sheets per cause (a sheet can have several)
const sheets = (kind) => new Set((ex[kind] ?? []).map((m) => m.split(' ')[0]));
const all = new Set(readdirSync(dir).map((f) => '#' + f.split('.')[0]));
const color = sheets('color rounding (#1a65eb vs #1965eb: tint/shade/mix)');
const calc = sheets('same props, different values');
const supports = new Set([...sheets('declaration only in dart'), ...sheets('rule (selector) only in grass')]);
const residual = new Set([...color, ...calc, ...supports]);
console.log(`\nof ${all.size} sheets that differ after lightningcss: ${color.size} have colour-rounding diffs, ${calc.size} calc() parenthesisation, ${supports.size} lose @supports selector(:dir(rtl)) nesting; ${[...all].filter((x) => !residual.has(x)).length} differ only in declaration order / rule splitting / custom-property comma spacing`);
