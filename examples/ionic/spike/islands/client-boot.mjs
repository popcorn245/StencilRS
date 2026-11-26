// The client side of the spike: island directives on top of Stencil's per-component custom-elements build (dist-client/components/*.js).
//
//   data-island="name" data-client="load | idle | visible | static"   set by the server on the top-level elements of each island
//
// - load     the island's components are defined and its hosts connect (hydrate) at boot
// - idle     the same from requestIdleCallback
// - visible  the same when one of its top-level elements intersects the viewport (IntersectionObserver)
// - static   never: no component code is loaded for tags that only static islands use, the hosts stay the server's HTML
// A custom element is global (a tag is upgraded everywhere or nowhere), so per-island control is done in `connectedCallback`:
// a host inside an island that is not active yet is parked, and connected by hand when its island activates. Tags are loaded by
// `import()` of their module only when an active island needs them.
export const boot = async ({ base, shell, islands, onActivate }) => {
  const defined = new Set();
  const parked = new Map();
  const active = new Set(['']);
  const t0 = performance.now();
  const origDefine = customElements.define.bind(customElements);
  customElements.define = (tag, cls, opts) => {
    const cc = cls.prototype.connectedCallback;
    cls.prototype.connectedCallback = function () {
      const name = this.closest?.('[data-island]')?.dataset.island ?? '';
      if (!active.has(name)) {
        if (!parked.has(name)) parked.set(name, new Set());
        parked.get(name).add(this);
        return;
      }
      return cc?.call(this);
    };
    origDefine(tag, cls, opts);
  };

  const load = (tags) =>
    Promise.all(
      tags.filter((t) => !defined.has(t)).map((t) => {
        defined.add(t);
        return import(`${base}${t}.js`).then((m) => m.defineCustomElement());
      })
    );
  const starting = new Map();
  const activate = (island) => {
    if (active.has(island.name)) return Promise.resolve();
    if (!starting.has(island.name))
      starting.set(
        island.name,
        load(island.tags).then(() => {
          active.add(island.name);
          for (const host of parked.get(island.name) ?? []) host.connectedCallback();
          parked.delete(island.name);
          onActivate?.(island.name, performance.now() - t0);
        })
      );
    return starting.get(island.name);
  };

  const { y: initialize } = await import(`${base}runtime.js`); // Ionic's initialize(), minified name in the build
  initialize();
  await load(shell); // the shell's own components (ion-app, ion-content, ...), which are not in an island
  const eager = islands.filter((i) => i.client === 'load');
  await Promise.all(eager.map(activate));
  for (const i of islands.filter((i) => i.client === 'idle')) (window.requestIdleCallback ?? setTimeout)(() => activate(i));
  const visible = islands.filter((i) => i.client === 'visible');
  if (visible.length) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const name = e.target.dataset.island;
        io.unobserve(e.target);
        activate(visible.find((i) => i.name === name));
      }
    });
    for (const i of visible) for (const el of document.querySelectorAll(`[data-island="${i.name}"]`)) io.observe(el);
  }
  const hosts = [...document.querySelectorAll('*')].filter((e) => e.componentOnReady && active.has(e.closest('[data-island]')?.dataset.island ?? ''));
  await Promise.all(hosts.map((h) => h.componentOnReady()));
  window.__ready = performance.now() - t0;
  return { ready: window.__ready, activateAll: () => Promise.all(islands.map(activate)) };
};
