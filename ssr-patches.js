// Bundle-time patches for Stencil's hydrate runner, in the same guarded text-patch style as the serializer swap in
// ssr.js (`patchSerializer`): each one rewrites the text of a module Stencil ships (mock-doc inside
// `runtime/server/runner.mjs`, or the server runtime inside the ssr factory), never node_modules. All but `idBase` are
// byte-identical by construction (a faster way to compute the same value, or a memo of a pure function); `idBase` adds a
// render option and changes nothing while the option is unset.
//
//   buildHydrate({ runtimePatches: true })                     // default: all of them
//   buildHydrate({ runtimePatches: { cssCache: false } })      // opt one out
//   buildHydrate({ runtimePatches: false })                    // none (Stencil's own code)
//
// A patch has an `anchor` (text that says "this module has my target") and an `apply` that replaces exact snippets,
// each of which has to occur exactly the expected number of times; otherwise it throws, naming the patch and the
// snippet, rather than ship a runtime that silently lost an optimization or, worse, a half-patched one. The plugin
// also fails the build when an enabled patch found no module to patch (`buildEnd`). A Stencil upgrade that moves
// code lands here as a build error: bump the snippet together with test/ssr-patches.test.js.

const count = (text, needle) => text.split(needle).length - 1;

/** Replaces `from` (which must occur `times` times) with `to`. */
const swap = (patch, code, from, to, times = 1) => {
  const found = count(code, from);
  if (found !== times) throw new Error(`stencilrs ssr patch "${patch}": expected ${times} x \`${from.length > 90 ? `${from.slice(0, 90)}...` : from}\`, found ${found}; has Stencil's runtime changed?`);
  return code.split(from).join(to);
};

/** Text appended to a patched module: the helpers its replacements call. Module scope, so shared by every render. */
const region = (name, body) => `\n//#region stencilrs ssr patch: ${name}\n${body}\n//#endregion\n`;

export const RUNTIME_PATCHES = [
  {
    name: 'selectorCache',
    summary: "memoize nwsapi's selector parse (`closest`, `matches`, `querySelector` re-parse the same selector string on every call, and every render has a new nwsapi instance)",
    anchor: '}, parse = function(selectors, type) {',
    apply: (code) => {
      const out = swap(
        'selectorCache',
        code,
        '}, parse = function(selectors, type) {',
        `}, parse = function(selectors, type) {
			if (typeof selectors === "string" && arguments.length === 2) {
				const hit = $stencilrsParsed.get(selectors);
				if (hit !== void 0) return hit.slice();
				const parsed = parse$original(selectors, type);
				if (Array.isArray(parsed)) {
					if ($stencilrsParsed.size >= 4096) $stencilrsParsed.clear();
					$stencilrsParsed.set(selectors, parsed.slice());
				}
				return parsed;
			}
			return parse$original.apply(this, arguments);
		}, parse$original = function(selectors, type) {`,
      );
      return out + region('selectorCache', 'const $stencilrsParsed = new Map();');
    },
  },
  {
    name: 'attributes',
    summary: "mock-doc attribute lookups without the Proxy round trips (a trap per property read), the closure and the linear `find`",
    anchor: 'var MockAttributeMap = class {',
    apply: (code) => {
      let out = code;
      // The map reaches itself without the Proxy: one trap, once, instead of one per property a method reads.
      out = swap('attributes', out, 'var MockAttributeMap = class {\n\tcaseInsensitive;\n\t__items = [];', 'var MockAttributeMap = class {\n\tcaseInsensitive;\n\t__items = [];\n\t__raw = this;');
      out = swap(
        'attributes',
        out,
        'return this.__items.find((attr) => attr.localName === attrName && getNamespaceURI(attr.namespaceURI) === namespaceURI) || null;',
        `const items = this.__items;
		for (let i = 0; i < items.length; i++) {
			const attr = items[i];
			if (attr.localName === attrName && getNamespaceURI(attr.namespaceURI) === namespaceURI) return attr;
		}
		return null;`,
      );
      // Element methods go straight to the map behind the Proxy (cached per element, valid while `attributes` is the same object).
      out = swap('attributes', out, 'this.attributes.getNamedItem(', '$stencilrsRawAttributes(this).getNamedItem(', 2);
      out = swap('attributes', out, 'this.attributes.getNamedItemNS(', '$stencilrsRawAttributes(this).getNamedItemNS(', 2);
      out = swap('attributes', out, 'this.attributes.removeNamedItemNS(', '$stencilrsRawAttributes(this).removeNamedItemNS(', 2);
      out = swap('attributes', out, 'const attributes = this.attributes;', 'const attributes = $stencilrsRawAttributes(this);', 2);
      return (
        out +
        region(
          'attributes',
          `const $stencilrsAttrOf = Symbol("stencilrs.attributes");
const $stencilrsAttrRaw = Symbol("stencilrs.attributes.raw");
function $stencilrsRawAttributes(elm) {
	let map = elm.__attributeMap;
	if (map == null) map = elm.attributes;
	if (elm[$stencilrsAttrOf] !== map) {
		elm[$stencilrsAttrOf] = map;
		elm[$stencilrsAttrRaw] = map.__raw ?? map;
	}
	return elm[$stencilrsAttrRaw];
}`,
        )
      );
    },
  },
  {
    name: 'elementChildren',
    summary: '`children`, `childElementCount`, `firstElementChild` and the tree walks behind `getElementsByTagName` / `getElementsByClassName` (nwsapi runs them per query) read `childNodes` in a loop, not through a filter closure and a throwaway array per node',
    anchor: 'get childElementCount() {',
    apply: (code) => {
      let out = code;
      out = swap('elementChildren', out, 'get children() {\n\t\treturn this.childNodes.filter((n) => n.nodeType === 1);\n\t}', `get children() {
		const nodes = this.childNodes;
		const elements = [];
		for (let i = 0; i < nodes.length; i++) if (nodes[i].nodeType === 1) elements.push(nodes[i]);
		return elements;
	}`);
      out = swap('elementChildren', out, 'get childElementCount() {\n\t\treturn this.childNodes.filter((n) => n.nodeType === 1).length;\n\t}', `get childElementCount() {
		const nodes = this.childNodes;
		let n = 0;
		for (let i = 0; i < nodes.length; i++) if (nodes[i].nodeType === 1) n++;
		return n;
	}`);
      out = swap('elementChildren', out, 'get firstElementChild() {\n\t\treturn this.children[0] || null;\n\t}', `get firstElementChild() {
		const nodes = this.childNodes;
		for (let i = 0; i < nodes.length; i++) if (nodes[i].nodeType === 1) return nodes[i];
		return null;
	}`);
      // The walks behind `getElementsByTagName` / `getElementsByClassName`: the same elements in the same order, no array per node.
      out = swap('elementChildren', out, `function getElementsByClassName(elm, classNames, foundElms) {
	const children = elm.children;
	for (let i = 0, ii = children.length; i < ii; i++) {
		const childElm = children[i];`, `function getElementsByClassName(elm, classNames, foundElms) {
	const children = elm.childNodes;
	for (let i = 0, ii = children.length; i < ii; i++) {
		const childElm = children[i];
		if (childElm.nodeType !== 1) continue;`);
      out = swap('elementChildren', out, `function getElementsByTagName(elm, tagName, foundElms) {
	const children = elm.children;
	for (let i = 0, ii = children.length; i < ii; i++) {
		const childElm = children[i];`, `function getElementsByTagName(elm, tagName, foundElms) {
	const children = elm.childNodes;
	for (let i = 0, ii = children.length; i < ii; i++) {
		const childElm = children[i];
		if (childElm.nodeType !== 1) continue;`);
      return out;
    },
  },
  {
    name: 'cssCache',
    summary: "memoize the CSS rewrites a component's style goes through on first use in each render (`scopeCss`, `expandPartSelectors`): pure functions of the style text, but the runtime is rebuilt per render, so each one ran again for every render",
    anchor: 'style = scopeCss(style, scopeId, true);',
    apply: (code) => {
      let out = code;
      out = swap('cssCache', out, 'style = scopeCss(style, scopeId, true);', 'style = $stencilrsCssMemo("scope", scopeCss, style, scopeId);');
      out = swap('cssCache', out, 'style = expandPartSelectors(style);', 'style = $stencilrsCssMemo("parts", expandPartSelectors, style);');
      return (
        out +
        region(
          'cssCache',
          `// kind -> style text -> scopeId -> result. \`style\` is the same constant string every render, so the lookup hashes it once.
const $stencilrsCssResults = new Map();
function $stencilrsCssMemo(kind, fn, style, scopeId) {
	if (typeof style !== "string") return scopeId === void 0 ? fn(style) : fn(style, scopeId, true);
	let byStyle = $stencilrsCssResults.get(kind);
	if (!byStyle) $stencilrsCssResults.set(kind, (byStyle = new Map()));
	let byScope = byStyle.get(style);
	if (!byScope) byStyle.set(style, (byScope = new Map()));
	const key = scopeId === void 0 ? "" : scopeId;
	let result = byScope.get(key);
	if (result === void 0) byScope.set(key, (result = scopeId === void 0 ? fn(style) : fn(style, scopeId, true)));
	return result;
}`,
        )
      );
    },
  },
  {
    name: 'idBase',
    summary: "the `idBase` render option: a render with `idBase: n` numbers its hydration ids (`s-id`, `c-id`, `o.`/`t.` annotations) from n, with counters of its own, instead of the process-wide ones that only ever grow. Renders without it are untouched",
    anchor: '\tdoc[STENCIL_DOC_DATA] = docData;',
    apply: (code) =>
      swap(
        'idBase',
        code,
        '\tdoc[STENCIL_DOC_DATA] = docData;',
        '\tdoc[STENCIL_DOC_DATA] = typeof opts.idBase === "number" ? { hostIds: opts.idBase, rootLevelIds: opts.idBase, staticComponents: new Set() } : docData;',
      ),
  },
];

/** The patches an `runtimePatches` option selects: `true` or leaving it out is all of them, `false` none, an object opts out by name. */
export const selectPatches = (option = true) => {
  if (option === true) return RUNTIME_PATCHES;
  if (option === false || option == null) return [];
  if (Array.isArray(option)) return option;
  const known = new Set(RUNTIME_PATCHES.map((p) => p.name));
  for (const name of Object.keys(option)) if (!known.has(name)) throw new Error(`stencilrs ssr: unknown runtime patch "${name}" (known: ${[...known].join(', ')})`);
  return RUNTIME_PATCHES.filter((p) => option[p.name] !== false);
};

/**
 * Applies the given patches to a module's text: each patch whose anchor is in it. Returns the new text and the names
 * applied (a module that has none of the anchors comes back unchanged).
 */
export const patchRuntime = (code, patches = RUNTIME_PATCHES) => {
  const applied = [];
  for (const patch of patches) {
    if (!code.includes(patch.anchor)) continue;
    code = patch.apply(code);
    applied.push(patch.name);
  }
  return { code, applied };
};

/** A Rolldown/Rollup/Vite plugin applying `patchRuntime` to the runner bundle's modules; fails the build if a patch found nothing to patch. */
export const runtimePatchesPlugin = (option = true) => {
  const patches = selectPatches(option);
  const applied = new Set();
  return {
    name: 'stencilrs-runtime-patches',
    transform(code) {
      const result = patchRuntime(code, patches);
      if (!result.applied.length) return null;
      for (const name of result.applied) applied.add(name);
      return { code: result.code, map: null };
    },
    buildEnd() {
      const missing = patches.filter((p) => !applied.has(p.name)).map((p) => p.name);
      if (missing.length) throw new Error(`stencilrs ssr: runtime patch(es) ${missing.join(', ')} found no module to patch, so the unpatched runtime would ship; has Stencil's runtime changed? (opt out with runtimePatches: { name: false })`);
    },
  };
};
