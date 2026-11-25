/**
 * Experimental: server rendering for the stencilrs runtime. Installs a happy-dom window's globals,
 * runs `load` (which imports the components compiled for the runtime), and returns a function that
 * renders an HTML fragment to a string: declarative shadow DOM, inlined styles, and the marks the
 * client runtime uses to hydrate.
 */
export declare function createRenderer(
  load: () => Promise<unknown>,
  options?: {
    url?: string;
    settleRounds?: number;
    /** Write each component's state so components resume without rendering on load (default true). */
    resumable?: boolean;
  },
): Promise<(html: string, options?: { resumable?: boolean }) => Promise<string>>;
