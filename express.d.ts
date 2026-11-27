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
  /**
   * Islands: a view may mark parts of itself `<stencil-island name="feed" client="visible" cache="60">...</stencil-island>`. The islands and
   * the rest of the page (the shell) render as separate fragments, in parallel on the pool, each with its own `idBase` range, and are
   * assembled into one page (what `res.render` sends, or `engine.renderIslands(path).chunks()` for a streaming responder). A view without
   * islands renders exactly as without this option. Declarative shadow DOM only: scoped rendering is refused. `true` is the defaults.
   * `engine.stream(path, locals)` and `streamView(engine, view, locals)` send it as it renders. See docs/islands.md. Experimental (#191, #192).
   */
  islands?: boolean | StencilIslandsOptions;
}

export interface StencilIslandsOptions {
  /** Hydration ids each island may use (default 1000): the shell counts from 0, island `i` from `(i + 1) * idStride`. An island that needs more fails the page, naming it. */
  idStride?: number;
  /**
   * Start a response with the view's own `<html>` (its attributes plus those Stencil adds, from a probe render made once per tag and options, at startup for the warm-up documents),
   * `<head>` and `<body>` before the shell has rendered, and write the shell's component styles at the top of the body. Only `engine.renderIslands(path).chunks()` writes before
   * the render is done; through `res.render` the page is the same bytes but is sent at the end. Default false. The head is the view's as written: Stencil does not add
   * its `<meta charset>` to it. Component styles written in the body make the Stencil client add a copy of each to `<head>` when it hydrates (harmless, a few KB).
   */
  earlyHead?: boolean;
  /** The default mode of `engine.stream` (default `'in-order'`). */
  stream?: StencilStreamMode;
  /** The default `fallback` of `engine.stream`: the html that replaces an island that failed after the response started. */
  fallback?: StencilStreamOptions['fallback'];
  /** The default `onError` of `engine.stream`: where a failure after the response started is logged (default `console.error`). */
  onError?: StencilStreamOptions['onError'];
  /**
   * The render cache of islands marked `cache` (`cache` alone: the `ttl` here, none by default; `cache="60"`: 60 seconds): `true` (default, the render cache's defaults),
   * `{ max, maxBytes, ttl }` (ms) like `renderCache`, or `false` to ignore the marks. Keyed on the island's html and the render options with its `idBase`, so a hit
   * has the ids of its slot. The shell and unmarked islands always render. A view opts out for a request with the `stencilCache: false` local.
   */
  cache?: boolean | RenderCacheOptions;
  /**
   * Start the client for the page: `res.render` writes, before `</body>`, the page's boot configuration (`<script type="application/json" id="stencil-islands">`: the module files of the shell and of each
   * island, from `result.components` and the `components.json` of a `hydrateClient` build), `modulepreload` links for what loads at once, and the script `@popcorn245/stencilrs/islands`
   * (the plugin's `hydrateClient: { islands: true }` writes it as `islands.js`). A `static` or `none` island is rendered without hydration annotations. Documents only. See docs/islands.md.
   */
  client?: boolean | StencilIslandsClientOptions;
}

export interface StencilIslandsClientOptions {
  /** URL prefix of the build's files (default `/`). */
  base?: string;
  /** The build's `components.json`: a path, or the parsed object. */
  manifest: string | { tags: Record<string, string>; imports?: Record<string, string[]> };
  /** Modules that run before any component is defined (Ionic's global script), relative to `base`. */
  init?: string[];
  /** URL of the boot script (default `<base>islands.js`); `false`: none, your own bundle imports `@popcorn245/stencilrs/islands`. */
  script?: string | false;
  /** `modulepreload` for the shell's and the `load` islands' modules and their chunks (default true). */
  preload?: boolean;
  /** `rootMargin` of the `visible` directive (default `0px`). */
  margin?: string;
}

/** `'in-order'`: the shell, then each island in the order of the view as it is next in line. `'out-of-order'`: the whole shell with an anchor for each island at once, then each island as it finishes, moved into place by a one-line script. */
export type StencilStreamMode = 'in-order' | 'out-of-order';

export interface StencilStreamOptions {
  mode?: StencilStreamMode;
  /** A CSP nonce for the inline script and style of the out-of-order mode (base64 or base64url characters only), or a function returning one. Component `<style>` tags carry no nonce. */
  nonce?: string | (() => string);
  /** When it aborts the iteration ends and the renders that have not started are cancelled (one a worker has taken runs to its end). Breaking out of a `for await` does the same. */
  signal?: AbortSignal;
  /** The html that replaces an island that failed after bytes were sent (default: an empty hidden `<div data-island="name" data-client="none" data-island-error>`). */
  fallback?: (name: string, error: Error) => string;
  /** Called for each failure after bytes were sent, with the island's name (`null`: the page). Default: `console.error`. */
  onError?: (error: Error, info: { view: string; island: string | null }) => void;
  /** In-order: put islands that are ready together in one chunk, so one flush (default true). */
  coalesce?: boolean;
}

export interface StreamViewOptions extends Omit<StencilStreamOptions, 'signal' | 'nonce'> {
  nonce?: string | ((req: any, res: any) => string);
  /** Gzip in the handler when the client accepts it, with a sync flush after every chunk (default false: use `compression`, which is flushed with `res.flush()`, or a proxy). `{ level }` is zlib's. */
  compress?: boolean | { level?: number };
}

/**
 * An Express handler that streams a view as `engine.stream` renders it. `locals` is an object or `(req, res) => object`, merged over `app.locals`
 * and `res.locals`. An error before the first byte goes to `next(err)`; after it, the failure is logged and the response ends. A client that
 * hangs up cancels the renders that have not started.
 */
export function streamView(engine: StencilExpressEngine, view: string, locals?: object | ((req: any, res: any) => object | Promise<object>), options?: StreamViewOptions): (req: any, res: any, next: (err?: unknown) => void) => Promise<void>;

/** An island of a view, as `engine.renderIslands` reports it. */
export interface StencilIsland {
  name: string;
  /** `load` (default), `idle`, `visible`, `static` or `none`: written on the island's roots as `data-client`; the client (`@popcorn245/stencilrs/islands`) reads it. */
  client: 'load' | 'idle' | 'visible' | 'static' | 'none';
  /** The `cache` attribute: null (absent), true (bare) or seconds (0: not cached). */
  cache: boolean | number | null;
}

/** A view with islands, split and rendering. */
export interface StencilIslandPage {
  islands: StencilIsland[];
  /** Whether `chunks()` starts with the head, before the shell has rendered (`islands.earlyHead`, and the view is a document with its own `<html>` and `<body>`). */
  early: boolean;
  /** The page in the order it can be written: each piece the moment it is next in line. A render that fails throws out of the iteration, after the earlier chunks. Component styles are in the body here. */
  chunks(): AsyncGenerator<string, void, void>;
  /** The whole page. Without an early head the islands' new component styles are in `<head>` (after the shell's), as in a whole-page render. */
  html(): Promise<string>;
  /** Per island, after it has rendered: its `StencilIsland` fields and the components it hydrated (`{ tag, mode, count, depth }`), for a per-island client manifest. */
  manifest(): Promise<Array<StencilIsland & { components: StencilFragmentResult['components'] }>>;
  /** After every render: the tags (sorted) the shell and each island used, for the client's boot or a build-time manifest. */
  clientManifest(): Promise<{ shell: string[]; islands: Array<{ name: string; client: StencilIsland['client']; tags: string[] }> }>;
  /** The markup that starts the client (`islands.client`): write it before `</body>`, with the last chunk. `''` without that option or for a fragment. `res.render` does it itself. */
  bootTag(): Promise<string>;
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
  /**
   * The view as an island page with every render already started, or null when the engine has no `islands` option or the view no islands.
   * Runs the inner engine with `locals` like `res.render`. The seam a streaming responder uses: write `page.chunks()` as they arrive. Experimental.
   */
  renderIslands(path: string, locals?: object, options?: { signal?: AbortSignal }): Promise<StencilIslandPage | null>;
  /**
   * The page as chunks to write, each one flush: the early head (if any), the shell up to the first island, then the islands (see `StencilStreamMode`).
   * A view without islands is one chunk. A failure before the first chunk throws out of the iteration; an island that fails later is replaced by its fallback and logged.
   * Experimental (#192).
   */
  stream(path: string, locals?: object, options?: StencilStreamOptions): AsyncGenerator<string, void, void>;
  /** The render cache of `renderCache`, or null: `clear()` and `stats()`. */
  renderCache: RenderCache | null;
  /** The per-island render cache (`islands.cache`), or null when the engine has no islands or `islands.cache` is false: `clear()` and `stats()`. */
  islandCache: RenderCache | null;
  /** Stops the workers; renders in flight or queued fail with `ESTENCIL_CLOSED`. */
  close(): Promise<void>;
}

export function stencilEngine(options: StencilEngineOptions): StencilExpressEngine;
