// BENCHMARK-ONLY patch of the installed Stencil v5.0.0-beta.25 (examples/ionic/node_modules). Never shipped.
//   node spike/patch-stencil.mjs          apply (originals are kept as *.orig, so re-running starts from stock)
//   node spike/patch-stencil.mjs --revert restore stock files
// The patched Stencil behaves exactly like stock unless these env vars are set for the build:
//   SPIKE_NOCHECK=1        TypeScript `noCheck` for Stencil's Pass A emit, and no semantic-diagnostics sweep
//   SPIKE_TSGO=<tsgo bin>  once components.d.ts is generated, run `tsgo --noEmit --skipLibCheck -p tsconfig.json`
//                          in a child process and fail the build with its errors (awaited before the write)
//   SPIKE_SKIP_MIGRATE=1   skip the CLI's pre-build detectMigrations() scan (it parses every source file with TS)
//   SPIKE_RUST_BUNDLES=lazy,customElements  which bundles use it (default both); SPIKE_CE_SHAPE=module|customelement
//   SPIKE_RUST_PASSB=<stencilrs index.js>  Pass B: component modules go through stencilrs `transpile`
//                          (lazy or customelement shape) instead of ts.transpileModule + Stencil's transformers
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'node_modules/@stencil/core/dist');
const files = {
  compiler: resolve(dist, 'compiler-CWxGH9sX.mjs'),
  cli: resolve(root, 'node_modules/@stencil/cli/dist/index.mjs'),
};
for (const f of Object.values(files)) if (existsSync(f + '.orig')) copyFileSync(f + '.orig', f);
if (process.argv.includes('--revert')) process.exit(0);
for (const f of Object.values(files)) copyFileSync(f, f + '.orig');

const edit = (file, from, to) => {
  const src = readFileSync(file, 'utf8');
  if (src.split(from).length !== 2) throw new Error(`patch anchor not unique/found in ${file}: ${from.slice(0, 80)}`);
  writeFileSync(file, src.replace(from, () => to));
};

// 1. noCheck
edit(files.compiler, `if (config.tsCompilerOptions?.skipLibCheck === void 0) tsOptions.skipLibCheck = true;`,
  `if (config.tsCompilerOptions?.skipLibCheck === void 0) tsOptions.skipLibCheck = true;\n\tif (process.env.SPIKE_NOCHECK === "1") tsOptions.noCheck = true;`);
edit(files.compiler, `if (config.validateTypes && !buildCtx.isRebuild) {`,
  `if (config.validateTypes && !buildCtx.isRebuild && process.env.SPIKE_NOCHECK !== "1") {`);

// 2. tsgo in a child process, started when components.d.ts exists, awaited before the write
edit(files.compiler, `if (needsRebuild) return null;\n\t\t}\n\t\tevictChangedGlobalStyles`,
  `if (needsRebuild) return null;
			if (process.env.SPIKE_TSGO) {
				const { spawn } = await import("node:child_process");
				const t0 = Date.now();
				buildCtx.__tsgo = new Promise((res) => {
					let out = "";
					const p = spawn(process.execPath, [process.env.SPIKE_TSGO, "--noEmit", "--skipLibCheck", "-p", "tsconfig.json"], { cwd: config.rootDir });
					p.stdout.on("data", (d) => (out += d));
					p.stderr.on("data", (d) => (out += d));
					p.on("exit", (code) => res({ code, out, ms: Date.now() - t0 }));
				});
			}
		}
		evictChangedGlobalStyles`);
edit(files.compiler, `await buildCtx.stylesPromise;\n\t\tawait writeBuild(config, compilerCtx, buildCtx);`,
  `await buildCtx.stylesPromise;
		if (buildCtx.__tsgo) {
			const t1 = Date.now();
			const r = await buildCtx.__tsgo;
			config.logger.info("[spike] tsgo exited " + r.code + " after " + r.ms + " ms (waited " + (Date.now() - t1) + " ms past the other work)");
			if (r.code !== 0) {
				const err = buildError(buildCtx.diagnostics);
				err.header = "tsgo type errors";
				err.messageText = r.out;
				return buildAbort(buildCtx);
			}
		}
		await writeBuild(config, compilerCtx, buildCtx);`);

// 3. Pass B through stencilrs for component modules
edit(files.compiler, `		transform(_code, id) {
			if (isAbsolute$1(id)) {
				const fsFilePath = normalizeFsPath(id);
				const mod = getModule(compilerCtx, fsFilePath);
				if (mod?.cmps) {
					const cacheKey = cachePrefix + fsFilePath;`,
  `		async transform(_code, id) {
			if (isAbsolute$1(id)) {
				const fsFilePath = normalizeFsPath(id);
				const mod = getModule(compilerCtx, fsFilePath);
				if (mod?.cmps?.length && /\\.tsx?$/.test(mod.sourceFilePath) && !mod.isCollectionDependency && process.env.SPIKE_RUST_PASSB && (process.env.SPIKE_RUST_BUNDLES ?? "lazy,customElements").split(",").includes(bundleOpts.id)) {
					const cacheKey = cachePrefix + fsFilePath;
					const cached = compilerCtx.transpileCache.get(cacheKey);
					if (cached) return { code: cached.outputText, map: null };
					globalThis.__spikeRs ??= await import("node:url").then((u) => import(u.pathToFileURL(process.env.SPIKE_RUST_PASSB).href));
					const source = (await import("node:fs")).readFileSync(mod.sourceFilePath, "utf8");
					const t0 = performance.now();
					const r = globalThis.__spikeRs.transpile(source, { file: mod.sourceFilePath, componentExport: bundleOpts.id === "lazy" ? "lazy" : (process.env.SPIKE_CE_SHAPE ?? "module"), resolveImports: true, useDefineForClassFields: false, jsx: "classic" });
					globalThis.__spikeRsMs = (globalThis.__spikeRsMs ?? 0) + (performance.now() - t0);
					if (r.diagnostics?.some((d) => d.level === "error")) throw new Error("stencilrs: " + JSON.stringify(r.diagnostics));
					let code = r.code;
					// Stencil's standalone output also needs defineCustomElement (with the dependency defines): a benchmark stub of it
					if (bundleOpts.id === "customElements" && r.components[0]) code += "\\nexport const defineCustomElement = () => { if (typeof customElements !== 'undefined' && !customElements.get(" + JSON.stringify(r.components[0].tagName) + ")) customElements.define(" + JSON.stringify(r.components[0].tagName) + ", " + r.components[0].componentClassName + "); };\\n";
					compilerCtx.transpileCache.set(cacheKey, { outputText: code, sourceMapText: null });
					return { code, map: null };
				}
				if (mod?.cmps) {
					const cacheKey = cachePrefix + fsFilePath;`);

// 4. CLI: skip the pre-build migration scan
edit(files.cli, `const preBuildMigrationResult = await detectMigrations(coreCompiler, config);`,
  `const preBuildMigrationResult = process.env.SPIKE_SKIP_MIGRATE === "1" ? { hasMigrations: false } : await detectMigrations(coreCompiler, config);`);
console.log('patched', Object.values(files).join(', '));
