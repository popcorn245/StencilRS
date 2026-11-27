// The server's half of the islands client (islands-client.js, docs/islands.md): from the tags each part of a page used (`page.clientManifest()`)
// and the `components.json` of a `hydrateClient` build (tag -> module, module -> the chunks it imports), the markup that starts the client.

const ATTR = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
/** JSON for a `<script type="application/json">`: `<`, `>` and `&` escaped, so nothing in it can close the element or open a comment. */
const json = (value) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

/** `islands.client` as `{ base, init, script, preload, margin, components }`; throws for what cannot work. */
export const normalizeClient = (client, readJson) => {
  if (client === true) client = {};
  if (!client || typeof client !== 'object') throw new TypeError('stencilEngine: `islands.client` must be true or { base, manifest, init, script, preload, margin }');
  const { base = '/', manifest, init = [], script, preload = true, margin, ...rest } = client;
  const unknown = Object.keys(rest);
  if (unknown.length) throw new TypeError(`stencilEngine: unknown \`islands.client\` option ${unknown.map((k) => `\`${k}\``).join(', ')} (expected base, manifest, init, script, preload, margin)`);
  if (typeof base !== 'string' || !Array.isArray(init) || init.some((f) => typeof f !== 'string')) throw new TypeError('stencilEngine: `islands.client.base` must be a string and `init` an array of module paths');
  const components = typeof manifest === 'string' ? readJson(manifest) : manifest;
  if (!components || typeof components.tags !== 'object') throw new TypeError('stencilEngine: `islands.client.manifest` must be the components.json of a hydrateClient build (a path or its parsed object)');
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return { base: prefix, init, script: script === undefined ? `${prefix}islands.js` : script, preload: !!preload, margin, components };
};

/**
 * The boot configuration of one page: the module files of the shell and of each island (the manifest's module of every tag it used), and the
 * tags the client build has no module for (`missing`: a component the build does not know cannot be hydrated). A `static` or `none` island lists no
 * files: nothing of it is loaded.
 */
export const bootConfig = ({ shell, islands }, { base, init, margin, components }) => {
  const missing = new Set();
  const filesOf = (tags) => {
    const files = new Set();
    for (const t of tags) {
      const f = components.tags[t];
      if (f) files.add(f);
      else missing.add(t);
    }
    return [...files];
  };
  const config = {
    base,
    ...(init.length ? { init } : {}),
    shell: filesOf(shell),
    islands: islands.map(({ name, client, tags }) => ({ name, client, files: client === 'static' || client === 'none' ? [] : filesOf(tags) })),
    ...(margin ? { margin } : {}),
  };
  if (missing.size) config.missing = [...missing].sort();
  return config;
};

/** A module and the chunks it imports (`components.json`'s `imports`), for `modulepreload`. */
const closure = (components, files) => {
  const out = new Set();
  for (const f of files) {
    out.add(f);
    for (const i of components.imports?.[f] ?? []) out.add(i);
  }
  return out;
};

/** The markup that starts the client for a page: preloads of what boot loads at once (init, the shell, `load` islands), the manifest as JSON, the boot script. */
export const bootTag = (config, { script, preload, components }) => {
  let out = '';
  if (preload) {
    const eager = [...(config.init ?? []), ...config.shell, ...config.islands.filter((i) => i.client === 'load').flatMap((i) => i.files)];
    for (const f of closure(components, eager)) out += `<link rel="modulepreload" href="${ATTR(config.base + f)}">`;
  }
  out += `<script type="application/json" id="stencil-islands">${json(config)}</script>`;
  if (script) out += `<script type="module" src="${ATTR(script)}"></script>`;
  return out;
};

/** `html` with `tag` before its last `</body>` (at the end when there is none). */
export const insertBeforeBodyEnd = (html, tag) => {
  const at = html.toLowerCase().lastIndexOf('</body');
  return at < 0 ? html + tag : html.slice(0, at) + tag + html.slice(at);
};
