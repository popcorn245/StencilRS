---
title: "Server-side rendering"
description: "Build a hydrate app from stencilrs components, render it from Express, and what the fast serializer and runtime patches change."
---

# Server-side rendering

Stencil renders components on the server with `renderToString` from a **hydrate app**: your components plus Stencil's server runtime
(mock-doc, a small DOM) in one ES module. `stencil build` makes it with the `ssr` output target. stencilrs makes the same module
from components it compiled, with `@popcorn245/stencilrs/ssr`, and ships an Express view engine, `@popcorn245/stencilrs/express`, that renders it.

The output is **byte-identical to Stencil 5's `renderToString`** on the same components and options; what changes is how long
it takes. [Numbers are on the benchmarks page](/benchmarks#server-side-rendering-ionic).

## Build a hydrate app

```js
// scripts/build-hydrate.mjs
import { buildHydrate } from '@popcorn245/stencilrs/ssr';

const { file, components } = await buildHydrate({
  srcDir: 'src',                 // components are found here (a .tsx with a @Component)
  outDir: 'dist/hydrate',        // writes dist/hydrate/index.js; leave it out to get `code` only
  namespace: 'my-app',           // Stencil's fsNamespace
  collections: ['ionicons'],     // packages whose Stencil collection components are part of the app
});
console.log(`${components.length} components -> ${file}`);
```

It runs a Vite build of the components with the stencilrs plugin (`componentExport: 'ssr'`), then bundles that with Stencil's
server runtime. The options, all optional (the types are in `ssr.d.ts`):

| Option | What it does |
|---|---|
| `root`, `srcDir`, `components` | The project root (where `@stencil/core` and `vite` resolve from), the folder searched for components, or an explicit file list |
| `collections` | Packages whose Stencil collection components are part of the app |
| `outDir` | Where `index.js` is written |
| `namespace`, `globalScript`, `globalStyles`, `preamble`, `env` | The same things as Stencil's `fsNamespace`, `globalScript`, `global-style` (`inject: 'all'`), `preamble` and `env` |
| `alias`, `plugins`, `stencilrs` | The component build: Vite `resolve.alias`, extra Vite plugins, options of the stencilrs plugin |
| `buildConditionals` | Overrides of the runtime's `BUILD` flags, on top of the ones the `ssr` target forces |
| `minifyCss` | Minify component styles with Stencil's own minifier, as `stencil build` does outside dev mode (default `true`) |
| `fastSerializer`, `runtimePatches` | The speed-ups below |
| `runnerPlugins` | Rolldown plugins for the second pass, which bundles Stencil's server runner |
| `logLevel` | Vite's log level (default `'warn'`) |

The result is a module with `renderToString(html, options)`. Call it as you would Stencil's:

```js
import { renderToString } from './dist/hydrate/index.js';

const { html, diagnostics } = await renderToString('<my-card title="Hi"></my-card>', {
  serializeShadowRoot: 'declarative-shadow-dom', // or 'scoped'
  fullDocument: false,
});
```

## What makes it faster

Two things, both on by default, both byte-identical to Stencil's output.

- **`fastSerializer`** swaps mock-doc's `serializeNodeToHtml` (a recursive generator that yields every tag, attribute and space as its
  own string; about 70% of `renderToString`'s CPU on an Ionic page) for a single-pass serializer that walks the same tree with plain
  recursion and keeps the original's decisions step for step. `prettyHtml: true` is not ported (it is a debugging aid that rewrites the
  tree); it, and anything that is not a mock-doc tree, goes to Stencil's own code.
- **`runtimePatches`** rewrite the text of Stencil's runtime at bundle time: a memo of nwsapi's selector parse (`selectorCache`),
  cheaper attribute lookups on mock-doc's `Proxy`-backed maps (`attributes`), an `elementChildren` fast path, and a cache of the
  scoped-CSS rewrite, which Stencil otherwise repeats for every component in every render (`cssCache`). Each is a faster way to
  compute the same value, or a memo of a pure function.

Opt out with `fastSerializer: false`, `runtimePatches: false` (none), or by name:

```js
await buildHydrate({ /* ... */ runtimePatches: { cssCache: false } });
```

[docs/profile-ssr.md](https://github.com/popcorn245/StencilRS/blob/next/docs/profile-ssr.md) has the profile that chose these and the
A/B for each patch.

## Express

`stencilEngine` wraps any Express view engine: the inner engine fills in the template's locals, then the hydrate app renders the
components in the result. Neither Express nor a template engine is a dependency of stencilrs; you hand them in.

```js
import { stencilEngine } from '@popcorn245/stencilrs/express';
import ejs from 'ejs';
import express from 'express';

const app = express();
app.engine('ejs', stencilEngine({ hydrate: './dist/hydrate/index.js', engine: ejs.renderFile }));
app.engine('html', stencilEngine({ hydrate: './dist/hydrate/index.js' })); // no inner engine: the file is the HTML
app.set('view engine', 'ejs');
app.get('/', (req, res) => res.render('home', { user: req.user }));
```

- **Any inner engine.** `ejs.renderFile`, a consolidate engine (Handlebars, Pug, ...), or any `(path, locals, callback)` function.
  Left out, a view is plain HTML.
- **`hydrate`** is a module, a path or URL to one, or a promise of either. It loads on the first render, so an app can start before the
  build exists. A hydrate app built by Stencil's own `ssr` target works too.
- **View cache.** Plain-HTML views are read once while Express's `view cache` is on (Express turns it on in production).
- **`renderOptions`** apply to every render; the `stencil` local overrides them for one:
  `res.render('home', { user, stencil: { serializeShadowRoot: 'scoped' } })`.
- **Full document or fragment.** A view that opens with a doctype or `<html>` is rendered as a document, anything else as a fragment.
  **A fragment has no `<head>`, so it loses the component styles Stencil puts there**. Render a full document, or add the styles yourself.
- **Diagnostics.** Warnings go to `onDiagnostic` (default `console.warn`), once per unique message. An `error` diagnostic fails the
  render: Express's callback receives an `Error` with the diagnostics on `err.diagnostics`.

`examples/express` is a complete app with EJS and plain-HTML views.

## Parity

The hydrate app renders the same bytes as Stencil 5's `ssr` output target. `examples/ionic/check/ssr-parity.mjs` builds both for Ionic
9.0.12 and compares `renderToString` on every page and shadow mode (`fragment`, `list-50`, `kitchen-sink`; declarative shadow DOM and
scoped); a single differing byte fails it, and the [benchmark](/benchmarks#server-side-rendering-ionic) runs the same comparison
before it times anything. The serializer and every patch also have differential tests in the repository's `test/`.

## Caveats

- **The patches are text patches of Stencil's runtime.** They are guarded: each snippet must occur exactly the expected number of times,
  and the build fails, naming the patch, if a Stencil upgrade moved the code, rather than shipping a runtime that silently lost an
  optimization or was half patched. Opt out by name if you hit one, and `runtimePatches: false` is Stencil's own code.
- **Cold start is where the patches help least.** The caches (selector parse, scoped CSS) start empty, so the first render pays for
  filling them and can be slower than a later one by far more than the patches saved on it; module load and the first render are
  listed apart on the benchmark page, and the gain shows from the second render on.
- **`prettyHtml: true`** uses Stencil's serializer; it is a debugging option.
- **The hydrate app is Stencil's runtime.** It behaves as Stencil 5's does, including what Stencil's server render cannot do.
