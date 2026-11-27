/**
 * The DOM-free server runtime (runtime-string.js). A server bundle built with `stencilrs({ runtime: 'stencilrs',
 * stringRenderer: true })` imports it in place of the runtime; `createRenderer(load, { renderer: 'string' })`
 * (`@popcorn245/stencilrs/runtime/server`) drives it, and renders a page that uses what it cannot reproduce with the
 * happy-dom renderer instead. You rarely import this module yourself.
 */

/** Thrown for a page this renderer cannot write byte-for-byte as the happy-dom renderer does (`message` says why). */
export declare class Fallback extends Error {
  readonly name: 'Fallback';
}

export interface StringRenderOptions {
  /** Write each component's state so components resume without rendering on load (default true). */
  resumable?: boolean;
  /** Experimental (docs/spike-lazy-define.md): hold back `customElements.define` for tags whose instances all wait. */
  lazyDefine?: 'wake' | 'idle' | null;
}

/**
 * Imports the server bundle (built for this runtime) and returns a function that renders an HTML fragment to a string,
 * or rejects with `Fallback`. `render.sync` is the same without waiting for the microtasks a hook left (benchmarks).
 */
export declare function createStringRenderer(
  load: () => Promise<unknown>,
  options?: StringRenderOptions & { url?: string },
): Promise<((html: string, options?: StringRenderOptions) => Promise<string>) & { sync(html: string, options?: StringRenderOptions): string }>;

/** What the compiled components import: the same surface as `@popcorn245/stencilrs/runtime`. */
export declare const Base: new () => any;
export declare const define: (...args: any[]) => void;
export declare const template: (...args: any[]) => any;
export declare const t: (...args: any[]) => any;
