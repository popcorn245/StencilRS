# Spike: lazy `customElements.define` on a resumed page

Question: on a resumed page, can the stencilrs runtime cut load-time main-thread JS by not upgrading
components that wait?

Answer: yes. Holding back `customElements.define` for tags whose every instance waits cuts
main-thread JS during load on the 500-card page from about 23 ms to about 11 ms (mobile profile),
which is Qwik's figure from the same run (9 ms). The cost moves to the first event that wakes the
tag: about +5 ms desktop and +8 ms mobile on the first click. Deferring to idle time moves nothing
off the main thread in total; it only changes when it runs.

## Method

`examples/starter/bench/load` (500 product cards, desktop and mobile profiles, fresh context per
load, server gzips; see "Page-load benchmark against Qwik" in runtime.md). Shared 4-vCPU box with
other benchmarks running: load average 1.8 before the final run and 5.1 after it, so differences
under about 3 ms (mobile) are noise. Timings are the median of 15 loads, interleaved across variants
within each iteration (`spike-run.mjs`), with min-max in brackets in the raw output. Chrome stable
(`/usr/bin/google-chrome`), Playwright 1.64.1, Qwik 1.20.4 built as in runtime.md.

Variants:

- **base**: the bundle from `origin/next`, before this change.
- **off**: this change, option not set (should equal base; it is the control for the runtime code
  added).
- **wake**: `createRenderer(load, { lazyDefine: 'wake' })`.
- **idle**: `{ lazyDefine: 'idle' }`.

Reproduce:

```sh
cd examples/starter && npm ci && (cd bench/qwik && npm ci)
npx vite build --config bench/load/vite.config.ts && npx vite build --ssr --config bench/load/vite.config.ts
(cd bench/qwik/load && npx vite build && npx vite build --ssr src/entry.ssr.tsx && node render.mjs)
for v in off wake idle; do rm -rf bench/dist-load-$v; cp -r bench/dist-load-stencilrs bench/dist-load-$v; done
OUT_DIR=dist-load-off node bench/load/render.mjs
LAZY_DEFINE=wake OUT_DIR=dist-load-wake node bench/load/render.mjs
LAZY_DEFINE=idle OUT_DIR=dist-load-idle node bench/load/render.mjs
# base = a copy of the build from origin/next as dist-load-base
CHROME=/usr/bin/google-chrome node bench/load/spike-run.mjs 15      # VARIANTS=base,off,wake,idle,qwik
node bench/load/spike-profile.mjs <unminified dist dir> 9 4          # CPU profile, inclusive time by function
node bench/load/spike-micro.mjs 4 15                                 # 500-element define, runtime vs bare class
```

## Baseline reproduced

`node bench/load/run.mjs 15` on the unchanged tree, load average 0.9 before and 3.5 after (other
spikes started during it):

| | stencilrs desktop | Qwik desktop | stencilrs mobile | Qwik mobile |
|---|---:|---:|---:|---:|
| JS before interactive (KB gzip) | 9.1 | 22.9 | 9.1 | 22.9 |
| Interactive (ms) | 37 | 76 | 403 | 403 |
| Main-thread JS during load (ms) | 9 | 3 | 26 | 10 |
| First click → DOM (ms) | 11.2 | 28.3 | 48.2 | 96.1 |
| Next click (ms) | 2.5 | 10.0 | 9.4 | 32.1 |
| Counter click (ms) | 2.1 | 13.3 | 12.8 | 33.0 |

This is slower than the numbers in runtime.md (5/20 ms JS) because the box was busy; in the
interleaved runs below the same bundle measures 5-6 ms desktop and 23-25 ms mobile. Mobile's
interactive time is dominated by the emulated network (inline catcher, HTML-bound), not by JS.

## Where the 20-25 ms goes

CPU profile (`Profiler`, 100 us sampling, 4x throttle, unminified build, median of 9-11 loads;
inclusive time, so it includes the profiler's own overhead and the throttle: read the ratios, not
the absolute values). Run on the `off` page; the numbers moved by a few ms between runs on this box.

| Piece | ms (4x) | Whose |
|---|---:|---|
| `customElements.define` of `load-card`, inclusive | 17-19 | |
| of which the browser (define + 500 upgrade reactions, self time) | 8-10 | browser |
| of which `LoadCard` constructor + `Base` constructor | 6-7 | ours |
| of which `connectedCallback` (500 elements) | 3.5-4 | ours |
| `hasState` (finds the state script; JSON is not parsed) | 0.9 | ours |
| Module evaluation, `load-app` define, polyfill | 4-6 | ours / bundle |
| Playwright's own evaluate/UtilityScript frames | 2-3 | harness (not in the load figure) |

So define plus upgrade is about 65-75% of the load script time, and roughly 55% of that is ours
(constructor: three property defaults through the accessors, a `Map`, six fields; connectedCallback:
attribute reads, `classCanWait`, `waiting.set`). The micro-benchmark (`spike-micro.mjs`, 500
elements, in-page, cold JIT included) agrees: a bare `class extends HTMLElement` defines in 0.7 ms
(desktop) / 2.3 ms (4x); the real runtime's class takes 1.6 / 7.9 ms; with the constructor's
property defaults removed 1.4 / 5.0 ms. The state parse and the catcher are not visible: the state
JSON is never parsed on load, and the catcher is a handful of listener calls.

## Results

500 cards, median of 15 interleaved loads, ms. Qwik is from the same run. Min-max ranges were wide on this box (for example wake mobile JS 2-18, first click 28-135).

Desktop:

| Variant | Main-thread JS | Interactive | First click → DOM | Next click | Counter click |
|---|---:|---:|---:|---:|---:|
| base | 6 | 25 | 8.6 | 1.4 | 1.6 |
| off (control) | 5 | 23 | 9.3 | 1.3 | 1.7 |
| **wake** | **2** | 21 | 13.6 | 1.3 | 1.6 |
| idle | 6 | 21 | 11.1 | 1.3 | 1.8 |
| Qwik | 2 | 63 | 22.1 | 12.4 | 13.5 |

Mobile (4x CPU, 150 ms RTT, 1.6 Mbps):

| Variant | Main-thread JS | Interactive | First click → DOM | Next click | Counter click |
|---|---:|---:|---:|---:|---:|
| base | 25 | 384 | 41.3 | 8.6 | 21.2 |
| off (control) | 23 | 368 | 47.4 | 9.8 | 20.2 |
| **wake** | **11** | 391 | 55.1 | 10.4 | 17.7 |
| idle | 25 | 383 | 42.8 | 8.7 | 25.7 |
| Qwik | 9 | 432 | 83.0 | 29.8 | 32.8 |

An earlier 15-load run at load average 1.9 gave the same picture (mobile JS: base 23, off 23, wake
12, idle 26, Qwik 11; first click: 51.7, 49.5, 75.5, 50.4, 94.3). Within noise: interactive (it is
the inline catcher, HTML-bound), FCP, TBT (0 everywhere except a few outliers), next click, counter
click. Not within noise: wake's load JS (about -12 ms mobile, -3 ms desktop, in every run) and wake's
first click being slower by about 5 ms desktop and 8-25 ms mobile (it defines and upgrades 500 cards
inside the first event, as the micro-benchmark predicts: about 8 ms at 4x).

What `idle` does: the whole define still runs, in a background task right after load, so it is inside
the harness's window and the total is unchanged. Its value would be taking the cost out of the first
interaction (first click is back to base) and out of the load critical path (the task starts after
the module has run and paint is not blocked), but it is one 500-element task of 8-10 ms at 4x, not
less main-thread work. A page with more tags or heavier components would want it chunked per tag
(it already defines one tag per task).

## What was prototyped

Opt-in per page: `createRenderer(load, { lazyDefine: 'wake' | 'idle' })`, or per render
(`render(html, { lazyDefine })`). The server writes `ld="wake"` and `lt="tag1,tag2"` on the state
script: `lt` is the tags with no instance that hydrates on load (so the client does not scan the DOM;
that scan cost 3.4 ms at 4x on this page, the first prototype). Without the option the output is
byte-identical to today's, and the runtime added about 25 lines (`pending`, `ensureDefined`,
`deferDefine`, `defineIdle`).

On the client, `define()` holds the class back when the tag is in `lt` and the class can wait. It
takes over from the inline catcher (`hasState()`, installs the delegated capture listeners at that
moment, so no event is lost) and defines the tag when:

1. an event's path (`wakeFor`, also used for replay of events from before the runtime and for events a
   child emits) contains an element of that tag;
2. a template whose HTML contains the tag is prepared, or a node part creates or claims an element
   with the tag (`prepare`, NodePart): a parent that waits and later re-renders a list of cards
   defines the tag before it adopts them, so props the parent sets reach the upgraded element;
3. (idle) the browser is idle: `scheduler.postTask(background)`, else `requestIdleCallback`, one tag
   per task.

`customElements.define` upgrades every existing instance synchronously, including the 499 other
cards. That is the first click's extra cost.

Tests (`test/runtime-ssr.test.js`, 18 pass, 15 existing + 3 new): wake keeps the tags undefined, an
event from before the runtime is replayed by defining the tag, a property set on an undefined
element survives the upgrade (own property is captured by the constructor), `:defined` is false and
`whenDefined` stays pending until a render needs the tag, then resolves and the list renders with the
right badge values; idle defines everything and a click works; a tag with an instance that must
hydrate on load (signal) is defined at once.

## Option b: a cheaper upgrade

The profile says about 55% of the define cost is ours, so it is worth something, but only if a tag
is defined at all: after wake it only shrinks the first click, and without lazy define it cuts at
most about 6-8 ms (4x) of 23. Where it would come from:

- the constructor: three setter calls through `parseProp` for class-field defaults plus a `Map` per
  element. A compiler change could emit defaults as data (`static __d`) and the base constructor
  could copy them once into `__v` (about 2.9 ms of the 7.9 ms micro-benchmark, mobile);
- `connectedCallback`: the waiting path reads two attributes and touches a `WeakMap`, a `Map` and
  the listeners array per element. Roughly 1 ms at 4x could go.

Not prototyped: it changes the compiler output (Rust build, `defaults` in the emitted class) for
about 2-4 ms mobile on a page that is already under 25 ms, and wake makes it moot for waiting tags.

## Spec risks (deviations from the web platform)

A held-back tag's instances are plain `HTMLElement`s until a wake. Everything user code can observe
about that:

- `customElements.get(tag)` is `undefined`, and `:defined` is false for the instances. A stylesheet
  rule such as `:not(:defined) { visibility: hidden }` would keep the cards hidden until a wake
  (the server HTML is visible by default, so pages without such a rule are unaffected).
- `customElements.whenDefined(tag)` stays pending until a wake; `await whenDefined` in app code (or
  in a third-party loader) hangs on a page that never touches the card.
- `el.componentOnReady()` and the other methods (`forceUpdate`, `@Method`s) don't exist on an
  undefined element: `card.componentOnReady()` throws `TypeError` until a wake. Calling a public
  `@Method` from outside the component before wake fails. A shim (a proxy on `HTMLElement.prototype`
  for the known method names, or `ensureDefined` by a `MutationObserver`/`querySelector` patch) was
  not built; both are intrusive.
- Property sets work (own property, captured on upgrade; tested) but are invisible to getters:
  `el.count` returns the value just set only after upgrade; before it, it's a plain property, which
  is the same value. A *getter* of a computed property is just `undefined`.
- Attributes: `attributeChangedCallback` doesn't run for changes made before the upgrade, but
  upgrade replays the existing attributes, so the end state is right. A `MutationObserver` or
  `attributeChanged` sees them as plain attributes.
- Elements created by app code (`document.createElement('load-card')`, `innerHTML`, a framework
  outside the runtime) stay undefined and silent. Only the runtime's own templates and node parts
  call `ensureDefined`. To make this safe, `document.createElement`/`importNode` would have to be
  intercepted (not done) or the page must rely on the rule "a tag with no instance in the server
  HTML is defined eagerly" (that rule is what `lt` does: only tags with at least one server-rendered
  instance, all waiting, are held back; the client-created case for these tags remains the hole).
- Events: an ancestor's handler sees events from an undefined descendant as usual, and our passive
  capture listener on `document` defines the tag first. A user capture listener registered on
  `document` before ours runs before the upgrade and sees the card without its methods.
- Dev tooling: `runtime-hot.js` expects the tag to be registered after `define`; keep lazy define
  off in dev (it is opt-in, on the server renderer).

## Verdict

Build it, behind the existing opt-in, wake mode only (effort S-M, about 2-3 days to take to
production). It removes the cost the runtime.md note attributes to upgrading the cards (23 ms to 11 ms
mobile, equal to Qwik within noise) at the price of one 8 ms upgrade inside the first interaction
(mobile), which is still faster than Qwik's first click (55 ms against 83 ms) and invisible after
that. Idle mode is not worth shipping on its own: it moves the work, it does not remove it.

What is left before it can be the default or recommended:

1. The method problem: `componentOnReady` and `@Method`s on undefined elements. Either document that
   waiting-component methods need `whenDefined` of a different kind (the runtime exposes
   `customElements.whenDefined` patched to resolve on wake would not help: nothing wakes it), or
   install a prototype shim on `HTMLElement` for the components' known method names that defines the
   tag and forwards. The shim is about 20 lines and a real behaviour change.
2. Client-created instances of held-back tags (createElement/innerHTML outside the runtime).
3. `:not(:defined)` styles: document it, and make `lazyDefine` refuse (or warn) if the page's CSS
   uses the `:defined` pseudo-class (cheap check at build).
4. The compiler change from option b is only worth it for tags that do not wait.
5. Not measured: pages with many different waiting tags (each is one define at its first wake; the
   cost scales with the instance count of that tag, not with the page), real-user first-interaction
   latency with idle defines racing a click, and the starter's vitest and browser suites (only
   `test/runtime-ssr.test.js` was run).
