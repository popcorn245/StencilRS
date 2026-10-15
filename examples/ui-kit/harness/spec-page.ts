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
// (requestAnimationFrame is left real under fake timers; see vitest.config.ts.)
const realSetTimeout = globalThis.setTimeout.bind(globalThis);
const realRaf = globalThis.requestAnimationFrame?.bind(globalThis);
const nextFrame = () => new Promise<void>((resolve) => (realRaf ? realRaf(() => resolve()) : realSetTimeout(resolve, 16)));
const macrotask = () => new Promise<void>((resolve) => realSetTimeout(resolve));

async function allReady(container: Element) {
  const els = [container, ...container.querySelectorAll('*')] as Ready[];
  // requestAnimationFrame stays real under fake timers (vitest.config.ts), so this resolves
  // without moving a spec's fake clock.
  await Promise.all(els.map((el) => el.componentOnReady?.()));
}

/** Let Stencil's batched updates (queued to the next frame) run, twice for chained updates. */
async function settle(container: Element) {
  for (let i = 0; i < 2; i++) {
    await nextFrame();
    await macrotask();
  }
  await allReady(container);
}

let componentsLoaded: Promise<unknown> | undefined;

/** Register every component once per spec file (see vitest.setup.ts). */
function loadAllComponents(): Promise<unknown> {
  const modules = (globalThis as { __uiKitComponents?: Record<string, () => Promise<unknown>> }).__uiKitComponents ?? {};
  componentsLoaded ??= Promise.all(Object.values(modules).map((load) => load()));
  return componentsLoaded;
}

export async function newSpecPage<T = any>(opts: SpecPageOptions): Promise<SpecPage<T>> {
  await loadAllComponents();
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

/**
 * Set props as properties and re-render. Stencil v5 no longer reads the attribute string
 * `"false"` as `false` for boolean props (`show-header="false"` is now true, as in HTML), so
 * specs turn such props off here instead.
 */
export async function setProps(page: SpecPage, props: Record<string, unknown>): Promise<void> {
  Object.assign(page.root, props);
  await page.waitForChanges();
}

const nativeTextContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')!.get!;

/**
 * Everything the element renders, as text. Stencil v5 patches `textContent` on a scoped
 * component that has slots to return only its slotted (light DOM) content, as a shadow root
 * would; this reads the DOM the component actually rendered.
 */
export const textOf = (el: Node | null | undefined): string => (el ? (nativeTextContent.call(el) as string) : '');
