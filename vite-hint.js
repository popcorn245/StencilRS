// The one line the Vite plugin prints when a file is left to Stencil's compiler because the order of a union in
// it depends on the whole program (docs/quirks.md, quirk 18): what the checker orders by which member it met
// first is not reproduced on purpose, and `"stableTypeOrdering": true` in the tsconfig makes it reproducible.
//
// The wording of the diagnostic lives in Rust (`UNION_ORDER_LEFT_TO_STENCIL` in crates/stencilrs_transform/src/types.rs);
// `isUnionOrderFallback` is the only place that knows it here, and test/vite-union-order.test.js checks it against
// what `analyze()` really reports.

const MARK = 'is left to Stencil\'s compiler. Add "stableTypeOrdering": true to the tsconfig';

/** Is this diagnostic message a member left to Stencil for the union-order reason (the option is off)? */
export const isUnionOrderFallback = (message) => message.startsWith('stencilrs: the type of ') && message.includes(MARK);

/**
 * Collects the files left to Stencil for that reason and prints ONE line about them, once per plugin instance
 * (a watch rebuild or a second path seeing the same file adds nothing). `flush` prints it; in a dev server,
 * which has no build end, it is printed shortly after the first file is seen.
 * @param {() => ({ info: (msg: string, opts?: object) => void } | null | undefined)} getLogger
 * @param {{ serve?: () => boolean }} [options]
 */
export function createUnionOrderHint(getLogger, { serve = () => false } = {}) {
  const files = new Set();
  let printed = false;
  let timer = null;
  const flush = () => {
    clearTimeout(timer);
    timer = null;
    if (printed || !files.size) return;
    printed = true;
    const n = files.size;
    getLogger()?.info(
      `[stencilrs] ${n} ${n === 1 ? 'file has a union' : 'files have a union'} TypeScript orders by which member it met first; ` +
        `${n === 1 ? 'its types come' : 'their types come'} from Stencil's compiler. ` +
        `Add "stableTypeOrdering": true to tsconfig.json to compile ${n === 1 ? 'it' : 'them'} with stencilrs.`,
      { timestamp: true },
    );
  };
  return {
    /** A file's diagnostics, from the transform or from the docs / types scan. */
    note(file, diagnostics) {
      if (printed || !diagnostics?.some((d) => isUnionOrderFallback(d.message))) return;
      files.add(String(file).replaceAll('\\', '/'));
      if (serve() && !timer) {
        timer = setTimeout(flush, 300);
        timer.unref?.();
      }
    },
    flush,
  };
}
