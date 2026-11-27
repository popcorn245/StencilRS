# Islands example

A small Express page with a slow island, rendered by `stencilEngine({ islands })`, sent by `streamView` and hydrated by the islands client
(`islands.client`) from a `hydrateClient` build. Reference: [docs/islands.md](../../docs/islands.md).

```sh
npm install
npm run build      # dist/hydrate (the server's hydrate app) and dist/client (per-tag modules, components.json, islands.js)
npm start          # http://localhost:3000
npm test           # response timing, and the counter hydrating in Chromium
```

What the page (`views/home.html`) has:

| island | `client` | what it shows |
|---|---|---|
| `counter` | `load` | `ex-counter`: hydrated at boot, so the button counts |
| `feed` | `visible` | `ex-feed` with `delay="1500"`: the server render waits 1.5 s, as an island waiting on a database would. The component's module is requested when the island scrolls into view |
| `footer` | `static`, `cache` | `ex-note`: rendered once and served from the island cache after that, never hydrated, its module is never requested |

Three routes render the same view:

- `/` out of order: the shell and the counter arrive at once; the feed is swapped in when it is ready (about 1.5 s later).
- `/in-order` in order: islands appear in document order, so the footer waits for the feed.
- `/whole` `res.render`: one response, sent when the slow feed is done. The comparison.

Try `curl -s -o /dev/null -w '%{time_starttransfer} %{time_total}\n' localhost:3000/` against `/whole`: the first byte is 40 ms against 1.5 s.
(`/` is the only one that does not wait for the feed to show the rest of the page.)

The delay is a component's `componentWillLoad` guarded by `Build.isServer` (`src/components/ex-feed.tsx`); the browser adopts the server's markup and skips it.
`build.mjs` is the two builds: `buildHydrate` for the server and `stencilrs({ hydrateClient: { islands: true } })` for the browser.
