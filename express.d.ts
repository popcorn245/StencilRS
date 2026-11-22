export interface StencilRenderOptions {
  /** `'declarative-shadow-dom'` (the default) or `'scoped'`: how shadow components are serialized. */
  serializeShadowRoot?: 'declarative-shadow-dom' | 'scoped' | boolean | { default?: string; [tag: string]: unknown };
  /** Inferred from the view: a doctype or `<html>` means a full document. Fragments are rendered without `<head>`, so without styles. */
  fullDocument?: boolean;
  prettyHtml?: boolean;
  [option: string]: unknown;
}

export interface StencilDiagnostic {
  level: 'error' | 'warn' | 'info' | 'log' | 'debug' | string;
  messageText: string;
  [key: string]: unknown;
}

export interface HydrateApp {
  renderToString(html: string, options?: StencilRenderOptions): Promise<{ html: string; diagnostics?: StencilDiagnostic[] }>;
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
  /** Milliseconds a pooled render may take (default 30000, 0 for no limit). Past it the worker is replaced and the render fails with `ESTENCIL_TIMEOUT`. */
  renderTimeout?: number;
}

export interface StencilExpressEngine {
  (path: string, options: object, callback: (err: Error | null, html?: string) => void): void;
  /** Resolves when every worker has loaded the hydrate app (at once without `workers`); rejects if one cannot. */
  ready: Promise<void>;
  /** Stops the workers; renders in flight or queued fail with `ESTENCIL_CLOSED`. */
  close(): Promise<void>;
}

export function stencilEngine(options: StencilEngineOptions): StencilExpressEngine;
