# Spike: Rust TypeScript checkers (tsc-rs, tsrs) beside tsgo and tsc (#117)

**Verdict: both Rust checkers are compatible with TypeScript 7.1 semantics, with one TS 6.0 to 7.1 `lib.dom`
difference on Ionic. They are added as opt-in `typecheck.bin: 'tsrs' | 'tsc-rs'`; the default stays tsgo, then tsc.**
Both run, are 4x to 20x faster than tsgo, and report the same errors as tsc and tsgo on `examples/ui-kit`. On
`examples/ionic/migrated` both report one error on a clean tree that tsc 6.0.3 and tsgo do not. It is not a Rust
bug: it is TypeScript 7.1's `lib.dom.d.ts`, and official `typescript@7.1.0-beta` prints it too, so the checkers are
faithful to 7.1. A Stencil v5 project (TypeScript 6.0.3) that opts in can therefore see new errors, which is why they
are never picked automatically. Both are pre-1.0.

**Integration:** `resolveChecker` in `vite-typecheck.js` resolves `tsrs` and `tsc-rs` like tsgo (package plus
`lib/getExePath.js`, executable spawned directly without a shell, killed on stop; package `bin` script under node as
the fallback), with the clear `npm i -D <package>` error when the package is missing. Exit 0 passes, any other code
fails (tsrs and tsc-rs exit 2, tsgo 1).

| Tool | Version, how installed | Ionic migrated (clean) | ui-kit (clean) | Injected TS2322, TS6133, TS2339 | Verdict |
|---|---|---|---|---|---|
| tsc-rs ([pingdotgg/ts-rust](https://github.com/pingdotgg/ts-rust)) | npm `tsc-rs@0.8.0` (README: `npm install -D tsc-rs`), binary `@tsc-rs/linux-x64`; `Version 7.1.0-dev`; pinned to microsoft/TypeScript `3e9236361fa9` (7.1.0-beta) | 1 extra error (TS2322, see below) | identical to tsc, byte for byte | identical to tsc, plus the same extra error | compatible with TS 7.1 semantics; one TS 6 to 7.1 lib difference on Ionic; opt-in `bin: 'tsc-rs'` |
| tsrs ([oxc-project/tsrs](https://github.com/oxc-project/tsrs)) | npm `tsrs@7.1.0-beta.tsrs4` (README: `pnpm add -D tsrs`), binary `@tsrs/linux-x64-gnu`; same pin `3e9236361fa9` | same 1 extra error | identical to tsc, byte for byte | identical to tsc, plus the same extra error | compatible with TS 7.1 semantics; same lib difference; opt-in `bin: 'tsrs'` |
| tsgo | `@typescript/native-preview@7.0.0-dev.20260707.2` | identical to tsc | identical to tsc | identical to tsc | compatible (already supported) |

Both READMEs were taken as data. The installs worked as documented, so no `cargo build` was needed (the issue
reported tsc-rs 0.1.0 and a 2026-11-12 tsrs release; the npm registry had 0.8.0 and `7.1.0-beta.tsrs4`).

## The one difference

On a clean `examples/ionic/migrated` (after `stencil build` wrote `src/components.d.ts`), `tsc` 6.0.3 and `tsgo` print
nothing and exit 0. `tsc-rs` and `tsrs` print the same single error and exit 2:

```
src/utils/browser/index.ts(103,14): error TS2322: Type '(Window & typeof globalThis) | undefined' is not assignable to type 'IonicWindow | undefined'.
  Type 'Window & typeof globalThis' is not assignable to type 'IonicWindow | undefined'.
    Type 'Window & typeof globalThis' is not assignable to type 'IonicWindow'.
      Type 'Window & typeof globalThis' is not assignable to type 'ExperimentalWindowFeatures'.
        Types of property 'CloseWatcher' are incompatible.
          Type '{ new (options?: CloseWatcherOptions | undefined): CloseWatcher; prototype: CloseWatcher; }' is missing the following properties from type 'CloseWatcher': requestClose, close, destroy, oncancel, and 4 more.
```

Ionic declares its own `CloseWatcher` shape; the TypeScript 7.1 beta `lib.dom.d.ts` declares a fuller one. Official
`typescript@7.1.0-beta` (`tsc`) prints the same error, so this is upstream behaviour of the pinned revision, not a
port bug. Any project that hits a 7.1 lib change, or a 6.0 to 7.x option removal, would behave the same. Nothing in
the tsconfig (`--skipLibCheck` was on) avoids it. The Rust checkers have no flag to pick the 6.0.3 lib.

Other findings: no crashes, no unsupported tsconfig options (`paths`, `jsx: react` with `jsxFactory`,
`experimentalDecorators`, `moduleResolution: bundler`, `extends` all fine), no JSX or decorator problems, same 362
files in the program as tsgo.

## Diagnostics parity

Command for all tools: `--noEmit --skipLibCheck -p tsconfig.json --pretty false` (what `typecheck` runs).

- **ui-kit, clean tree:** 126 `TS2307` errors (`@storybook/*` is not installed in this container); tsc 6.0.3, tsgo,
  tsc-rs, tsrs, and `typescript@7.1.0-beta` printed byte-identical output.
- **Ionic, clean tree:** see above.
- **Ionic, injected into `chip.tsx`** (a `const n: number = 'not a number'`, an unused `const unusedLocal = 1`, and
  `console.log(this.nope)`): all four tools report the same four diagnostics, in the same order and text
  (`TS2322` at 39,11; `TS6133` for `n` and for `unusedLocal`; `TS2339` at 41,22). tsgo's output is byte-identical to
  tsc's; the Rust checkers add only the `CloseWatcher` error. The change was made in a scratch copy and reverted.
- Exit codes: tsc and both Rust checkers exit 2 on errors, tsgo exits 1. `vite-typecheck.js` only tests for 0.

## Timing

4-core shared container, Node 22, load average 2.6 to 5.3 during the runs (other agents were building), so absolute
numbers are noisy. 7 runs per tool, interleaved (one run of every tool, then the next round); median, range, peak RSS
(`ru_maxrss` of the checker process, native executable spawned directly, no Node wrapper) and CPU seconds
(user+sys). tsc is `typescript@6.0.3` from the example. `--fast` is the Rust checkers' multi-checker preset.

Ionic migrated (362 files):

| Tool | Median wall | Range | Peak RSS | CPU |
|---|---:|---|---:|---:|
| tsc 6.0.3 | 5.86 s | 4.28 to 6.31 | 330 MB | 8.9 s |
| tsgo | 1.43 s | 0.76 to 1.50 | 351 MB | 2.6 s |
| tsc-rs | 0.39 s | 0.21 to 0.58 | 178 MB | 0.7 s |
| tsc-rs `--fast` | 0.33 s | 0.19 to 0.45 | 179 MB | 0.6 s |
| tsrs | 0.26 s | 0.14 to 0.31 | 103 MB | 0.4 s |
| tsrs `--fast` | 0.24 s | 0.13 to 0.29 | 100 MB | 0.4 s |

ui-kit:

| Tool | Median wall | Range | Peak RSS | CPU |
|---|---:|---|---:|---:|
| tsc 6.0.3 | 5.80 s | 5.52 to 7.28 | 391 MB | 10.8 s |
| tsgo | 1.05 s | 0.91 to 1.30 | 317 MB | 2.8 s |
| tsc-rs | 0.35 s | 0.30 to 0.44 | 208 MB | 0.8 s |
| tsc-rs `--fast` | 0.30 s | 0.29 to 0.43 | 209 MB | 0.7 s |
| tsrs | 0.20 s | 0.18 to 0.28 | 118 MB | 0.5 s |
| tsrs `--fast` | 0.20 s | 0.19 to 0.26 | 117 MB | 0.5 s |

An unloaded single run on Ionic: tsc 4.4 s, tsgo 0.74 s, tsc-rs 0.23 s, tsrs 0.18 s. The Rust checkers' own
`--extendedDiagnostics` show them checking the same file set (check time 0.15 s tsc-rs, 0.09 s tsrs, 0.39 s tsgo), so
the speed is real, not a skipped check. Both are about half of tsgo's memory.

## Notes on the opt-in

- Stencil v5 pins TypeScript 6.0.3, whose `lib.d.ts` differs; a clean Ionic build with `bin: 'tsrs'` or `'tsc-rs'`
  fails on the `CloseWatcher` error above until the project's own type is adjusted or it moves to TypeScript 7.1.
- Both projects are early releases (tsc-rs calls itself one; tsrs versions are prereleases), so the auto order is
  unchanged.

## Reproducing

```sh
mkdir tools && cd tools && npm init -y && npm i --no-save --ignore-scripts tsc-rs tsrs @typescript/native-preview
# run each platform executable (see lib/getExePath.js in each package) with
#   --noEmit --skipLibCheck -p tsconfig.json --pretty false
# in examples/ionic/migrated (after `npm run build:stencil`, which writes src/components.d.ts) and examples/ui-kit
```
