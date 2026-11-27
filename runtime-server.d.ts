/**
 * Server rendering for the stencilrs runtime. `load` imports the components compiled for the runtime, and is called
 * with the renderer it is for: `'dom'` for the bundle built for the happy-dom renderer, `'string'` for the bundle built
 * for the DOM-free one (`stringRenderer: true` in the Vite plugin writes it to `<outDir>/string/`). It can also be the
 * URL (or path) of the SSR build's entry module: the string variant is then `string/<same name>` next to it.
 *
 * `renderer: 'dom'` (default) installs a happy-dom window's globals, runs `load`, and returns a function that renders
 * an HTML fragment to a string: declarative shadow DOM, inlined styles, and the marks the client runtime uses to hydrate.
 *
 * `renderer: 'string'` renders without a DOM, 30 to 40 times faster, and gives the same string (byte for byte). A page
 * that uses what the string renderer cannot reproduce (light-DOM slots, async hooks, signals, DOM access in a hook...,
 * docs/runtime.md) is rendered by the happy-dom renderer, whose globals exist only while it renders.
 */
export declare function createRenderer(
  load: ((context: { renderer: 'dom' | 'string' }) => Promise<unknown>) | URL | string,
  options?: {
    /** Default `'dom'`. */
    renderer?: 'dom' | 'string';
    url?: string;
    settleRounds?: number;
    /** Write each component's state so components resume without rendering on load (default true). */
    resumable?: boolean;
    /** Experimental (docs/spike-lazy-define.md): hold back `customElements.define` for tags whose instances all wait. */
    lazyDefine?: 'wake' | 'idle' | null;
    /** `renderer: 'string'`: called with the reason, for each page rendered by the happy-dom renderer instead. */
    onFallback?: (reason: string, html: string) => void;
  },
): Promise<
  ((html: string, options?: { resumable?: boolean; lazyDefine?: 'wake' | 'idle' | null }) => Promise<string>) & {
    /** `renderer: 'string'`: how many pages fell back to the happy-dom renderer, and why the last one did. */
    fallbacks?: number;
    lastFallback?: string | null;
  }
>;
