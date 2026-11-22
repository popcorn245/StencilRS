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
  hydrate: HydrateApp | { default: HydrateApp } | string | URL | Promise<HydrateApp | { default: HydrateApp }>;
  /** `ejs.renderFile`, a consolidate engine, ...: fills in the locals. Omitted, a view is plain HTML. */
  engine?: InnerEngine;
  /** Options for every render; `res.render(view, { stencil: { ... } })` overrides them for one. */
  renderOptions?: StencilRenderOptions;
  /** Called once per unique warning; default `console.warn`. Errors go to the Express callback. */
  onDiagnostic?: (diagnostic: StencilDiagnostic) => void;
}

export function stencilEngine(options: StencilEngineOptions): (path: string, options: object, callback: (err: Error | null, html?: string) => void) => void;
