// Every component module, loaded lazily by `newSpecPage` (harness/spec-page.ts) the first time a
// spec mounts something: a component's children then render as real elements even when the spec
// only imports the parent, as in an app using the library. Lazy, so a spec's `vi.mock(...)` of a
// component dependency (reveal.js, …) is already in place when the components load.
(globalThis as { __uiKitComponents?: Record<string, () => Promise<unknown>> }).__uiKitComponents = import.meta.glob([
  './src/**/*.tsx',
  '!./src/**/*.spec.tsx',
  '!./src/**/*.stories.tsx',
]);

// Animation frames on the real clock. Stencil schedules renders on requestAnimationFrame;
// jsdom's own implementation runs on the global setTimeout, which a spec's
// `vi.useFakeTimers()` freezes. Captured here, before any spec runs, these keep rendering
// going without moving the fake clock (vitest.config.ts leaves rAF out of `toFake`).
const realSetTimeout = globalThis.setTimeout.bind(globalThis);
const realClearTimeout = globalThis.clearTimeout.bind(globalThis);
globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
  realSetTimeout(() => cb(performance.now()), 0) as unknown as number;
globalThis.cancelAnimationFrame = (id: number) => realClearTimeout(id as unknown as ReturnType<typeof setTimeout>);

// Compile + register every component before the file's first test, with room to spare: under
// Stencil's own compiler (COMPILER=stencil) transpiling ~136 components on demand can take over
// 10 s, which would otherwise be charged to whichever test happens to run first.
beforeAll(async () => {
  const modules = (globalThis as { __uiKitComponents?: Record<string, () => Promise<unknown>> }).__uiKitComponents ?? {};
  await Promise.all(Object.values(modules).map((load) => load()));
}, 120_000);
