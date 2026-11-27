import type { Plugin } from 'vite';

export interface BuildHydrateOptions {
  /** The project root: where `@stencil/core`, `vite` and `rolldown` are resolved from, and Vite's root. Default `process.cwd()`. */
  root?: string;
  /** The folder searched for components (a `.tsx` with a `@Component`; specs and stories are skipped). Default `src`, under `root`. */
  srcDir?: string;
  /** The component files, instead of searching `srcDir`. */
  components?: string[];
  /** Packages whose Stencil collection components are part of the app (`['ionicons']`). */
  collections?: string[];
  /** Writes `<outDir>/index.js`. Leave it out to get the code only. */
  outDir?: string;
  /** Stencil's `fsNamespace` (the runtime's `NAMESPACE`): the config's `namespace`, lower-cased. */
  namespace?: string;
  /** The global script (Stencil's `globalScript`), run at the start of each render. */
  globalScript?: string;
  /** CSS added to every render (the `global-style` targets of Stencil with `inject: 'all'`). */
  globalStyles?: string;
  /** Stencil's `preamble`, written as a banner comment. */
  preamble?: string;
  /** Vite `resolve.alias` of the component build. */
  alias?: Record<string, string> | Array<{ find: string | RegExp; replacement: string }>;
  /** Overrides of the runtime's `BUILD` flags, over the conditionals Stencil's `ssr` target forces. */
  buildConditionals?: Record<string, boolean>;
  /** Stencil's `env`. */
  env?: Record<string, unknown>;
  /** Options of the stencilrs Vite plugin (`componentExport` is always `'ssr'`). */
  stencilrs?: Record<string, unknown>;
  /** More Vite plugins for the component build (a CSS fix, a resolver). */
  plugins?: Plugin[];
  /** Minify component styles with Stencil's own minifier, as `stencil build` does outside dev mode. Default `true`. */
  minifyCss?: boolean;
  /** Swap mock-doc's HTML serializer for stencilrs' single-pass one (`fastSerializerPlugin`). Default `true`; `false` keeps Stencil's own. */
  fastSerializer?: boolean;
  /**
   * Byte-identical speed patches applied to Stencil's runtime text at bundle time (`ssr-patches.js`): `true` (default) is all of them, `false` none, `{ cssCache: false }` opts one out by name.
   * Each fails the build when the code it patches is not found.
   */
  runtimePatches?: boolean | Partial<Record<'selectorCache' | 'attributes' | 'elementChildren' | 'cssCache' | 'idBase', boolean>>;
  /**
   * Rolldown plugins of the second pass, which bundles `@stencil/core/runtime/server/runner` with the factory.
   * Replace a module of the runner bundle (mock-doc's serializer, for example) with `resolveId` / `load` / `transform`.
   */
  runnerPlugins?: unknown[];
  /** Vite's log level for the component build. Default `'warn'`. */
  logLevel?: 'info' | 'warn' | 'error' | 'silent';
}

export interface BuildHydrateResult {
  /** The hydrate app, an ES module. */
  code: string;
  /** `<outDir>/index.js`, or `null` when no `outDir` was given. */
  file: string | null;
  /** The tag of every component it renders. */
  components: string[];
}

/** Builds the hydrate app of Stencil's `ssr` output target from components compiled by stencilrs. */
export function buildHydrate(options?: BuildHydrateOptions): Promise<BuildHydrateResult>;

/** `SSR_FACTORY_INTRO` / `SSR_FACTORY_OUTRO` and the `modeResolver` declaration, read from the `@stencil/core` at `core`. Throws when they are not where they were. */
export function readFactoryWrapper(core: string): { SSR_FACTORY_INTRO: string; SSR_FACTORY_OUTRO: string; MODE_RESOLVER_DECLARATION: string };

/** True for a module that defines mock-doc's serializer. */
export function hasSerializer(code: string): boolean;
/** The module that defines `serializeNodeToHtml`, with the fast serializer in its place. */
export function patchSerializer(code: string): string;
/** A Rolldown/Rollup/Vite plugin that applies `patchSerializer`; it fails the build if nothing was patched. */
export function fastSerializerPlugin(): { name: string; transform(code: string): { code: string; map: null } | null; buildEnd(): void };

export interface RenderCacheOptions {
  /** Most pages kept (default 500). */
  max?: number;
  /** Most UTF-8 bytes of pages kept in total (default 64 MiB); a page larger than this is not cached. */
  maxBytes?: number;
  /** Milliseconds a page stays valid (default 0: no expiry). */
  ttl?: number;
}

/** A caching `renderToString`: pass `{ cache: false }` as the third argument to skip the cache for one call, or `{ ttl }` (ms) to replace the configured ttl for that lookup. */
export interface RenderCache {
  (html: string, options?: any, call?: { cache?: boolean; ttl?: number }): Promise<{ html: string; diagnostics?: object[] }>;
  clear(): void;
  stats(): { hits: number; misses: number; evictions: number; bypassed: number; entries: number; bytes: number };
}

/**
 * Wraps any `renderToString(html, options)` in an opt-in LRU cache, keyed by a SHA-256 of the HTML and options.
 * Only correct when the page is a pure function of those inputs. Results with an `error` diagnostic, and thrown errors, are never cached;
 * concurrent identical misses share one render. Options that cannot be serialized to JSON make that render uncacheable (it runs, uncached).
 * `true` is the defaults (`max` 500, `maxBytes` 64 MiB, `ttl` 0).
 */
export function createRenderCache(renderToString: (html: string, options?: any) => Promise<{ html: string; diagnostics?: any[] }>, options?: true | RenderCacheOptions): RenderCache;
