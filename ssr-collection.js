// Components of a Stencil collection (a package built by `stencil build`, like `ionicons`: `package.json` has a
// `collection` manifest) as source stencilrs can compile for the hydrate app. A collection ships its components as
// plain JavaScript with the decorators already gone: the metadata is in `static get is()`, `properties()`, `states()`,
// `watchers()`, ... Stencil reads that back when an app imports the collection (`parse-collection-components.ts`) and
// compiles the class again for each output target; stencilrs compiles decorated TypeScript, so the decorators are
// written back from the metadata and the static getters dropped. The class body (constructor, methods, `render`) is
// kept as it is, relative imports made absolute so the module can be served from another path.
//
// Not handled (an error naming the component, never a silently different class): `@Method`, `@Event`, `@Listen`, `@AttachInternals`
// and mixins.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** The text of `{ ... }` starting at `open`, braces balanced, strings and comments skipped. */
const balanced = (code, open) => {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < code.length && code[i] !== c; i++) if (code[i] === '\\') i++;
    } else if (c === '/' && code[i + 1] === '/') {
      i = code.indexOf('\n', i);
      if (i < 0) break;
    } else if (c === '/' && code[i + 1] === '*') {
      i = code.indexOf('*/', i) + 1;
    } else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i + 1;
  }
  throw new Error('unbalanced braces');
};

/** Every `static get name() { return <literal>; }` of the class, evaluated, and the text without them. */
const extractStatics = (code) => {
  const statics = {};
  let out = '';
  let last = 0;
  const re = /^[ \t]*static get (\w+)\(\)\s*\{/gm;
  for (let m; (m = re.exec(code)); ) {
    const open = m.index + m[0].length - 1;
    const end = balanced(code, open);
    statics[m[1]] = new Function(`return (() => ${code.slice(open, end)})();`)();
    out += code.slice(last, m.index);
    last = end;
    re.lastIndex = end;
  }
  return { statics, rest: out + code.slice(last) };
};

const quote = (s) => JSON.stringify(s);

/**
 * @param {string} code the collection's compiled component module
 * @param {string} file its path, for relative imports and style urls
 * @returns {{ code: string, tagName: string, origin: string } | null} decorated TypeScript, or null when the module has no component
 */
export const collectionComponentToSource = (code, file) => {
  const dir = dirname(file);
  const { statics, rest } = extractStatics(code);
  if (typeof statics.is !== 'string') return null;
  const tag = statics.is;
  for (const unsupported of ['methods', 'events', 'listeners', 'attachInternalsMemberName']) {
    const v = statics[unsupported];
    if (v && (typeof v !== 'object' || Object.keys(v).length)) throw new Error(`stencilrs/ssr: ${tag} (${file}): a collection component with ${unsupported} is not supported yet`);
  }
  const cls = /^export class (\w+)/m.exec(rest);
  if (!cls) throw new Error(`stencilrs/ssr: ${tag} (${file}): no \`export class\` found`);
  // Stencil v5's form: `encapsulation: { type, delegatesFocus }` (`shadow: true` is an error there).
  const encapsulation = statics.encapsulation === 'shadow' || statics.encapsulation === 'scoped'
    ? `encapsulation: { type: ${quote(statics.encapsulation)}${statics.delegatesFocus ? ', delegatesFocus: true' : ''} }`
    : '';
  // `styleUrls: { "$": ["a.css"] }` is one style; named modes are `{ ios: [...], md: [...] }`.
  const styles = statics.styleUrls ?? {};
  const absolute = (u) => u; // style urls stay relative to the original file: ssr.js resolves them from there
  const modes = Object.keys(styles);
  let style = '';
  if (modes.length === 1 && modes[0] === '$' && styles.$.length === 1) style = `styleUrl: ${quote(absolute(styles.$[0]))}, `;
  else if (modes.length && !modes.includes('$') && modes.every((k) => styles[k].length === 1)) style = `styleUrls: { ${modes.map((k) => `${k}: ${quote(absolute(styles[k][0]))}`).join(', ')} }, `;
  else if (modes.length) throw new Error(`stencilrs/ssr: ${tag} (${file}): style urls ${JSON.stringify(styles)} are not supported yet`);
  const assets = statics.assetsDirs?.length ? `assetsDirs: ${JSON.stringify(statics.assetsDirs)}, ` : '';
  const component = `@Component({ tag: ${quote(tag)}, ${style}${assets}${encapsulation} })`;

  const fields = [];
  for (const [name, p] of Object.entries(statics.properties ?? {})) {
    const opts = [p.mutable ? 'mutable: true' : '', p.reflect ? 'reflect: true' : '', p.attribute === undefined ? 'attribute: null' : `attribute: ${quote(p.attribute)}`].filter(Boolean);
    fields.push(`  @Prop({ ${opts.join(', ')} }) ${name}${p.required ? '!' : '?'}: ${p.complexType?.original ?? p.type ?? 'any'};`);
  }
  for (const name of Object.keys(statics.states ?? {})) fields.push(`  @State() ${name}: any;`);
  if (statics.elementRef) fields.push(`  @Element() ${statics.elementRef}: HTMLElement;`);

  // `@Watch` goes on the method it names; every watcher of the same method on one declaration.
  let body = rest;
  const byMethod = new Map();
  for (const w of statics.watchers ?? []) byMethod.set(w.methodName, [...(byMethod.get(w.methodName) ?? []), w.propName]);
  for (const [method, props] of byMethod) {
    const at = new RegExp(`^([ \\t]*)(?:async )?${method}\\(`, 'm').exec(body);
    if (!at) throw new Error(`stencilrs/ssr: ${tag} (${file}): watcher method ${method} not found`);
    body = `${body.slice(0, at.index)}${at[1]}${props.map((p) => `@Watch(${quote(p)})`).join(' ')}\n${body.slice(at.index)}`;
  }
  body = body.replace(/^export class (\w+)(\s+extends [^{]+)?\s*\{/m, (m) => `${component}\n${m}\n${fields.join('\n')}`);
  // Relative imports, from where the module will be served.
  body = body.replace(/(from\s+|import\s+)(["'])(\.{1,2}\/[^"']+)\2/g, (_, kw, q, spec) => `${kw}${q}${resolve(dir, spec).replaceAll('\\', '/')}${q}`);
  // The decorators come from `@stencil/core`.
  const need = ['Component', fields.some((f) => f.includes('@Prop')) && 'Prop', fields.some((f) => f.includes('@State')) && 'State', fields.some((f) => f.includes('@Element')) && 'Element', byMethod.size && 'Watch'].filter(Boolean);
  const importLine = `import { ${need.join(', ')} } from "@stencil/core";\n`;
  return { code: importLine + body, tagName: tag, origin: file };
};

/**
 * The component modules of the collection packages, as `{ file, code, tagName }`: `file` is the path to serve each at
 * (a virtual path ending in `.tsx`, so the compiler sees TypeScript; not under node_modules, which it leaves alone).
 */
export const readCollections = (root, packages) => {
  const out = [];
  for (const name of packages) {
    // `<name>/package.json` may not be in the package's `exports`: walk up from the project as Node's lookup does.
    let pkgFile = null;
    for (let d = resolve(root); ; d = dirname(d)) {
      const candidate = join(d, 'node_modules', name, 'package.json');
      if (existsSync(candidate)) {
        pkgFile = candidate;
        break;
      }
      if (dirname(d) === d) break;
    }
    if (!pkgFile) throw new Error(`stencilrs/ssr: collection ${name} is not installed (looked from ${root})`);
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
    if (!pkg.collection) throw new Error(`stencilrs/ssr: ${name} has no \`collection\` in its package.json`);
    const manifestFile = join(dirname(pkgFile), pkg.collection);
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    for (const entry of manifest.entries ?? []) {
      const file = join(dirname(manifestFile), entry);
      const result = collectionComponentToSource(readFileSync(file, 'utf8'), file);
      if (result) out.push({ file: `/__stencilrs_collection__/${name}/${entry}.tsx`, ...result });
    }
  }
  return out;
};
