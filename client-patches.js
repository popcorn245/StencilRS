// Patches for Stencil's client runtime (`dist/runtime/client/runtime.js` and `lazy.js`), applied by the Vite plugin's `transform`
// hook to the text of the module Stencil ships (never node_modules), in the same guarded text-patch style as ssr-patches.js:
// each snippet has to occur exactly the expected number of times, otherwise it throws, naming the patch.
//
// This fixes a race in Stencil's own hydration, which moves the light-DOM children of a shadow host back to their authored place.
// Remove this module once Stencil fixes it upstream.

const count = (text, needle) => text.split(needle).length - 1;

/** Replaces `from` (which must occur `times` times) with `to`. */
const swap = (patch, code, from, to, times = 1) => {
  const found = count(code, from);
  if (found !== times) throw new Error(`stencilrs client patch "${patch}": expected ${times} x \`${from.length > 90 ? `${from.slice(0, 90)}...` : from}\`, found ${found}; has Stencil's runtime changed?`);
  return code.split(from).join(to);
};

export const CLIENT_RUNTIME_PATCHES = [
  {
    name: 'orgLocationOrder',
    summary: "`initializeClientHydrate` also tests `parentElement.shadowRoot`, which is set only once that parent's module has loaded, so with per-tag modules a load-order race decides whether a light-DOM child goes back to its authored place or stays in its slot position (`s-en === \"\"` already says the parent is a shadow component)",
    from: 'if (orgLocationNode.parentElement.shadowRoot && orgLocationNode["s-en"] === "")',
    to: 'if (orgLocationNode["s-en"] === "")',
  },
];

/** Stencil's client runtime files, by path. */
export const CLIENT_RUNTIME_RE = /\/node_modules\/@stencil\/core\/dist\/runtime\/client\/(?:runtime|lazy)\.js$/;

/** Applies every client patch to `code` when `file` is one of Stencil's client runtime files; anything else comes back unchanged. */
export const applyClientRuntimePatches = (code, file) => {
  if (!CLIENT_RUNTIME_RE.test(file.replaceAll('\\', '/'))) return code;
  let out = code;
  for (const p of CLIENT_RUNTIME_PATCHES) out = swap(p.name, out, p.from, p.to);
  return out;
};
