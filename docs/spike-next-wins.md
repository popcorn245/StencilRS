# Next speed and JS wins: six spikes, ranked (2026-11-27)

Goal: fastest framework, least JS shipped, closest to browser spec. Six spikes on `next` (after #210, #211), each with its own
write-up. All prototypes are opt-in; default output is unchanged (the stencilrs runtime grows 25 B gzip from the gating refactor; later removed, see spike-runtime-size.md).
Measured on a shared 4-vCPU container with spikes running side by side: byte counts are exact, timings are interleaved medians
and the ratios held across repeats, absolute times moved up to 50%.

## Ranked

| # | Win | Measured | Who gains | Effort | Spec risk | Verdict | Write-up |
|---:|---|---|---|---|---|---|---|
| 1 | **Fold Stencil's `BUILD` flags at build time** (`foldRuntimeFlags`) | runtime chunk 28.1 → 13.2 KB gz on Ionic tabs (-53%); starter 27.8 → 12.0 KB gz (-57%), 9.6 KB with `hydrateClientSide: false` (`stencil build`: 10.3) | every default-runtime user, Ionic included | S now, M to harden | none | **shipped, on by default** (docs/vite-plugin.md) | [spike-build-flags.md](spike-build-flags.md) |
| 2 | **String SSR renderer for the stencilrs runtime** (no happy-dom) | 500-card page 115 → 3.0 ms/render (~38×), byte-identical HTML, resumes in Chromium. Lit 4.8, Astro 1.7, Qwik 9.8, Solid 0.44 | stencilrs-runtime SSR | M-L (light-DOM slots are the hard part); falls back to happy-dom | none | build, opt-in with fallback | [spike-ssr-string.md](spike-ssr-string.md) |
| 3 | **Gate stencilrs runtime features** (`runtimeFeatures: 'auto'`) | tiny app 8.8 → 4.5 KB gz; smaller than Solid 5.0, Preact 6.7, Lit 7.1, Svelte 13.3, Qwik 24.8, Stencil 26.2 | stencilrs-runtime users | shipped: `auto` default, from compiler metadata | none | build | [spike-runtime-size.md](spike-runtime-size.md) |
| 4 | **Lazy `customElements.define` for components that wait** (`lazyDefine: 'wake'`) | mobile load JS 25 → 11 ms (Qwik 9); first click +8-25 ms mobile | resumed pages | S-M | real: `:defined`, `whenDefined`, `componentOnReady` before wake | build behind opt-in, after a `componentOnReady` shim; also do the cheaper constructor (2-4 ms, no spec risk) | [spike-lazy-define.md](spike-lazy-define.md) |
| 5 | **Shared stylesheets for DSD** (`shadowStyleLinks: { minUses: 3 }`) | Ionic list-50 HTML 1,014 → 107 KB raw, 21.1 → 7.9 KB gz; parse/recalc within noise; many one-off sheets cost requests | DSD pages with repeated components | S opt-in, M in the serializer | Firefox/WebKit may flash unstyled (only head links block render) | build opt-in with threshold | [spike-dsd-styles.md](spike-dsd-styles.md) |
| 6 | **Sass** | disk cache already exists and works (-1.5 s on a warm fresh process, invalidation byte-exact). grass (Rust) 2.4-2.8× faster but 21 of 182 Ionic sheets wrong (colour rounding, lost RTL `@supports`). Importer cache: noise | build | S follow-ups (root-relative cache key for CI) | grass: high | keep cache, document it; drop grass and the importer | [spike-sass.md](spike-sass.md) |

## Recommendation

Build 1, 3 and 2, in that order. 1 is the largest saving for the most users at the least risk, and it closes the gap
to `stencil build` that the Vite path opened. 3 makes the stencilrs runtime the smallest of those measured for a small app. 2
removes about 90% of SSR time (happy-dom DOM work and GC) and puts stencilrs between Lit and Astro on render speed while keeping
resumability, which neither has. 4 and 5 are smaller and carry browser-behaviour caveats: ship them opt-in. Leave Sass alone
beyond the cache key.

## Still open

- HTML weight: stencilrs resumable HTML is 3.5-4.7× larger gzipped than Lit, Solid and Astro (hydration marks and state). Not
  spiked; the next candidate after these.
- No Firefox or WebKit timings anywhere; Chromium only.
