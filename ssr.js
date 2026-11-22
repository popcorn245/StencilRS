// Swap mock-doc's HTML serializer for ssr-serializer.js in a Stencil hydrate runner, at bundle time.
//
//   import { fastSerializerPlugin } from '@popcorn245/stencilrs/ssr';
//   rolldown({ input: '@stencil/core/runtime/server/runner', plugins: [fastSerializerPlugin(), ...] })
//
// The serializer lives inside the runner bundle (Stencil ships mock-doc inlined in
// `runtime/server/runner.mjs`, and a built hydrate app such as @ionic/core's carries its own copy),
// so there is no module to re-route. `patchSerializer` edits the text of the module that defines it:
// the original is renamed `serializeNodeToHtml$original` and a function of the old name, which every
// caller (outerHTML, innerHTML, `serializeDocumentToString`) already uses, forwards to the fast
// serializer with the original as its fallback. The fast serializer's source is inlined as it is,
// since a bundle that is already built can't resolve an import. node_modules is never touched.
//
// If the runner is not what this expects (Stencil renamed or restructured the function, or changed
// the id attribute the serializer reads), it throws rather than shipping the slow serializer
// unnoticed or, worse, a fast one that differs: bump it together with the differential test.
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync(new URL('./ssr-serializer.js', import.meta.url), 'utf8');
const DEFINITION = 'function serializeNodeToHtml(';

const count = (text, needle) => text.split(needle).length - 1;

/** True for a module that defines mock-doc's serializer (what `patchSerializer` would patch). */
export const hasSerializer = (code) => code.includes(DEFINITION) && code.includes('function* streamToHtml(');

/**
 * @param code the text of the module that defines `serializeNodeToHtml`
 * @returns that module with the fast serializer in its place
 */
export const patchSerializer = (code) => {
  if (!hasSerializer(code)) throw new Error('stencilrs fast serializer: no `function serializeNodeToHtml(` next to `function* streamToHtml(` in this module; has mock-doc changed?');
  if (count(code, DEFINITION) !== 1) throw new Error(`stencilrs fast serializer: expected one \`${DEFINITION}\`, found ${count(code, DEFINITION)}`);
  // The fast serializer hardcodes the attribute Stencil's hydrate ids use.
  if (!code.includes('const HYDRATE_ID = "s-id";')) throw new Error('stencilrs fast serializer: `const HYDRATE_ID = "s-id"` not found; the id attribute changed, so update ssr-serializer.js and its test');
  const fast = SOURCE.replace('export function fastSerializeNodeToHtml(', 'function fastSerializeNodeToHtml(');
  if (fast === SOURCE) throw new Error('stencilrs fast serializer: ssr-serializer.js no longer exports fastSerializeNodeToHtml');
  return `${code.replace(DEFINITION, 'function serializeNodeToHtml$original(')}
//#region stencilrs fast serializer
const $stencilrsFastSerialize = (() => {
${fast}
return fastSerializeNodeToHtml;
})();
function serializeNodeToHtml(elm, serializationOptions = {}) {
	return $stencilrsFastSerialize(elm, serializationOptions, serializeNodeToHtml$original);
}
//#endregion
`;
};

/** A Rolldown/Rollup/Vite plugin that applies `patchSerializer`; it fails the build if nothing was patched. */
export const fastSerializerPlugin = () => {
  let patched = 0;
  return {
    name: 'stencilrs-fast-serializer',
    transform(code) {
      if (!hasSerializer(code)) return null;
      patched++;
      return { code: patchSerializer(code), map: null };
    },
    buildEnd() {
      if (patched === 0) throw new Error('stencilrs fast serializer: no module defining mock-doc\'s serializeNodeToHtml was bundled, so the slow serializer would ship; is this the hydrate runner?');
    },
  };
};
