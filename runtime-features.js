// Which optional features of runtime.js (`F_*` there) a build needs, so that the Vite plugin's `runtimeFeatures` option
// can compile the others out of the bundle (docs/spike-runtime-size.md). Experimental; `runtime: 'stencilrs'` only.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RUNTIME_FEATURES = ['server', 'hydrate', 'resume', 'light', 'signals', 'vnode', 'hot'];

/**
 * The `define` entries of a production build for the `runtimeFeatures` option: `__RS_FEAT_<NAME>__` as `'true'` or `'false'`.
 * Every feature is written (on unless the option turns it off), so that the bundler folds each switch to a literal.
 */
export function runtimeFeatureDefines(features) {
  const given = features && typeof features === 'object' ? features : {};
  if (features && typeof features !== 'object') throw new Error(`[stencilrs] runtimeFeatures must be an object or 'auto', got ${JSON.stringify(features)}`);
  const unknown = Object.keys(given).filter((k) => !RUNTIME_FEATURES.includes(k));
  if (unknown.length) throw new Error(`[stencilrs] runtimeFeatures: unknown feature ${unknown.map((k) => JSON.stringify(k)).join(', ')} (${RUNTIME_FEATURES.join(', ')})`);
  return Object.fromEntries(RUNTIME_FEATURES.map((k) => [`__RS_FEAT_${k.toUpperCase()}__`, String(given[k] ?? true)]));
}

/** The text of a call's argument list, from the `(` after `at`: up to its matching `)`. */
const callArgs = (code, at) => {
  const open = code.indexOf('(', at);
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '(') depth++;
    else if (code[i] === ')' && --depth === 0) return code.slice(open, i + 1);
  }
  return code.slice(open);
};

const SHADOW_RE = /\bshadow\s*:\s*(true|\{)|\bencapsulation\s*:\s*(\{[^}]*\btype\s*:\s*)?['"]shadow['"]/;
const SIGNALS_RE = /from\s+['"](@stencil\/core\/signals|@popcorn245\/stencilrs\/signals)['"]/;
const H_RE = /import\s+\{[^}]*\b(h|Fragment|FunctionalComponent|Mixin)\b[^}]*\}\s+from\s+['"]@stencil\/core['"]/;
const SPREAD_RE = /\{\s*\.\.\.[\w$.[\]()]/;
const CAPITAL_TAG_RE = /<(?!Host\b|Fragment\b)[A-Z][\w.]*[\s/>]/;

/**
 * The features the sources of an app use: `{ light, signals, vnode }`, each true when any file may need it (a file is not
 * parsed: a pattern that might mean it counts). `light`: a `@Component` that is not shadow. `signals`: a signals import.
 * `vnode`: `h`, `Fragment`, `FunctionalComponent` or `Mixin` imported, a JSX spread, or a capitalized tag (a functional component).
 * It does not see components in other packages.
 */
export function detectUsedFeatures(sources) {
  const used = { light: false, signals: false, vnode: false };
  for (const code of sources) {
    for (let at = code.indexOf('@Component'); at >= 0; at = code.indexOf('@Component', at + 1)) {
      if (!SHADOW_RE.test(callArgs(code, at))) used.light = true;
    }
    if (SIGNALS_RE.test(code)) used.signals = true;
    if (H_RE.test(code) || SPREAD_RE.test(code) || CAPITAL_TAG_RE.test(code)) used.vnode = true;
  }
  return used;
}

/**
 * `runtimeFeatures: 'auto'`: server and hot reload off (a production browser build), the features the sources use on,
 * `hydrate` and `resume` on only with `hydrateClient`.
 */
export function autoRuntimeFeatures(sources, { hydrateClient = false } = {}) {
  const used = detectUsedFeatures(sources);
  return { server: false, hot: false, hydrate: !!hydrateClient, resume: !!hydrateClient, light: used.light, signals: used.signals, vnode: used.vnode };
}

/** The `.ts` / `.tsx` / `.js` / `.jsx` sources under `dir` (not `node_modules`, not hidden folders, not declaration or test files). */
export function readSources(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.[jt]sx?$/.test(e.name) && !/\.(d|test|spec|stories)\.[jt]sx?$/.test(e.name)) out.push(readFileSync(p, 'utf8'));
    }
  };
  try {
    walk(dir);
  } catch {
    // no such folder: nothing to read
  }
  return out;
}
