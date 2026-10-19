// End-to-end benchmark: a full `stencil build` of the ui-kit's custom-elements (standalone)
// output, with Stencil's own TypeScript transform passes vs with stencilrs swapped in.
//
//   node bench-stencil-build.mjs [runs=5] [--only stock|patched] [--keep]
//
// Stencil v5 compiles a component twice: pass A is the type-checked TypeScript emit that
// turns decorators into static members and fills the module map; pass B is a per-bundle
// `ts.transpileModule` inside the Rolldown TypeScript plugin that applies Stencil's
// transformers (component class, proxyCustomElement, auto-define, style imports).
// Pass A stays. For the `customElements` (standalone) bundle the patched build replaces pass B
// with stencilrs' `transpile()` on the original source file, and falls back to pass B for a
// file stencilrs reports as unported.
//
// This patches a THROWAWAY COPY of @stencil/core (.bench/{stock,patched}/), by string
// replacement in its bundled compiler-*.mjs; node_modules is never touched. Benchmark only:
// nothing here ships. Both variants run from copies, with the same standalone-only config
// (stencil.standalone.config.ts), alternating, so drift hits both equally. The lazy
// (loader-bundle) build uses a different bundle and isn't swapped yet.
//
// Reports medians of wall time and of Stencil's own "build finished in …" time. Stencil's
// cache (.stencil/) is shared and stays on, as in a real repeat build (it has no real warm
// path: cold and warm builds measure the same).
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const keep = args.includes('--keep');
const runs = Number(args.find((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--only') ?? 5);
const bench = join(root, '.bench');
const stencilrsIndex = pathToFileURL(fileURLToPath(new URL('../../index.js', import.meta.url))).href;

// Prepended to compiler-*.mjs. `__srsCustomElements` returns Stencil's transpileModule result
// shape, or null to leave the file to Stencil's own pass B.
//
// stencilrs' default output registers a component with `defineCustomElement(Class, meta)`,
// the shape @stencil/unplugin wants. The standalone build wants Stencil's transformers' shape
// instead, which this glue adds around stencilrs' output (text edits, appended at the end so
// the source map stays valid; imports hoist):
//   addDefineCustomElementFunctions  an exported `defineCustomElement(opts)` that defines the
//                                    component and its dependencies in a registry, plus the
//                                    `defineCustomElement()` call for auto-define-custom-elements
//   proxyCustomElement               `defineCustomElement(Class, meta)` -> `proxyCustomElement(Class, meta)`
//   the class stays a named export
const HEADER = String.raw`import { transpile as __srsTranspile } from ${JSON.stringify(stencilrsIndex)};
import { readFileSync as __srsRead, writeFileSync as __srsWrite } from "node:fs";
const __srsStats = { stencilrs: 0, fallback: 0, ms: 0, fallbackFiles: [] };
process.on("exit", () => { if (process.env.BENCH_STATS_FILE) __srsWrite(process.env.BENCH_STATS_FILE, JSON.stringify(__srsStats)); });
const __srsCmpByTag = new WeakMap();
function __srsGlue(code, mod, compilerCtx, config, outputTarget) {
	const corePath = "@stencil/core/runtime/client/standalone";
	const cmp = mod.cmps[0];
	const proxied = code.replace(/__stencil_defineCustomElement\((\w+),\s*\[/, "__srs_proxyCustomElement($1, [");
	if (proxied === code || !new RegExp("^__srs_proxyCustomElement\\(" + cmp.componentClassName + ",", "m").test(proxied)) return null;
	let byTag = __srsCmpByTag.get(compilerCtx);
	if (!byTag) {
		byTag = new Map();
		for (const m of compilerCtx.moduleMap.values()) for (const c of m.cmps ?? []) byTag.set(c.tagName, c);
		__srsCmpByTag.set(compilerCtx, byTag);
	}
	const cls = cmp.componentClassName;
	const pascal = (t) => t.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
	const deps = cmp.dependencies.map((t) => byTag.get(t));
	const imports = deps.map((d) => "import { defineCustomElement as $" + pascal(d.tagName) + "DefineCustomElement } from " + JSON.stringify(d.sourceFilePath) + ";").join("\n");
	const define = (t) => "if (!_reg.get(__srs_transformTag(tagName))) { " + t + " }";
	const cases = ['case ' + JSON.stringify(cmp.tagName) + ': ' + define(cls + "._registry = _reg, _reg.define(__srs_transformTag(tagName), " + cls + ");") + ' break;']
		.concat(deps.map((d) => "case " + JSON.stringify(d.tagName) + ": " + define("$" + pascal(d.tagName) + "DefineCustomElement(opts);") + " break;"));
	const tags = [cmp.tagName, ...deps.map((d) => d.tagName)];
	let out = proxied + "\nimport { proxyCustomElement as __srs_proxyCustomElement, getRegistry as __srs_getRegistry, transformTag as __srs_transformTag } from " + JSON.stringify(corePath) + ";\n" + imports + "\nexport function defineCustomElement(opts) {\n" +
		"const _storeReg = __srs_getRegistry();\nconst _reg = opts?.registry ?? _storeReg;\nif (typeof _reg === \"undefined\") return;\n" +
		JSON.stringify(tags) + ".forEach((tagName) => { switch (tagName) { " + cases.join(" ") + " } });\n}\n";
	if (outputTarget?.customElementsExportBehavior === "auto-define-custom-elements") out += "defineCustomElement();\n";
	if (config.devMode) out += cls + ".__stencil_module__ = import.meta.url;\n";
	if (!new RegExp("^export\\s+(const|\\{[^}]*\\b" + cls + "\\b)", "m").test(out)) out += "export { " + cls + " };\n";
	return out;
}
function __srsCustomElements(mod, config, bundleOpts, compilerCtx) {
	if (bundleOpts.id !== "customElements" || !mod.cmps.length) return null;
	const t0 = performance.now();
	const co = config.tsCompilerOptions ?? {};
	const jsx = co.jsx === 4 || co.jsx === 5 ? { jsx: "automatic", jsxImportSource: co.jsxImportSource ?? "@stencil/core" } : { jsx: "classic" };
	const r = __srsTranspile(__srsRead(mod.sourceFilePath, "utf8"), { file: mod.sourceFilePath, resolveImports: true, ...jsx });
	let code = null;
	if (!r.diagnostics.some((d) => d.level === "error" || d.message.startsWith("stencilrs:")) && r.components.length === 1 && r.components[0].componentClassName === mod.cmps[0].componentClassName) {
		code = __srsGlue(r.code, mod, compilerCtx, config, config.outputTargets.find((o) => o.type === "standalone"));
	}
	__srsStats.ms += performance.now() - t0;
	if (code === null) {
		__srsStats.fallback++;
		__srsStats.fallbackFiles.push(mod.sourceFilePath);
		return null;
	}
	__srsStats.stencilrs++;
	return { outputText: code, sourceMapText: r.map ?? undefined };
}
`;

const ANCHOR = 'const tsResult = ts.transpileModule(mod.staticSourceFileText, {';
const PATCHED = 'const tsResult = __srsCustomElements(mod, config, bundleOpts, compilerCtx) ?? ts.transpileModule(mod.staticSourceFileText, {';

function prepare(variant) {
  const dir = join(bench, variant);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'node_modules/@stencil'), { recursive: true });
  for (const p of ['core', 'cli']) cpSync(join(root, 'node_modules/@stencil', p), join(dir, 'node_modules/@stencil', p), { recursive: true });
  if (variant === 'patched') {
    const distDir = join(dir, 'node_modules/@stencil/core/dist');
    const files = readdirSync(distDir).filter((f) => /^compiler-.+\.mjs$/.test(f));
    if (files.length !== 1) throw new Error(`expected one compiler-*.mjs in ${distDir}, found ${files.length}`);
    const file = join(distDir, files[0]);
    const src = readFileSync(file, 'utf8');
    const hits = src.split(ANCHOR).length - 1;
    if (hits !== 1) throw new Error(`patch anchor found ${hits} times in ${files[0]} (expected 1): Stencil's compiler changed, update ANCHOR in bench-stencil-build.mjs`);
    writeFileSync(file, HEADER + src.replace(ANCHOR, PATCHED));
  }
  return join(dir, 'node_modules/@stencil/cli/bin/stencil.mjs');
}

const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
function run(variant, bin) {
  const out = join(bench, 'out', variant);
  rmSync(out, { recursive: true, force: true });
  const stats = join(bench, `${variant}-stats.json`);
  rmSync(stats, { force: true });
  const t0 = performance.now();
  const r = spawnSync(process.execPath, [bin, 'build', '--config', 'stencil.standalone.config.ts'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, BENCH_OUT_DIR: out, BENCH_STATS_FILE: stats, FORCE_COLOR: '0', CI: '1' },
    maxBuffer: 1 << 28,
  });
  const wall = performance.now() - t0;
  const text = strip(r.stdout + r.stderr);
  const m = /build finished in ([\d.]+) (ms|s)\b/.exec(text);
  if (r.status !== 0 || !m) throw new Error(`${variant}: stencil build failed (exit ${r.status})\n${text.slice(-3000)}`);
  if (/\[ ERROR/.test(text)) throw new Error(`${variant}: build reported errors\n${text.slice(-3000)}`);
  return { wall, built: Number(m[1]) * (m[2] === 's' ? 1000 : 1), stats: existsSync(stats) ? JSON.parse(readFileSync(stats, 'utf8')) : null };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const variants = only ? [only] : ['stock', 'patched'];
const bins = Object.fromEntries(variants.map((v) => [v, prepare(v)]));
const res = Object.fromEntries(variants.map((v) => [v, { wall: [], built: [], stats: null }]));
for (let i = 0; i < runs; i++) {
  for (const v of variants) {
    const r = run(v, bins[v]);
    res[v].wall.push(r.wall);
    res[v].built.push(r.built);
    res[v].stats = r.stats ?? res[v].stats;
    console.log(`run ${i + 1}/${runs} ${v.padEnd(7)} wall ${(r.wall / 1000).toFixed(2)} s · build finished ${(r.built / 1000).toFixed(2)} s`);
  }
}

console.log(`\nmedians of ${runs} runs (standalone only)`);
for (const v of variants) {
  console.log(`${v.padEnd(8)} wall ${(median(res[v].wall) / 1000).toFixed(2)} s · build finished ${(median(res[v].built) / 1000).toFixed(2)} s`);
}
const s = res.patched?.stats;
if (s) {
  console.log(`\npatched: stencilrs compiled ${s.stencilrs} files in ${s.ms.toFixed(0)} ms, ${s.fallback} fell back to Stencil${s.fallbackFiles.length ? ': ' + s.fallbackFiles.join(', ') : ''}`);
}
if (res.stock && res.patched) {
  console.log(`speedup: wall ${(median(res.stock.wall) / median(res.patched.wall)).toFixed(2)}×, build finished ${(median(res.stock.built) / median(res.patched.built)).toFixed(2)}×`);
}
mkdirSync(bench, { recursive: true });
writeFileSync(join(bench, 'stencil-build-results.json'), JSON.stringify({ runs, results: res }, null, 2) + '\n');
if (!keep) for (const v of variants) rmSync(join(bench, v), { recursive: true, force: true });
console.log(`\noutputs: ${join(bench, 'out')}/{stock,patched}  (check: node check-standalone.mjs)`);
