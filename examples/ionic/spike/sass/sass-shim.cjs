// --require shim: union wall time of sass-embedded compileStringAsync/compileAsync calls; written to $SASS_STATS at exit.
const Module = require('node:module');
const orig = Module._load;
const files = [];
let n = 0, active = 0, t0 = 0, union = 0, sumMs = 0;
const wrap = (obj, name) => {
  const f = obj[name];
  if (!f || f.__w) return;
  obj[name] = Object.assign(async function (...a) {
    const s = performance.now();
    if (active++ === 0) t0 = s;
    n++;
    files.push(name === 'compileAsync' ? String(a[0]) : (a[1] && a[1].url ? a[1].url.pathname : '?') + (a[1] && a[1].syntax === 'indented' ? '#indented' : ''));
    try { return await f.apply(this, a); } finally { const e = performance.now(); sumMs += e - s; if (--active === 0) union += e - t0; }
  }, { __w: true });
};
const wrapCompiler = (c) => { for (const k of ['compileStringAsync', 'compileAsync']) wrap(c, k); return c; };
Module._load = function (id) {
  const m = orig.apply(this, arguments);
  if (/async(\.js)?$/.test(String(id)) && m && m.AsyncCompiler && !m.__s) {
    m.__s = true;
    wrapCompiler(m.AsyncCompiler.prototype);
  }
  return m;
};
process.on('exit', () => {
  if (process.env.SASS_STATS) require('node:fs').writeFileSync(process.env.SASS_STATS, JSON.stringify({ calls: n, unionMs: Math.round(union), sumMs: Math.round(sumMs), files }));
});
