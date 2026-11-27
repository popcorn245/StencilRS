import type { RenderCache, RenderCacheOptions } from './ssr.js';

export interface StencilRenderOptions {
  /** `'declarative-shadow-dom'` (the default) or `'scoped'`: how shadow components are serialized. */
  serializeShadowRoot?: 'declarative-shadow-dom' | 'scoped' | boolean | { default?: string; [tag: string]: unknown };
  /** Inferred from the view: a doctype or `<html>` means a full document. Fragments are rendered without `<head>`, so without styles. */
  fullDocument?: boolean;
  prettyHtml?: boolean;
  /**
   * Hydration ids (`s-id`, `c-id`, `<!--o.0.N-->`, ...) of this render count from `idBase` (a non-negative integer) on counters
   * of the render's own, instead of the process-wide ones that only grow. Needs the `idBase` runtime patch (on by default in `buildHydrate`).
   * `idBase: 0` makes a render reproducible: the same input gives the same ids whatever was rendered before, in this thread or another.
   */
  idBase?: number;
  [option: string]: unknown;
}

export interface StencilDiagnostic {
  level: 'error' | 'warn' | 'info' | 'log' | 'debug' | string;
  messageText: string;
  [key: string]: unknown;
}

/** What `engine.renderFragment` resolves with. */
export interface StencilFragmentResult {
  html: string;
  /** The `<style>` blocks the render put in its head: `{ href, id, content }` each (`id` is the `sty-id`). */
  styles: Array<{ href: string | null; id: string | null; content: string }>;
  /** The components the render hydrated, one entry per tag and mode. */
  components: Array<{ tag: string; mode?: string; count: number; depth: number }>;
  /** How many component hosts the render hydrated; with `idBase`, the ids it used are `idBase + 1 ... idBase + hydratedCount` at most. */
  hydratedCount: number;
  /** All of them, `error` level included: a fragment render does not throw on a diagnostic (a thrown render fails the promise). */
  diagnostics: StencilDiagnostic[];
}

export interface HydrateApp {
  renderToString(html: string, options?: StencilRenderOptions): Promise<{ html: string; diagnostics?: StencilDiagnostic[]; styles?: StencilFragmentResult["styles"]; components?: StencilFragmentResult["components"]; hydratedCount?: number }>;
}

export type InnerEngine = (path: string, locals: Record<string, any>, callback: (err: Error | null, html?: string) => void) => void;

export interface StencilEngineOptions {
  /** A hydrate app module, a path or URL to one, or a promise of either. */
  /** With `workers`, only a path or URL: a module object cannot cross to a worker thread. */
  hydrate: HydrateApp | { default: HydrateApp } | string | URL | Promise<HydrateApp | { default: HydrateApp }>;
  /** `ejs.renderFile`, a consolidate engine, ...: fills in the locals. Omitted, a view is plain HTML. */
  engine?: InnerEngine;
  /** Options for every render; `res.render(view, { stencil: { ... } })` overrides them for one. */
  renderOptions?: StencilRenderOptions;
  /** Called once per unique warning; default `console.warn`. Errors go to the Express callback. */
  onDiagnostic?: (diagnostic: StencilDiagnostic) => void;
  /** Render on a pool of `worker_threads`, each loading the hydrate app once. `'auto'` is available parallelism minus one; 0 or omitted renders in-process. The inner engine still runs on the main thread. */
  workers?: number | 'auto';
  /** Renders that may wait for a free worker (default 100); one more fails with `err.code === 'ESTENCIL_QUEUE_FULL'`. */
  maxQueue?: number;
  /** Node's compile cache (`module.enableCompileCache`) for the hydrate app, in this process and in each worker: `true` (the default; a no-op on a Node without it), `false` to opt out, or a cache directory. It applies to modules loaded after the call, so give `hydrate` as a path or URL rather than an already imported module. */
  compileCache?: boolean | string;
  /**
   * Render at startup so the first request is not JIT-cold: a list of view paths (run through the inner engine with no locals)
   * and HTML strings (starting with `<`), or `{ views, times }` to run the list `times` times (default 1). Shape them like real traffic.
   * In-process and on every worker, with the engine's `renderOptions`; `ready` resolves after it. (`true` is a TypeError.)
   */
  warmup?: string[] | { views: string[]; times?: number };
  /**
   * Cache rendered pages in the main thread, before a worker is asked (a hit costs no round-trip). `true` is the defaults.
   * The key is a hash of the final HTML (after the inner engine) and the merged render options; an identical request returns identical bytes.
   * Only correct when the page is a pure function of those inputs. A result with an `error` diagnostic or a thrown error is never stored; concurrent identical misses share one render.
   * One render opts out with the `stencilCache: false` local (`res.render('page', { stencilCache: false })`).
   */
  renderCache?: boolean | RenderCacheOptions;
  /** Milliseconds a pooled render may take (default 30000, 0 for no limit). Past it the worker is replaced and the render fails with `ESTENCIL_TIMEOUT`. */
  renderTimeout?: number;
}

export interface StencilExpressEngine {
  (path: string, options: object, callback: (err: Error | null, html?: string) => void): void;
  /** Resolves once the hydrate app is loaded and warmed up on the engine and every worker (at once without `warmup` or `workers`). Rejects if the app cannot load or a warm-up render fails; after a failed warm-up the engine still renders. */
  ready: Promise<void>;
  /**
   * Renders markup as a fragment, with options of its own on top of `renderOptions` (`fullDocument` is `false` unless given, not inferred),
   * and resolves with the html, styles, components, hydrated count and diagnostics. In-process or on the worker pool (queue, timeout and
   * crash handling as for views). Skips the inner engine and the render cache. Experimental: the building block of islands (#191).
   */
  renderFragment(html: string, options?: StencilRenderOptions): Promise<StencilFragmentResult>;
  /** The render cache of `renderCache`, or null: `clear()` and `stats()`. */
  renderCache: RenderCache | null;
  /** Stops the workers; renders in flight or queued fail with `ESTENCIL_CLOSED`. */
  close(): Promise<void>;
}

export function stencilEngine(options: StencilEngineOptions): StencilExpressEngine;
