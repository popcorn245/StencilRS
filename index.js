import { createRequire } from 'node:module';

const native = createRequire(import.meta.url)('./stencilrs.node');

/**
 * Read the Stencil components in one module.
 * @param {string} source module source (TS/TSX)
 * @param {string} fileName used to pick the parser (`.ts`, `.tsx`)
 * @returns {{ components: object[], diagnostics: object[] }}
 */
export const analyze = (source, fileName) => native.analyze(source, fileName);
