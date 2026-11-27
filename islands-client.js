// The client side of islands (docs/islands.md): `client="load | idle | visible | static | none"` on `<stencil-island>`.
//
// The page carries `<script type="application/json" id="stencil-islands">` (the engine writes it, `islands.client`) and this module as a script:
//
//   { "base": "/client/", "init": ["init.js"], "shell": ["components/ion-app.js"],
//     "islands": [{ "name": "feed", "client": "visible", "files": ["components/ion-item.js", ...] }] }
//
// An island's top-level elements carry `data-island="name"`. The component modules are the per-tag modules of a `hydrateClient` build, and a module
// defines its tag when it is evaluated. A custom element is global (a tag is upgraded everywhere or not at all), so the directive is per instance: a
// guarded patch of each class's `connectedCallback` parks a host whose island has not been activated, and connects it by hand when it is.
//
//   load     at boot, with the shell, in one pass
//   idle     when the browser is idle (requestIdleCallback)
//   visible  when an element of the island intersects the viewport
//   static   never: the island's html stays as the server wrote it, and a tag no active island or shell uses is never loaded
//   none     as static, and not listed in `window.stencilIslands`
//
// A parent that sets props on its children in `componentWillLoad` (`ion-tabs` on `ion-tab`) loses them on a child that is not defined yet, so the
// modules of one activation are imported with `customElements.define` held back, and every tag is defined in one synchronous pass afterwards.
// Events (bubbling, from the island's first element, or `document`): `stencil-island-ready` `{ name, client, ms }` when its hosts are ready,
// `stencil-island-error` `{ name, error }` when its modules do not load (the island stays server html), `stencil-islands-ready` when the shell and
// every `load` island are.

export const boot = (config) => {
  const { base = '/', init = [], shell = [], islands = [], margin = '0px' } = config;
  const t0 = performance.now();
  const parked = new Map(); // island -> the hosts waiting for it, or false for an island that never activates
  const done = new Map(); // island -> promise
  const state = {};
  const byName = {};
  let queue = Promise.resolve();
  const wait = islands.filter((i) => i.client !== 'static' && i.client !== 'none');
  for (const i of islands) (byName[i.name] = i, parked.set(i.name, wait.includes(i) && new Set()));

  // The island a host is in: its closest `[data-island]`, looking through the shadow roots it sits in. Unknown islands do not gate.
  const islandOf = (el) => {
    for (;;) {
      const root = el.closest?.('[data-island]');
      if (root) return root.dataset.island;
      el = el.getRootNode?.().host;
      if (!el) return '';
    }
  };
  const define = customElements.define.bind(customElements);
  const gated = (tag, cls, opts) => {
    const connect = cls.prototype.connectedCallback;
    if (typeof connect === 'function') {
      cls.prototype.connectedCallback = function () {
        const set = parked.get(islandOf(this));
        if (set === undefined) return connect.call(this);
        if (set) set.add(this);
      };
    } else console.warn(`[stencilrs] <${tag}> has no connectedCallback to gate: its static and deferred islands hydrate with it`);
    define(tag, cls, opts);
  };
  customElements.define = gated;

  // The modules of one activation: imported with `define` held back (so nothing upgrades half-loaded), then all defined in one go.
  const load = (files) => {
    const run = queue.then(async () => {
      const held = [];
      customElements.define = (...args) => void held.push(args);
      try {
        await Promise.all(files.map((f) => import(base + f)));
      } finally {
        customElements.define = gated;
      }
      for (const args of held) customElements.get(args[0]) || gated(...args);
    });
    queue = run.catch(() => {});
    return run;
  };

  const emit = (target, type, detail) => target.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
  const roots = (name) => document.querySelectorAll(`[data-island="${name}"]`);
  const finish = async (isl) => {
    const set = parked.get(isl.name);
    parked.delete(isl.name); // from here on its hosts connect as they come
    for (const host of [...set].sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1))) if (host.isConnected) host.connectedCallback();
    const els = [...roots(isl.name)].flatMap((r) => [r, ...r.querySelectorAll('*')]);
    await Promise.all(els.filter((e) => e.componentOnReady).map((e) => e.componentOnReady()));
    const ms = performance.now() - t0;
    state[isl.name] = 'ready';
    emit(roots(isl.name)[0] ?? document, 'stencil-island-ready', { name: isl.name, client: isl.client, ms });
  };
  const fail = (isl, error) => {
    state[isl.name] = 'error';
    emit(roots(isl.name)[0] ?? document, 'stencil-island-error', { name: isl.name, error });
  };
  const activate = (name) => {
    const isl = byName[name];
    if (!isl || !parked.get(name)) return done.get(name) ?? Promise.resolve();
    if (!done.has(name)) {
      state[name] = 'loading';
      done.set(name, load(isl.files).then(() => finish(isl), (e) => fail(isl, e)));
    }
    return done.get(name);
  };

  for (const i of islands) if (i.client !== 'none') state[i.name] = i.client === 'static' ? 'static' : 'pending';
  const eager = wait.filter((i) => i.client === 'load');
  const ready = load([...init, ...shell, ...eager.flatMap((i) => i.files)]).then(
    async () => {
      await Promise.all(eager.map((i) => (state[i.name] = 'loading', done.set(i.name, finish(i)).get(i.name))));
      await Promise.all(shell.length ? [...document.querySelectorAll('*')].filter((e) => e.componentOnReady && !e.closest('[data-island]')).map((e) => e.componentOnReady()) : []);
      emit(document, 'stencil-islands-ready', { ms: performance.now() - t0 });
    },
    (error) => emit(document, 'stencil-island-error', { name: null, error })
  );
  for (const i of wait.filter((i) => i.client === 'idle')) (window.requestIdleCallback ?? setTimeout)(() => activate(i.name));
  const visible = wait.filter((i) => i.client === 'visible');
  if (visible.length) {
    const io = window.IntersectionObserver && new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) (io.unobserve(e.target), activate(e.target.dataset.island));
    }, { rootMargin: margin });
    for (const i of visible) {
      const els = roots(i.name);
      if (io && els.length) els.forEach((el) => io.observe(el));
      else activate(i.name);
    }
  }
  return (window.stencilIslands = { ready, state, activate, ms: () => performance.now() - t0 });
};

const el = typeof document !== 'undefined' && document.getElementById('stencil-islands');
if (el) boot(JSON.parse(el.textContent));
