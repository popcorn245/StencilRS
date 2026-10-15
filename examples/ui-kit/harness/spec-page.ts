import { vi } from 'vitest';

/**
 * `newSpecPage` for the ui-kit specs, on real compiled components.
 *
 * The ui-kit's original helper rendered a component's vnodes by hand, with Stencil's
 * decorators mocked out. This one mounts the real custom elements produced by the compiler
 * under test (stencilrs, or Stencil's own for the baseline): `components` only need to be
 * imported, which registers them. In the customelement output the element is the component
 * instance, so `rootInstance` is `root`.
 */
export interface SpecPage<T = any> {
  root: Element & { [key: string]: any };
  rootInstance: T;
  body: HTMLElement;
  waitForChanges: () => Promise<void>;
}

export interface SpecPageOptions {
  components: (new () => any)[];
  html: string;
}

type Ready = Element & { componentOnReady?: () => Promise<unknown> };

// Captured at import, before a spec can call `vi.useFakeTimers()`: waiting must use real time.
// Under fake timers Stencil's own scheduling is frozen too, so a spec drives it with
// `vi.advanceTimersByTime` / `vi.runAllTimers`, and this helper only yields.
const realSetTimeout = globalThis.setTimeout.bind(globalThis);
const realRaf = globalThis.requestAnimationFrame?.bind(globalThis);
const timersAreFake = () => globalThis.setTimeout !== realSetTimeout;
const nextFrame = () =>
  new Promise<void>((resolve) => (timersAreFake() || !realRaf ? realSetTimeout(resolve, 16) : realRaf(() => resolve())));
const macrotask = () => new Promise<void>((resolve) => realSetTimeout(resolve));

async function allReady(container: Element) {
  const els = [container, ...container.querySelectorAll('*')] as Ready[];
  const ready = Promise.all(els.map((el) => el.componentOnReady?.()));
  if (!vi.isFakeTimers()) {
    await ready;
    return;
  }
  // Stencil schedules the first render on a (fake) frame: step frames until it lands.
  let done = false;
  void ready.then(() => (done = true));
  for (let i = 0; i < 50 && !done; i++) {
    vi.advanceTimersToNextFrame();
    await macrotask();
  }
}

/** Let Stencil's batched updates (queued to the next frame) run, twice for chained updates. */
async function settle(container: Element) {
  for (let i = 0; i < 2; i++) {
    if (vi.isFakeTimers()) vi.advanceTimersToNextFrame();
    else await nextFrame();
    await macrotask();
  }
  await allReady(container);
}

export async function newSpecPage<T = any>(opts: SpecPageOptions): Promise<SpecPage<T>> {
  document.body.innerHTML = opts.html;
  const root = document.body.firstElementChild as SpecPage['root'];
  await allReady(document.body);
  await settle(document.body);
  return {
    root,
    rootInstance: root as unknown as T,
    body: document.body,
    waitForChanges: () => settle(document.body),
  };
}
