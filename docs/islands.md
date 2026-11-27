# Islands in the Express engine

`stencilEngine({ islands: {} })` (issue #191; background and measurements in [spike-islands.md](spike-islands.md)). A view marks parts of itself, the
engine renders the parts separately and in parallel, and puts the page back together. A view without markers is rendered exactly as it is
without the option (a test compares the bytes).

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><link rel="stylesheet" href="/ionic.css"></head>
<body>
<ion-app>
  <stencil-island name="header" client="load"><ion-header>...</ion-header></stencil-island>
  <ion-content>
    <stencil-island name="feed" client="visible" cache="60">...</stencil-island>
  </ion-content>
</ion-app>
</body></html>
```

```js
const engine = stencilEngine({ hydrate: './dist/hydrate/index.js', workers: 'auto', islands: { idStride: 1000, earlyHead: false } });
app.get('/', (req, res) => res.render('home', locals));              // one assembled response
const page = await engine.renderIslands(viewPath, locals);            // for a streaming responder (#192): page.chunks(), page.html(), page.manifest()
```

## What happens to a view

1. **Scan** (tokenizer-aware: not inside `<script>`, `<style>`, `<textarea>`, `<title>` or comments). Nested islands, a missing or repeated `name`, an
   unknown attribute, a `client` that is not `load | idle | visible | static | none` and a marker that is not closed are errors (`err.code === 'ESTENCIL_ISLAND'`)
   with the view and the line. The marker has no output; `cache` is parsed (empty or seconds) and reported, nothing reads it yet.
2. **Split.** The shell is the view with each island's markup cut out; the islands are fragments (`fullDocument: false`). Shell and islands render at once, on the
   pool when there is one: the shell with `idBase: 0`, island `i` with `idBase: (i + 1) * idStride`, so their hydration ids cannot collide.
   A render that used more ids than the stride (or whose `hydratedCount` did) fails the page, naming the island: raise `idStride`.
3. **Placement check.** An island must not be a *direct* child of a component that is not a shadow host and has slots (Stencil annotates such a child for relocation, and an
   island's html carries no such mark; after hydration the content is lost). The engine sees the annotation on the rendered marker and fails with the island's name. Put the
   island inside a plain element or a shadow host, or make the whole component the island.
4. **Assembly.** Each island's top-level elements get `data-island="name" data-client="..."` (no wrapper element: it would break slots and `::slotted`). Component styles
   (`result.styles`) are written once per page: the shell's stay where Stencil put them, and the islands' new ones go into `<head>` after those. Shadow-DOM components
   carry their own `<style>` in their shadow roots, as in any DSD render. In a view that is not a document there is no head: no styles are written, as for any fragment render.

An island whose body is only whitespace renders nothing; one with no element at its top level (text only) is an error, as it cannot carry `data-island`.

## `earlyHead`

With `earlyHead: true` and a view that has its own `<html>` and `<body>`, `page.chunks()` starts with the view's head before the shell has rendered: the `<html>` tag is the one
Stencil writes for it (class `hydrated`, `data-stencil-build`, ... from a probe render of an empty document with the same tag and options, made once and kept: the tag,
the build id, the mode and the language are the key, and the warm-up documents' tags are probed during `ready`), the rest up to `<body>` is the view's text. The shell's
component styles then go at the top of `<body>`, and each island's new ones in front of the island. Two consequences: Stencil's own additions to `<head>` (its `<meta charset>`)
are not there, so write yours; and the Stencil client does not look for `style[sty-id]` in the body, so it adds a copy of each to `<head>` on hydration (a few KB, parsed once).
Through `res.render` an early head changes nothing for the browser (the page is sent when it is complete); it exists for a responder that writes the chunks as they arrive.

## Limits

- **DSD only.** `serializeShadowRoot: 'scoped'` (or `false`) is refused at construction and per view. Scoped pages hydrate to a different DOM than the full render even without islands
  (spike follow-up 11).
- **Ancestor context.** An island does not see its ancestors at render time: `ion-item` in an `ion-list` island-less is rendered without `in-list`/`role`; the client adds them.
  Put the `ion-list` inside the island if the server html matters before hydration.
- **No page cache for island views** (the render cache is bypassed; per-island caching is a later issue). **`maxQueue`** counts every render: a page with `n` islands queues `n + 1`.
- **`maxHydrateCount`** (Stencil's 300 components per render) applies per island.
- Errors after bytes are sent, aborting pending renders when the socket closes and compression flush policy belong to the streaming responder (#192).

## Checks and numbers

From `examples/ionic` (after `npm run build:hydrate` and the client build described in spike-islands.md): `node check/islands.mjs` renders list-50 and kitchen-sink split into islands
and hydrates them in Chromium against the whole-page render (same DOM, same `style[sty-id]` count after hydration, no duplicate host ids); `node bench-islands.mjs [workers] [rounds]`
runs whole-page, islands (`res.render`), in-order chunks and early-head chunks interleaved over HTTP.
