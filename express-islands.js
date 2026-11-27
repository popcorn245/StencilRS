// Islands for stencilEngine (`islands: {}`, see express.js): a view marks parts of itself with
//
//   <stencil-island name="feed" client="visible" cache="60"> ...markup... </stencil-island>
//
// The marker has no output of its own. The view is split into a shell (the view with every island body cut out) and the islands,
// which render as separate fragments (in parallel on the worker pool, each from its own `idBase` range so their hydration ids
// cannot collide), and the pieces are put back together here: the island's roots tagged `data-island` / `data-client`, the
// component styles each island needs written once per page. Nothing in this file renders or touches Express: the engine hands in the
// render promises, and gets back an object that yields the page in chunks (`chunks()`, what a streaming responder writes as they
// arrive) or as one string (`html()`, what `res.render` sends). DSD only: see docs/islands.md.

export const CLIENT_DIRECTIVES = ['load', 'idle', 'visible', 'static', 'none'];
const ATTRIBUTES = new Set(['name', 'client', 'cache']);
const SLOT_ATTR = 'data-island-slot';
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
// Elements whose content is text, not markup: a `<stencil-island` inside them is not an island.
const RAW = new Set(['script', 'style', 'textarea', 'title']);

/** What the island layer throws for a view or a render it cannot take: `code` is `ESTENCIL_ISLAND`. */
export class IslandError extends Error {
  constructor(message) {
    super(message);
    this.name = 'IslandError';
    this.code = 'ESTENCIL_ISLAND';
  }
}

const lineOf = (html, at) => {
  let line = 1;
  for (let i = html.indexOf('\n'); i >= 0 && i < at; i = html.indexOf('\n', i + 1)) line++;
  return line;
};

const isAlpha = (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
const isNameChar = (c) => isAlpha(c) || (c >= 48 && c <= 57) || c === 45 || c === 95 || c === 58 || c === 46;

/**
 * The start and end tags of `html`, in order, skipping comments, doctypes, processing instructions and the content of
 * `script` / `style` / `textarea` / `title`. A tag is `{ close, name (lower case), start, end (past the `>`), nameEnd, selfClosing }`.
 * Quotes only count in an attribute value (after `=`), so an apostrophe in an unquoted spot does not swallow the rest.
 */
export function* tags(html, from = 0) {
  const n = html.length;
  let i = from;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) return;
    const c = html.charCodeAt(lt + 1);
    if (c === 33 && html.startsWith('<!--', lt)) {
      const e = html.indexOf('-->', lt + 4);
      i = e < 0 ? n : e + 3;
      continue;
    }
    if (c === 33 || c === 63) {
      const e = html.indexOf('>', lt + 2);
      i = e < 0 ? n : e + 1;
      continue;
    }
    const close = c === 47;
    const ns = lt + (close ? 2 : 1);
    if (!isAlpha(html.charCodeAt(ns))) {
      i = lt + 1;
      continue;
    }
    let nameEnd = ns;
    while (nameEnd < n && isNameChar(html.charCodeAt(nameEnd))) nameEnd++;
    let k = nameEnd;
    let quote = 0;
    let afterEquals = false;
    for (; k < n; k++) {
      const ch = html.charCodeAt(k);
      if (quote) {
        if (ch === quote) quote = 0;
      } else if (ch === 34 || ch === 39) {
        if (afterEquals) quote = ch;
        afterEquals = false;
      } else if (ch === 62) break;
      else if (ch === 61) afterEquals = true;
      else if (ch !== 32 && ch !== 9 && ch !== 10 && ch !== 13 && ch !== 12) afterEquals = false;
    }
    if (k >= n) return; // unterminated tag: the rest is not markup we can read
    const name = html.slice(ns, nameEnd).toLowerCase();
    yield { close, name, start: lt, end: k + 1, nameEnd, selfClosing: html.charCodeAt(k - 1) === 47 };
    i = k + 1;
    if (!close && RAW.has(name)) {
      const re = new RegExp(`</${name}(?=[\\s/>])`, 'ig');
      re.lastIndex = i;
      const m = re.exec(html);
      i = m ? m.index : n;
    }
  }
}

const ATTR_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const parseAttrs = (text) => {
  const out = new Map();
  for (const m of text.matchAll(ATTR_RE)) out.set(m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '');
  return out;
};

/**
 * The islands of a view, in document order: `{ name, client, cache, start, end, bodyStart, bodyEnd }` (`cache`: `null` (not cached),
 * `true` (a bare `cache`) or a number of seconds; nothing reads it before the island render cache). Throws an `IslandError` for what
 * cannot work: nesting, a missing or repeated name, an unknown attribute or `client`, a marker that is not closed.
 */
export const scanIslands = (html) => {
  const found = [];
  let open = null;
  const where = (at) => `line ${lineOf(html, at)}`;
  for (const t of tags(html)) {
    if (t.name !== 'stencil-island') continue;
    if (t.close) {
      if (!open) throw new IslandError(`</stencil-island> at ${where(t.start)} closes nothing`);
      open.bodyEnd = t.start;
      open.end = t.end;
      found.push(open);
      open = null;
      continue;
    }
    const attrs = parseAttrs(html.slice(t.nameEnd, t.end - 1));
    const name = attrs.get('name');
    if (open) throw new IslandError(`island ${JSON.stringify(name ?? '?')} at ${where(t.start)} is inside island ${JSON.stringify(open.name)}: islands cannot nest`);
    if (t.selfClosing) throw new IslandError(`<stencil-island> at ${where(t.start)} is self-closing: HTML ignores that, give it a body and a </stencil-island>`);
    if (!name || !/^[\w][\w.:-]*$/.test(name)) throw new IslandError(`<stencil-island> at ${where(t.start)} needs a name (letters, digits, - _ . :)`);
    for (const key of attrs.keys()) if (!ATTRIBUTES.has(key)) throw new IslandError(`island ${JSON.stringify(name)}: unknown attribute \`${key}\` (the marker has no output of its own; it takes name, client and cache)`);
    const client = attrs.get('client') ?? 'load';
    if (!CLIENT_DIRECTIVES.includes(client)) throw new IslandError(`island ${JSON.stringify(name)}: client="${client}" is not one of ${CLIENT_DIRECTIVES.join(', ')}`);
    let cache = null;
    if (attrs.has('cache')) {
      const raw = attrs.get('cache');
      if (raw === '') cache = true;
      else if (/^\d+$/.test(raw)) cache = Number(raw);
      else throw new IslandError(`island ${JSON.stringify(name)}: cache="${raw}" must be empty or a number of seconds`);
    }
    if (found.some((f) => f.name === name)) throw new IslandError(`island ${JSON.stringify(name)} at ${where(t.start)} is defined twice`);
    open = { name, client, cache, start: t.start, bodyStart: t.end };
  }
  if (open) throw new IslandError(`island ${JSON.stringify(open.name)} at ${where(open.start)} is not closed`);
  return found;
};

/**
 * Cuts a view into a shell and its islands: `{ shell, islands: [{ name, client, cache, html }] }`, or `null` when the view has none.
 * The shell is the view with each island replaced by an empty marker element that survives a render and says which island it holds.
 */
export const splitIslands = (html) => {
  const found = scanIslands(html);
  if (!found.length) return null;
  let shell = '';
  let at = 0;
  found.forEach((f, i) => {
    shell += `${html.slice(at, f.start)}<stencil-island ${SLOT_ATTR}="${i}"></stencil-island>`;
    at = f.end;
  });
  shell += html.slice(at);
  return { shell, islands: found.map((f) => ({ name: f.name, client: f.client, cache: f.cache, html: html.slice(f.bodyStart, f.bodyEnd) })) };
};

/**
 * Adds `attrs` (` data-island="a" data-client="load"`) to the start tag of every top-level element of an island's rendered html. An
 * island has no wrapper element (one would change slot assignment and `::slotted`), so its roots carry the marker. Returns the new
 * html and how many roots it tagged.
 */
export const tagRoots = (html, attrs) => {
  let depth = 0;
  let out = '';
  let last = 0;
  let count = 0;
  for (const t of tags(html)) {
    if (t.close) {
      if (depth > 0) depth--;
      continue;
    }
    if (depth === 0) {
      out += html.slice(last, t.nameEnd) + attrs;
      last = t.nameEnd;
      count++;
    }
    if (!t.selfClosing && !VOID.has(t.name)) depth++;
  }
  return { html: out + html.slice(last), roots: count };
};

/** The highest hydration id a render's html uses: host ids (`s-id`), and root-level ones (`c-id="0.N"`, `<!--o.0.N-->`, `<!--t.0.N-->`). */
export const highestId = (html) => {
  let max = 0;
  for (const m of html.matchAll(/\bs-id="(\d+)"|\bc-id="0\.(\d+)|<!--[ot]\.0\.(\d+)/g)) max = Math.max(max, Number(m[1] ?? m[2] ?? m[3]));
  return max;
};

/**
 * The markers in a rendered shell, in document order: `{ slot, start, end, attrs }`. A marker that carries a hydration annotation
 * (`c-id`, `s-sn`) sits directly inside a component that is not a shadow host and has slots: Stencil tagged it as a node to relocate
 * on the client, and replacing it with the island's html would lose that, so it is an error.
 */
export const findMarkers = (rendered, islands) => {
  const out = [];
  const list = [...tags(rendered)];
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (t.close || t.name !== 'stencil-island') continue;
    const attrs = rendered.slice(t.nameEnd, t.end - 1);
    const slot = /data-island-slot="(\d+)"/.exec(attrs)?.[1];
    if (slot === undefined) continue;
    const next = list[i + 1];
    if (!next || !next.close || next.name !== 'stencil-island' || rendered.slice(t.end, next.start).trim()) continue;
    out.push({ slot: Number(slot), start: t.start, end: next.end, attrs });
  }
  const name = (slot) => JSON.stringify(islands[slot].name);
  for (let slot = 0; slot < islands.length; slot++) {
    if (!out.some((m) => m.slot === slot)) throw new IslandError(`island ${name(slot)}: its marker is not in the rendered shell (the HTML parser moved or dropped it: islands cannot sit in <head>, <table>, <select> and the like)`);
  }
  for (const m of out) {
    if (/\s(?:c-id|s-sn)\b/.test(m.attrs)) {
      throw new IslandError(`island ${name(m.slot)} sits directly inside a component that is not a shadow host and has slots (Stencil marked it for relocation, and an island's html carries no such mark): wrap it in a plain element, or make the whole component the island`);
    }
  }
  return out;
};

const styleTag = (s) => `<style${s.id ? ` sty-id="${String(s.id).replace(/"/g, '&quot;')}"` : ''}>${s.content}</style>`;

/** Writes each style once per page: `fresh(styles)` is the tags of the ones not seen yet. */
export const createDeduper = (seed = []) => {
  const seen = new Set(seed.map((s) => s.id ?? s.content));
  return (styles) => {
    let out = '';
    for (const s of styles ?? []) {
      if (!s.content) continue;
      const key = s.id ?? s.content;
      if (seen.has(key)) continue;
      seen.add(key);
      out += styleTag(s);
    }
    return out;
  };
};

/** The `<html>` tag, the `<body>` tag's end and the `</head>` of a document's markup, or null where there is no such tag. */
const documentLandmarks = (html) => {
  const found = {};
  for (const t of tags(html)) {
    if (t.name === 'html' && !t.close) found.html ??= t;
    else if (t.name === 'head' && t.close) found.headEnd ??= t;
    else if (t.name === 'body' && !t.close) {
      found.body = t;
      break;
    }
  }
  return found;
};

/**
 * The start of an early response from the view's own markup: the `<html>` tag is the view's (its attributes) as the probe render
 * wrote it (Stencil adds `class="hydrated"`, `data-stencil-build`, ... which are the same for any page), the head and the opening
 * `<body>` tag are the view's, verbatim. `null` when the view has no `<html>` and `<body>` of its own.
 */
export const earlyHeadParts = (template) => {
  const { html, body } = documentLandmarks(template);
  if (!html || !body || body.start < html.end) return null;
  return { htmlTag: template.slice(html.start, html.end), rest: template.slice(html.end, body.end) };
};

/** `<!doctype ...><html ...>` of a probe render's output. */
export const probedHtmlTag = (rendered) => {
  const { html } = documentLandmarks(rendered);
  if (!html) throw new IslandError('the probe render of the <html> tag has no <html> tag');
  return rendered.slice(0, html.end);
};

/**
 * One page of islands. The engine has already started every render; this checks the results as they come and assembles them.
 *
 * @param split `splitIslands`' result
 * @param shell the shell's render, `{ html, styles, hydratedCount, ... }`
 * @param parts one render per island, the same shape (`null` for an island whose body is only whitespace)
 * @param view the view's name, for the messages
 * @param stride the hydration ids an island may use; the shell and island `i` count from `0` and `(i + 1) * stride`
 * @param document whether the view is a document: only then there is a `<head>` and styles are written (a fragment has neither, as for any fragment render)
 * @param earlyHead a promise of the start of the response (`probedHtmlTag` + `earlyHeadParts().rest`), or null: written before anything renders, and the shell's styles go to the top of `<body>`
 * @param inspect `(label, result)`: the engine's diagnostics check for a render (it throws on an error)
 */
export const createIslandPage = ({ split, view, shell, parts, stride, document, earlyHead = null, inspect }) => {
  for (const p of [shell, ...parts, earlyHead]) p?.catch?.(() => {}); // a render nobody awaited because another failed first must not be an unhandled rejection
  const check = (label, result, base) => {
    inspect(label, result);
    if (result.hydratedCount > stride || highestId(result.html) > base + stride) {
      throw new IslandError(`${view}: ${label} used more hydration ids than its idStride of ${stride} (${result.hydratedCount} components): its ids would collide with the next island's. Raise \`islands.idStride\``);
    }
  };

  let cut; // the shell's html cut at the markers, once it has rendered
  const cutShell = () =>
    (cut ??= shell.then((result) => {
      check('the page shell', result, 0);
      let html = result.html;
      if (earlyHead) {
        const { body } = documentLandmarks(html);
        if (!body) throw new IslandError(`${view}: the rendered shell has no <body>`);
        html = html.slice(body.end);
      }
      let markers;
      try {
        markers = findMarkers(html, split.islands);
      } catch (e) {
        if (e instanceof IslandError) e.message = `${view}: ${e.message}`;
        throw e;
      }
      const segments = [];
      let at = 0;
      for (const m of markers) {
        segments.push(html.slice(at, m.start));
        at = m.end;
      }
      segments.push(html.slice(at));
      return { result, order: markers.map((m) => m.slot), segments };
    }));

  const resolved = new Map();
  const part = (slot) => {
    if (!resolved.has(slot)) {
      resolved.set(
        slot,
        (async () => {
          const isl = split.islands[slot];
          const result = parts[slot] ? await parts[slot] : { html: '', styles: [], components: [], hydratedCount: 0 };
          check(`island ${JSON.stringify(isl.name)}`, result, (slot + 1) * stride);
          const tagged = tagRoots(result.html, ` data-island="${isl.name}" data-client="${isl.client}"`);
          if (!tagged.roots && result.html.trim()) {
            throw new IslandError(`${view}: island ${JSON.stringify(isl.name)} has no element at its top level (only text or comments): there is nothing to carry data-island, wrap it in an element`);
          }
          return { html: tagged.html, styles: result.styles ?? [], components: result.components ?? [], hydratedCount: result.hydratedCount };
        })()
      );
      resolved.get(slot).catch(() => {});
    }
    return resolved.get(slot);
  };

  const page = {
    /** `[{ name, client, cache }]` in the view's order, known before anything renders. */
    islands: split.islands.map(({ name, client, cache }) => ({ name, client, cache })),
    /** Whether `chunks()` starts with the head written before the shell has rendered. */
    early: Boolean(earlyHead),

    /**
     * The page as it can be written to a socket: the early head (if any) at once, then each piece the moment it is next in line,
     * `[styles] island html + the shell up to the next island`. Styles are written in the body here (the head has gone, or the shell's
     * is already out); `html()` puts them in `<head>` instead. A rejected render throws out of the iteration.
     */
    async *chunks() {
      if (earlyHead) yield await earlyHead;
      const { result, order, segments } = await cutShell();
      const fresh = createDeduper(earlyHead ? [] : result.styles);
      yield (earlyHead && document ? fresh(result.styles) : '') + segments[0];
      for (let k = 0; k < order.length; k++) {
        const isl = await part(order[k]);
        yield (document ? fresh(isl.styles) : '') + isl.html + segments[k + 1];
      }
    },

    /** The whole page as one string. A document without an early head gets the islands' new styles in its `<head>`, after the shell's own. */
    async html() {
      const inline = async () => {
        let out = '';
        for await (const c of page.chunks()) out += c;
        return out;
      };
      if (earlyHead || !document) return inline();
      const { result, order, segments } = await cutShell();
      const headEnd = documentLandmarks(segments[0]).headEnd;
      if (!headEnd) return inline(); // no </head> before the first island: nowhere to hoist to
      const isls = await Promise.all(order.map(part));
      const fresh = createDeduper(result.styles);
      const styles = isls.map((i) => fresh(i.styles)).join('');
      return segments[0].slice(0, headEnd.start) + styles + segments[0].slice(headEnd.start) + isls.map((isl, k) => isl.html + segments[k + 1]).join('');
    },

    /** What a streaming responder (express-stream.js) assembles its own chunks from: the early head, the cut shell, an island's render. */
    pieces: { head: earlyHead, cut: cutShell, part, document },

    /** Per island, once rendered: what the client side will want (`components` for a per-island manifest). Settles when every island has. */
    async manifest() {
      const { order } = await cutShell();
      return Promise.all(order.map(async (slot) => ({ ...page.islands[slot], components: (await part(slot)).components })));
    },
  };
  return page;
};
