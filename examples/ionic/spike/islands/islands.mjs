// The islands prototype: render a shell with island markers as a document, the islands as fragments, splice them together;
// plus the Chromium hydration report used by the checks. Prototype code, not library code.
import { CLIENT_DIR } from './lib.mjs';

export const markerRe = (name) => new RegExp(`<stencil-island[^>]*\\bname="${name}"[^>]*>\\s*</stencil-island>`);

/** The shell: the page template with the island markers left in place (unknown elements pass through), rendered as a document. */
export const renderShell = async (hydrate, page, opts) => (await hydrate.renderToString(page.template, { ...opts, fullDocument: true })).html;

/** One island: its markup alone, rendered as a fragment. Returns the html, or { html, result } with `withResult`. */
export const renderIsland = async (hydrate, page, name, opts, withResult = false) => {
  const result = await hydrate.renderToString(page.islands[name], { ...opts, fullDocument: false });
  return withResult ? { html: result.html, result } : result.html;
};

export const splice = (shell, parts) => {
  let out = shell;
  for (const [name, html] of Object.entries(parts)) {
    const re = markerRe(name);
    if (!re.test(out)) throw new Error(`island marker ${name} not found in the rendered shell`);
    out = out.replace(re, () => html);
  }
  return out;
};

/** Host ids on a page: every `s-id` (and the `<!--r.N-->` it pairs with), and which ones occur more than once. */
export const idsOf = (html) => {
  const hosts = [...html.matchAll(/\bs-id="(\d+)"/g)].map((m) => m[1]);
  const seen = new Set();
  const dup = new Set();
  for (const id of hosts) (seen.has(id) ? dup : seen).add(id);
  return { hosts: hosts.length, duplicateHosts: dup.size };
};

// --- in the page (Playwright serializes these) -----------------------------------------------------------------------------

function markServerNodes(doc) {
  const nodes = [];
  const visit = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.localName === 'script' || el.localName === 'style') continue;
      nodes.push(el);
      if (el.shadowRoot) visit(el.shadowRoot);
    }
  };
  visit(doc.body);
  doc.defaultView.__serverNodes = nodes;
  return nodes.length;
}

function snapshot(doc, ctx) {
  const nodes = doc.defaultView.__serverNodes;
  const comments = (root) => {
    let n = 0;
    const walker = doc.createTreeWalker(root, 128);
    while (walker.nextNode()) if (/^[rostc]\.\d/.test(walker.currentNode.nodeValue)) n++;
    return n;
  };
  const norm = (s) => s.replace(/(ion-[a-z]+-)\d+/g, '$1N');
  const sig = (node) => {
    if (node.nodeType === 3) return node.nodeValue.trim() ? JSON.stringify(node.nodeValue.trim().replace(/<!--[a-z]\.[\d.]+-->/g, '<!--ID-->')) : '';
    if (node.nodeType !== 1) return '';
    if (node.localName === 'style' || node.localName === 'script') return '';
    const attrs = [...node.attributes]
      .filter((a) => !['s-id', 'c-id', 's-sn', 's-mode', 'sty-id', 'data-island', 'data-client'].includes(a.name) && !(ctx && ['hidden', 'role'].includes(a.name)))
      .map((a) => `${a.name}=${a.name === 'class' ? norm(a.value).split(/\s+/).filter((c) => !(ctx && c === 'in-list')).sort().join('.') : norm(a.value)}`)
      .sort()
      .join(' ');
    const kids = [...(node.shadowRoot ? node.shadowRoot.childNodes : []), ...node.childNodes].map(sig).join('');
    return `<${node.localName} ${attrs}${node.shadowRoot ? ' #shadow' : ''}>${kids}</>`;
  };
  const ids = [...doc.querySelectorAll('[id]')].map((e) => e.id);
  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  const hostsNotReady = [...doc.querySelectorAll('*')].filter((e) => e.localName.startsWith('ion-') && !e.classList.contains('hydrated')).map((e) => e.localName);
  return {
    total: nodes.length,
    adopted: nodes.filter((n) => n.isConnected).length,
    lost: nodes.filter((n) => !n.isConnected).length,
    annotationsLeft: doc.querySelectorAll('[c-id]').length + comments(doc.body),
    sIdLeft: doc.querySelectorAll('[s-id]').length,
    duplicateDomIds: dupIds.length,
    hostsNotHydrated: hostsNotReady.length,
    sig: sig(doc.body),
    sigNoCtx: ((c) => { ctx = c; return sig(doc.body); })(true),
    shadowHosts: [...doc.querySelectorAll('*')].filter((e) => e.shadowRoot).length,
  };
}

// Scoped mode: every relocated slotted node remembers where it was (`s-ol`, found through the `o.` comments by host id). A host id that
// collided points it at another island's comment: count the nodes whose original location is not inside the host they were slotted into.
function originalLocations(doc) {
  let checked = 0;
  let wrong = 0;
  let missing = 0;
  const walker = doc.createTreeWalker(doc.body, 4 | 1);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    const ol = n['s-ol'];
    if (n.nodeType === 1 && !n['s-hn']) continue;
    if (!n['s-hn']) continue;
    checked++;
    if (!ol) missing++;
    else if (!ol.parentNode || !(ol.parentNode.localName === n['s-hn'] || ol.parentNode.localName === String(n['s-hn']).toLowerCase())) wrong++;
  }
  return { checked, wrong, missing };
}

async function interact(doc) {
  const out = {};
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const toggles = [...doc.querySelectorAll('ion-toggle')];
  const pick = [toggles[0], toggles[toggles.length - 1]].filter(Boolean);
  out.toggles = [];
  for (const t of pick) {
    const before = t.checked;
    const events = [];
    t.addEventListener('ionChange', (e) => events.push(e.detail.checked));
    const inner = t.shadowRoot?.querySelector('input');
    if (inner) inner.click();
    else t.click();
    await wait(150);
    out.toggles.push({ before, after: t.checked, events });
  }
  const cb = doc.querySelector('ion-checkbox');
  if (cb) {
    const before = cb.checked;
    cb.click();
    await wait(150);
    out.checkbox = { before, after: cb.checked };
  }
  const btn = doc.querySelector('ion-button');
  if (btn) {
    let clicked = 0;
    btn.addEventListener('click', () => clicked++);
    (btn.shadowRoot?.querySelector('button') ?? btn).click();
    out.button = { clicked };
  }
  return out;
}

/** Load `origin`, adopt the server's elements with the client bundle (Stencil lazy loader), report what hydration did. */
export const hydrationReport = async (browser, origin, _html, path = '/') => {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && !/Failed to load resource/.test(m.text()) && errors.push(`${m.type()}: ${m.text()}`));
  await page.goto(origin + path, { waitUntil: 'load' });
  const styleTagsBefore = await page.evaluate(() => document.querySelectorAll('style[sty-id]').length);
  const marked = await page.evaluate(`(${markServerNodes})(document)`);
  await page.addScriptTag({ type: 'module', content: "import '/client/dist/ionic/ionic.esm.js';" });
  await page.waitForFunction(() => customElements.get('ion-toggle') || customElements.get('ion-item'), null, { timeout: 30000 });
  // Every Ionic host must come ready; a page whose hydration wedged never does, so the wait has a deadline and the report says so.
  const ready = await page.evaluate(async () => {
    const hosts = [...document.querySelectorAll('*')].filter((e) => e.localName.startsWith('ion-') && e.componentOnReady);
    const state = await Promise.race([Promise.all(hosts.map((e) => e.componentOnReady())).then(() => 'ready'), new Promise((r) => setTimeout(() => r('timeout'), 8000))]);
    return { state, hosts: hosts.length };
  });
  await page.waitForTimeout(400);
  const state = await page.evaluate(`(${snapshot})(document, false)`);
  const locations = await page.evaluate(`(${originalLocations})(document)`);
  const interaction = await page.evaluate(`(${interact})(document)`).catch((e) => ({ error: String(e) }));
  const styleTagsAfter = await page.evaluate(() => document.querySelectorAll('style[sty-id]').length);
  await page.close();
  return { marked, ready: ready.state, styleTagsBefore, styleTagsAfter, ...state, locations, interaction, errors: [...new Set(errors)].slice(0, 6) };
};
export { CLIENT_DIR };

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['style', 'script', 'textarea', 'title']);

/**
 * Adds `attrs` (a string such as ` data-island="a" data-client="visible"`) to the start tag of every top-level element of an
 * island's html. An island has no wrapper element (a wrapper would change slot assignment and `::slotted`), so its roots carry the marker.
 */
export const tagRoots = (html, attrs) => {
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  let depth = 0;
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    const [all, close, name, , selfClose] = m;
    const tag = name.toLowerCase();
    if (close) {
      depth--;
      continue;
    }
    if (depth === 0) {
      out += html.slice(last, m.index) + `<${name}${attrs}${m[3]}${selfClose}>`;
      last = m.index + all.length;
    }
    if (RAW.has(tag)) {
      const end = html.toLowerCase().indexOf(`</${tag}`, re.lastIndex);
      re.lastIndex = html.indexOf('>', end) + 1;
      continue;
    }
    if (!VOID.has(tag) && !selfClose) depth++;
  }
  return out + html.slice(last);
};
