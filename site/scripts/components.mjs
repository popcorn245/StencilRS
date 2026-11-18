// The Ionic component data of the site, made by stencilrs.
//
//   npm --prefix site run gen:components            write site/data/ionic-api.json and ionic-api-diff.json
//   npm --prefix site run gen:components -- --check fail when the committed files are out of date
//
// For every component in Ionic's migrated source (examples/ionic/migrated, fetched and migrated by
// ionic-source.mjs) this runs stencilrs' analyze() with `resolveImports` and `complexTypes` and writes
// what a component page needs: tag, JSDoc, properties, events, methods, slots, shadow parts, CSS custom
// properties (the component's JSDoc tags and the `@prop` comments of its .scss files).
//
// Where analyze() reports a `stencilrs:` diagnostic for a member's type (the checker is needed), the
// member's type is taken from Stencil's own docs-json (`stencil build`) for display, and counted and
// listed under `fallbacks`. Then everything analyze() produced is compared with docs-json, member by
// member, and each difference is written to ionic-api-diff.json: a difference is a compiler finding.
//
// The output is deterministic (components, members and keys sorted), so it is committed. The pages
// are not generated files: components/[tag].md renders this data (a VitePress dynamic route).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyze } from '@popcorn245/stencilrs';

import { docsJsonFile, ensureIonic, ionicDir, migrated } from './ionic-source.mjs';

const siteDir = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const apiFile = `${siteDir}/data/ionic-api.json`;
const diffFile = `${siteDir}/data/ionic-api-diff.json`;
const sourcesFile = `${siteDir}/data/ionic-sources.json`;
const componentsDir = `${migrated}/src/components`;

/** Ionic's docs sections (ionicframework.com/docs/components), in their order, with our one page per tag. */
export const GROUPS = [
  ['Accordion', ['ion-accordion', 'ion-accordion-group']],
  ['Action Sheet', ['ion-action-sheet']],
  ['Alert', ['ion-alert']],
  ['Avatar', ['ion-avatar']],
  ['Backdrop', ['ion-backdrop']],
  ['Badge', ['ion-badge']],
  ['Breadcrumb', ['ion-breadcrumb', 'ion-breadcrumbs']],
  ['Button', ['ion-button']],
  ['Card', ['ion-card', 'ion-card-header', 'ion-card-title', 'ion-card-subtitle', 'ion-card-content']],
  ['Checkbox', ['ion-checkbox']],
  ['Chip', ['ion-chip']],
  ['Content', ['ion-content']],
  ['Date & Time', ['ion-datetime', 'ion-datetime-button']],
  ['Floating Action Button', ['ion-fab', 'ion-fab-button', 'ion-fab-list']],
  ['Grid', ['ion-grid', 'ion-row', 'ion-col']],
  ['Image', ['ion-img']],
  ['Infinite Scroll', ['ion-infinite-scroll', 'ion-infinite-scroll-content']],
  ['Input', ['ion-input', 'ion-input-otp', 'ion-input-password-toggle', 'ion-textarea']],
  ['Item', ['ion-item', 'ion-item-divider', 'ion-item-group', 'ion-item-sliding', 'ion-item-options', 'ion-item-option', 'ion-label', 'ion-note']],
  ['List', ['ion-list', 'ion-list-header']],
  ['Loading', ['ion-loading']],
  ['Menu', ['ion-menu', 'ion-menu-button', 'ion-menu-toggle']],
  ['Modal', ['ion-modal']],
  ['Navigation', ['ion-nav', 'ion-nav-link', 'ion-back-button']],
  ['Picker', ['ion-picker', 'ion-picker-column', 'ion-picker-column-option']],
  ['Popover', ['ion-popover']],
  ['Progress', ['ion-progress-bar']],
  ['Radio', ['ion-radio', 'ion-radio-group']],
  ['Range', ['ion-range']],
  ['Refresher', ['ion-refresher', 'ion-refresher-content']],
  ['Reorder', ['ion-reorder', 'ion-reorder-group']],
  ['Ripple Effect', ['ion-ripple-effect']],
  ['Routing', ['ion-router', 'ion-route', 'ion-route-redirect', 'ion-router-link', 'ion-router-outlet']],
  ['Searchbar', ['ion-searchbar']],
  ['Segment', ['ion-segment', 'ion-segment-button', 'ion-segment-content', 'ion-segment-view']],
  ['Select', ['ion-select', 'ion-select-option', 'ion-select-modal']],
  ['Skeleton Text', ['ion-skeleton-text']],
  ['Spinner', ['ion-spinner']],
  ['Split Pane', ['ion-split-pane']],
  ['Tabs', ['ion-tabs', 'ion-tab', 'ion-tab-bar', 'ion-tab-button']],
  ['Thumbnail', ['ion-thumbnail']],
  ['Toast', ['ion-toast']],
  ['Toggle', ['ion-toggle']],
  ['Toolbar', ['ion-toolbar', 'ion-header', 'ion-footer', 'ion-title', 'ion-buttons']],
  ['Typography', ['ion-text']],
  ['App', ['ion-app']],
];

const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const sortKeys = (v) =>
  Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;

const posix = (p) => p.replaceAll('\\', '/');

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) yield p;
  }
}

// --- JSDoc tags -------------------------------------------------------------------------------

/** `@slot name - text`, `@slot - text`, `@part name - text`. */
function nameDocs(text) {
  const t = text.trim();
  // `- text` (the default slot), or `name - text` where the name may hold spaces (`button cancel`).
  const m = /^-\s+([\s\S]*)$/.exec(t) ?? /^([\s\S]*?)\s+-\s+([\s\S]*)$/.exec(t);
  if (m) return m.length === 2 ? { name: '', docs: m[1].trim() } : { name: m[1], docs: m[2].trim() };
  return { name: t, docs: '' };
}

/** Slots: the `@slot` tags, plus the `<slot>`s of the source nobody documented (Stencil lists those too; the default one as "The default slot"). */
function slotsOf(source, tags) {
  const out = tags.filter((t) => t.name === 'slot').map((t) => nameDocs(t.text));
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  for (const m of code.matchAll(/<slot(?:\s+name=["']([^"']*)["'])?[\s/>]/g)) {
    const name = m[1] ?? '';
    if (!out.some((s) => s.name === name)) out.push({ name, docs: name === '' ? 'The default slot' : '' });
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

// --- the .scss `@prop` comments ----------------------------------------------------------------

const scssCache = new Map();
/** `@prop --name: text` comments of a style file and, depth first, of the files it `@import`s: what Stencil's CSS docs read from the compiled sheet. */
function scssProps(file, seen = new Set()) {
  if (seen.has(file)) return [];
  seen.add(file);
  if (!scssCache.has(file)) scssCache.set(file, existsSync(file) ? readFileSync(file, 'utf8') : '');
  const text = scssCache.get(file);
  const out = [];
  // Imports and doc comments in source order.
  const re = /@import\s+(?:"([^"]+)"|'([^']+)')\s*;|\/\*\*([\s\S]*?)\*\//g;
  for (let m; (m = re.exec(text)); ) {
    if (m[3] !== undefined) {
      const body = m[3].replace(/^\s*\* ?/gm, '');
      const props = body.split(/(?:^|\n)\s*(?=@prop\s)/).filter((s) => s.startsWith('@prop'));
      for (const p of props) {
        const pm = /^@prop\s+(--[\w-]+)\s*:\s*([\s\S]*)$/.exec(p);
        if (pm) out.push({ name: pm[1], docs: pm[2].replace(/\s*\n\s*/g, ' ').trim() });
      }
    } else {
      const spec = m[1] ?? m[2];
      if (/^(https?:|~|sass:)/.test(spec) || /(^|\/)themes\//.test(spec)) continue;
      const base = join(dirname(file), spec);
      const cands = [`${base}.scss`, join(dirname(base), `_${base.split('/').pop()}.scss`), base];
      const hit = cands.find((c) => c.endsWith('.scss') && existsSync(c));
      if (hit) out.push(...scssProps(hit, seen));
    }
  }
  return out;
}

// --- analyze() -> page data --------------------------------------------------------------------

const hasTag = (docs, name) => (docs?.tags ?? []).some((t) => t.name === name);

/** The member a `stencilrs:` diagnostic names: "the type of prop `x` (reason) is not ported yet". */
function fallbackOf(message) {
  const m = /^stencilrs: the type of (prop|method|event|member)\s+`([^`]+)`\s*\(([^)]*)\)/.exec(message);
  return m ? { kind: m[1], name: m[2], reason: m[3] } : null;
}

function analyzeFile(file) {
  const source = readFileSync(file, 'utf8');
  return analyze(source, file, { resolveImports: true, complexTypes: true });
}

function componentData(meta, file, diagnostics, docsJson) {
  const tag = meta.tagName;
  const docsComp = docsJson?.get(tag);
  const rel = posix(relative(`${migrated}/`, file));
  const fallbacks = [];
  const fb = new Map();
  for (const d of diagnostics) {
    if (!d.message.startsWith('stencilrs:')) continue;
    const f = fallbackOf(d.message);
    if (f) fb.set(`${f.kind}:${f.name}`, f);
    else fallbacks.push({ kind: 'component', name: tag, reason: d.message });
  }
  const fromDocs = (kind, name) => {
    const list = kind === 'prop' ? docsComp?.props : kind === 'method' ? docsComp?.methods : docsComp?.events;
    return list?.find((x) => (kind === 'event' ? x.event : x.name) === name);
  };
  const noteFallback = (kind, name, f) => {
    fallbacks.push({ kind, name, reason: f.reason, from: fromDocs(kind, name) ? 'docs-json' : 'none' });
  };

  const props = [];
  for (const p of meta.properties) {
    if (hasTag(p.docs, 'internal')) continue;
    const f = fb.get(`prop:${p.name}`);
    const dj = f ? fromDocs('prop', p.name) : null;
    if (f) noteFallback('prop', p.name, f);
    const ct = p.complexType;
    props.push({
      name: p.name,
      attribute: f ? (dj?.attr ?? null) : p.attribute,
      type: dj ? dj.complexType.resolved : (ct?.resolved ?? p.complexTypeOriginal),
      original: dj ? dj.complexType.original : (ct?.original ?? p.complexTypeOriginal),
      default: p.defaultValue ?? (dj ? dj.default : undefined) ?? null,
      docs: p.docs?.text ?? '',
      reflect: !!p.reflect,
      mutable: !!p.mutable,
      required: !!p.required,
      optional: !!p.optional,
      deprecated: (p.docs?.tags ?? []).find((t) => t.name === 'deprecated')?.text ?? null,
      typeFrom: f ? 'docs-json' : 'analyze',
    });
  }
  // Virtual props (`@virtualProp {"ios" | "md"} mode - ...`): documented, no member in the class.
  for (const t of (meta.docs?.tags ?? []).filter((t) => t.name === 'virtualProp')) {
    const m = /^\{([\s\S]*?)\}\s+(\S+)\s+-\s+([\s\S]*)$/.exec(t.text);
    if (m) props.push({ name: m[2], attribute: m[2], type: m[1], original: m[1], default: null, docs: m[3].trim(), reflect: false, mutable: false, required: false, optional: true, deprecated: null, typeFrom: 'jsdoc', virtual: true });
  }

  const events = meta.events
    .filter((e) => !hasTag(e.docs, 'internal'))
    .map((e) => {
      const f = fb.get(`event:${e.name}`);
      if (f) noteFallback('event', e.name, f);
      const dj = f ? fromDocs('event', e.name) : null;
      return {
        name: e.name,
        detail: dj ? dj.complexType.resolved : (e.complexType?.resolved ?? 'void'),
        docs: e.docs?.text ?? '',
        bubbles: e.bubbles,
        cancelable: e.cancelable,
        composed: e.composed,
        deprecated: (e.docs?.tags ?? []).find((t) => t.name === 'deprecated')?.text ?? null,
        typeFrom: f ? 'docs-json' : 'analyze',
      };
    });

  const methods = meta.methods
    .filter((m) => !hasTag(m.docs, 'internal'))
    .map((m) => {
      const f = fb.get(`method:${m.name}`);
      const dj = f ? fromDocs('method', m.name) : null;
      if (f) noteFallback('method', m.name, f);
      const signature = dj ? dj.complexType.signature : (m.complexType?.signature ?? '() => void');
      return {
        name: m.name,
        signature: `${m.name}${signature}`,
        docs: m.docs?.text ?? '',
        params: (m.docs?.tags ?? []).filter((t) => t.name === 'param').map((t) => nameDocs(`${t.text.split(/\s+/)[0]} - ${t.text.replace(/^\S+\s*/, '')}`)),
        returns: (m.docs?.tags ?? []).find((t) => t.name === 'returns' || t.name === 'return')?.text ?? '',
        deprecated: (m.docs?.tags ?? []).find((t) => t.name === 'deprecated')?.text ?? null,
        typeFrom: f ? 'docs-json' : 'analyze',
      };
    });

  const tags = meta.docs?.tags ?? [];
  const slots = slotsOf(readFileSync(file, 'utf8'), tags);
  const parts = tags.filter((t) => t.name === 'part').map((t) => nameDocs(t.text));

  // CSS custom properties: `@prop` in the component's JSDoc (none in Ionic's) and in its style files, per mode.
  const styles = [];
  const modes = {};
  const urls = meta.styleUrls ?? [];
  const dir = dirname(file);
  const add = (name, docs, mode) => styles.push({ name, docs, mode });
  for (const t of tags.filter((t) => t.name === 'prop')) {
    const m = /^(--[\w-]+)\s*:?\s*([\s\S]*)$/.exec(t.text);
    if (m) add(m[1], m[2].trim(), '');
  }
  for (const u of urls) {
    const mode = /\.(ios|md)\.scss$/.exec(u)?.[1] ?? '';
    (modes[mode || 'default'] ??= []).push(u);
    const seenNames = new Set();
    for (const p of scssProps(join(dir, u))) if (!seenNames.has(p.name)) { seenNames.add(p.name); add(p.name, p.docs, mode); }
  }
  // A property documented identically in both modes is listed once.
  const merged = new Map();
  for (const s of styles) {
    const key = `${s.name}\u0000${s.docs}`;
    const e = merged.get(key) ?? { name: s.name, docs: s.docs, modes: [] };
    if (s.mode && !e.modes.includes(s.mode)) e.modes.push(s.mode);
    merged.set(key, e);
  }
  const cssProps = [...merged.values()].map((e) => ({ ...e, modes: e.modes.length === 2 ? [] : e.modes })).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.modes.join() < b.modes.join() ? -1 : 1));

  const src = readFileSync(file, 'utf8');
  const deps = [...new Set([...src.matchAll(/<(ion-[a-z-]+)/g)].map((m) => m[1]).concat([...src.matchAll(/['"`](ion-[a-z-]+)['"`]\s*[,)]/g)].map((m) => m[1])))].filter((t) => t !== tag).sort();

  return {
    tag,
    file: rel,
    className: meta.componentClassName,
    encapsulation: meta.encapsulation,
    shadowDelegatesFocus: undefined,
    docs: meta.docs?.text ?? '',
    docsTags: tags.filter((t) => !['slot', 'part', 'virtualProp', 'prop'].includes(t.name)).map((t) => ({ name: t.name, text: t.text })),
    deprecated: tags.find((t) => t.name === 'deprecated')?.text ?? null,
    modes: Object.keys(modes).sort(),
    props: props.sort(byName),
    events: events.sort(byName),
    methods: methods.sort(byName),
    slots,
    parts: parts.sort(byName),
    cssProps,
    deps,
    fallbacks,
  };
}

// --- the comparison with Stencil's docs-json ----------------------------------------------------

const norm = (s) => (s ?? '').toString();
const normDocs = (s) => norm(s).replace(/\s+/g, ' ').trim();

function diffComponent(meta, comp, dj, diagnostics, source) {
  const out = [];
  const diff = (area, member, field, stencilrs, stencil) => {
    if (JSON.stringify(stencilrs) !== JSON.stringify(stencil)) out.push({ area, member, field, stencilrs, stencil });
  };
  const fbNames = new Set(diagnostics.filter((d) => d.message.startsWith('stencilrs:')).map((d) => fallbackOf(d.message)).filter(Boolean).map((f) => `${f.kind}:${f.name}`));

  // properties: the public ones (not @internal), by name
  const aProps = new Map(meta.properties.filter((p) => !hasTag(p.docs, 'internal')).map((p) => [p.name, p]));
  // `@virtualProp`s are props in docs-json, and are listed in the page data as virtual ones.
  for (const p of comp.props.filter((p) => p.virtual)) aProps.set(p.name, { name: p.name, complexType: { original: p.type, resolved: p.type, references: {} }, attribute: null, reflect: false, virtualOf: p });
  const dProps = new Map(dj.props.map((p) => [p.name, p]));
  for (const name of [...new Set([...aProps.keys(), ...dProps.keys()])].sort()) {
    const a = aProps.get(name);
    const d = dProps.get(name);
    if (!a || !d) { diff('props', name, 'presence', a ? 'present' : 'missing', d ? 'present' : 'missing'); continue; }
    if (a.virtualOf) { diff('props', name, 'docs', normDocs(a.virtualOf.docs), normDocs(d.docs)); continue; }
    const skipType = fbNames.has(`prop:${name}`);
    if (!skipType) {
      diff('props', name, 'complexType.original', norm(a.complexType?.original), norm(d.complexType.original));
      diff('props', name, 'complexType.resolved', norm(a.complexType?.resolved), norm(d.complexType.resolved));
      diff('props', name, 'complexType.references', Object.keys(a.complexType?.references ?? {}).sort(), Object.keys(d.complexType.references ?? {}).sort());
      diff('props', name, 'attribute', a.attribute ?? null, d.attr ?? null);
      diff('props', name, 'reflect', !!a.reflect, !!d.reflectToAttr);
    }
    diff('props', name, 'mutable', !!a.mutable, !!d.mutable);
    diff('props', name, 'optional', !!a.optional, !!d.optional);
    diff('props', name, 'required', !!a.required, !!d.required);
    diff('props', name, 'getter', !!a.getter, !!d.getter);
    diff('props', name, 'setter', !!a.setter, !!d.setter);
    diff('props', name, 'default', a.defaultValue ?? null, d.default ?? null);
    diff('props', name, 'docs', normDocs(a.docs?.text), normDocs(d.docs));
    const dDefaultTag = (d.docsTags ?? []).filter((t) => t.name !== 'default');
    diff('props', name, 'docsTags', (a.docs?.tags ?? []).map((t) => t.name).sort(), dDefaultTag.map((t) => t.name).sort());
  }

  const aEvents = new Map(meta.events.filter((e) => !hasTag(e.docs, 'internal')).map((e) => [e.name, e]));
  const dEvents = new Map(dj.events.map((e) => [e.event, e]));
  for (const name of [...new Set([...aEvents.keys(), ...dEvents.keys()])].sort()) {
    const a = aEvents.get(name);
    const d = dEvents.get(name);
    if (!a || !d) { diff('events', name, 'presence', a ? 'present' : 'missing', d ? 'present' : 'missing'); continue; }
    if (!fbNames.has(`event:${name}`)) {
      diff('events', name, 'complexType.original', norm(a.complexType?.original), norm(d.complexType.original));
      diff('events', name, 'complexType.resolved', norm(a.complexType?.resolved), norm(d.complexType.resolved));
    }
    diff('events', name, 'bubbles', a.bubbles, d.bubbles);
    diff('events', name, 'cancelable', a.cancelable, d.cancelable);
    diff('events', name, 'composed', a.composed, d.composed);
    diff('events', name, 'docs', normDocs(a.docs?.text), normDocs(d.docs));
  }

  const aMethods = new Map(meta.methods.filter((m) => !hasTag(m.docs, 'internal')).map((m) => [m.name, m]));
  const dMethods = new Map(dj.methods.map((m) => [m.name, m]));
  for (const name of [...new Set([...aMethods.keys(), ...dMethods.keys()])].sort()) {
    const a = aMethods.get(name);
    const d = dMethods.get(name);
    if (!a || !d) { diff('methods', name, 'presence', a ? 'present' : 'missing', d ? 'present' : 'missing'); continue; }
    if (!fbNames.has(`method:${name}`)) {
      diff('methods', name, 'signature', norm(a.complexType?.signature), norm(d.complexType.signature));
      diff('methods', name, 'complexType.references', Object.keys(a.complexType?.references ?? {}).sort(), Object.keys(d.complexType.references ?? {}).sort());
    }
    diff('methods', name, 'docs', normDocs(a.docs?.text), normDocs(d.docs));
  }

  // slots and parts come from the same JSDoc tags
  const tags = meta.docs?.tags ?? [];
  const pick = (name) => tags.filter((t) => t.name === name).map((t) => nameDocs(t.text)).sort((a, b) => (a.name < b.name ? -1 : 1)).map((x) => [x.name, normDocs(x.docs)]);
  diff('slots', '', 'list', slotsOf(source, tags).map((x) => [x.name, normDocs(x.docs)]), (dj.slots ?? []).map((s) => [s.name, normDocs(s.docs)]));
  diff('parts', '', 'list', pick('part'), (dj.parts ?? []).map((s) => [s.name, normDocs(s.docs)]));
  diff('component', '', 'encapsulation', meta.encapsulation, dj.encapsulation);
  diff('component', '', 'docs', normDocs(meta.docs?.text), normDocs(dj.docs));

  // CSS custom properties: name + mode + docs; docs-json lists a property once per mode
  const mine = new Set(comp.cssProps.flatMap((p) => (p.modes.length ? p.modes : ['ios', 'md']).map((m) => `${p.name}|${m}|${normDocs(p.docs)}`)));
  const theirs = new Set((dj.styles ?? []).map((s) => `${s.name}|${s.mode ?? ''}|${normDocs(s.docs)}`));
  // components with a single style file have no mode in docs-json
  const mineFlat = comp.modes.some((m) => m === 'ios' || m === 'md') ? mine : new Set(comp.cssProps.map((p) => `${p.name}||${normDocs(p.docs)}`));
  for (const k of [...mineFlat].sort()) if (!theirs.has(k)) out.push({ area: 'cssProps', member: k.split('|')[0], field: 'only in stencilrs', stencilrs: k, stencil: null });
  // Stencil's CSS docs also list a declaration that follows a doc comment, with the comment as its docs
  // (`--overflow: hidden` after the `@prop` block, a plain "private API" comment): its parser's quirk, kept apart.
  for (const k of [...theirs].sort()) if (!mineFlat.has(k)) out.push({ area: 'cssProps', member: k.split('|')[0], field: 'only in docs-json', quirk: true, stencilrs: null, stencil: k.split('|').slice(2).join('|').slice(0, 120) + (k.length > 120 ? '...' : '') + ` [${k.split('|')[1]}]` });
  return out;
}

// --- main ---------------------------------------------------------------------------------------

export function generate() {
  ensureIonic({ docsJson: true });
  const docsRaw = JSON.parse(readFileSync(docsJsonFile, 'utf8'));
  const docsJson = new Map(docsRaw.components.map((c) => [c.tag, c]));
  const pkg = JSON.parse(readFileSync(`${ionicDir}/upstream/core/package.json`, 'utf8'));

  const components = {};
  const diffs = {};
  const notInDocsJson = [];
  const quirks = [];
  let analyzeMs = 0;
  for (const file of walk(componentsDir)) {
    const source = readFileSync(file, 'utf8');
    if (!/@Component\(/.test(source)) continue;
    const t0 = performance.now();
    const result = analyzeFile(file);
    analyzeMs += performance.now() - t0;
    for (const meta of result.components) {
      const dj = docsJson.get(meta.tagName);
      if (!dj) { notInDocsJson.push({ tag: meta.tagName, file: posix(relative(`${migrated}/`, file)), reason: 'not in Stencil docs-json' }); continue; }
      const comp = componentData(meta, file, result.diagnostics, docsJson);
      components[meta.tagName] = comp;
      const d = diffComponent(meta, comp, dj, result.diagnostics, source);
      const real = d.filter((x) => !x.quirk);
      if (real.length) diffs[meta.tagName] = real;
      for (const q of d.filter((x) => x.quirk)) quirks.push({ tag: meta.tagName, name: q.member, docs: q.stencil });
    }
  }
  const tags = Object.keys(components).sort();
  // Source file of every element the demos may need, including the ones docs-json leaves out (ion-select-popover).
  const sources = Object.fromEntries([...tags.map((t) => [t, components[t].file]), ...notInDocsJson.map((n) => [n.tag, n.file])].sort(([a], [b]) => (a < b ? -1 : 1)));
  for (const t of tags) components[t].deps = components[t].deps.filter((d) => sources[d]);
  const grouped = GROUPS.flatMap(([, list]) => list);
  const missing = tags.filter((t) => !grouped.includes(t));
  const unknown = grouped.filter((t) => !components[t]);
  if (missing.length || unknown.length) throw new Error(`GROUPS is out of step with the components: not grouped ${missing}; not found ${unknown}`);
  const docsOnly = [...docsJson.keys()].filter((t) => !components[t]).sort();

  const fallbacks = tags.flatMap((tag) => components[tag].fallbacks.map((f) => ({ tag, ...f })));
  const api = {
    source: { name: 'Ionic Framework', license: 'MIT', version: pkg.version, tag: 'v9.0.12', migrated: 'Stencil v5.0.0-beta.25 via examples/ionic' },
    sources,
    groups: GROUPS.map(([name, list]) => ({ name, tags: list })),
    stats: {
      components: tags.length,
      properties: tags.reduce((n, t) => n + components[t].props.filter((p) => !p.virtual).length, 0),
      events: tags.reduce((n, t) => n + components[t].events.length, 0),
      methods: tags.reduce((n, t) => n + components[t].methods.length, 0),
      cssProperties: tags.reduce((n, t) => n + components[t].cssProps.length, 0),
      fallbacks: fallbacks.length,
    },
    fallbacks,
    components: Object.fromEntries(tags.map((t) => [t, components[t]])),
  };
  const nDiffs = Object.values(diffs).reduce((n, d) => n + d.length, 0);
  const report = {
    note: 'stencilrs analyze({ resolveImports, complexTypes }) compared with the docs-json of `stencil build` (v5.0.0-beta.25) on the same migrated Ionic source. Every entry is a difference.',
    compared: tags.length,
    differences: nDiffs,
    componentsWithDifferences: Object.keys(diffs).length,
    notInDocsJson: notInDocsJson.sort((a, b) => (a.tag < b.tag ? -1 : 1)),
    onlyInDocsJson: docsOnly,
    typeFallbacks: fallbacks.length,
    stencilDocsQuirks: { note: 'docs-json lists a CSS declaration that follows a doc comment as a custom property, with the comment as its docs. Not a stencilrs difference.', count: quirks.length, items: quirks },
    byComponent: Object.fromEntries(Object.keys(diffs).sort().map((t) => [t, diffs[t]])),
  };
  return { api: sortKeys(api), report: sortKeys(report), analyzeMs };
}

const stringify = (o) => `${JSON.stringify(o, null, 2)}\n`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { api, report, analyzeMs } = generate();
  // The small part the browser needs to load a component and the ones it renders: tag -> file, dependencies.
  const sources = sortKeys(Object.fromEntries(Object.entries(api.sources).map(([tag, file]) => [tag, { file, deps: api.components[tag]?.deps ?? [] }])));
  const files = [[apiFile, stringify(api)], [diffFile, stringify(report)], [sourcesFile, stringify(sources)]];
  if (process.argv.includes('--check')) {
    const stale = files.filter(([f, text]) => !existsSync(f) || readFileSync(f, 'utf8') !== text).map(([f]) => relative(siteDir, f));
    if (stale.length) { console.error(`out of date: ${stale.join(', ')} (run npm run gen:components)`); process.exit(1); }
    console.log('ionic-api.json and ionic-api-diff.json are up to date');
  } else {
    for (const [f, text] of files) writeFileSync(f, text);
    console.log(`${api.stats.components} components (${api.stats.properties} properties, ${api.stats.events} events, ${api.stats.methods} methods, ${api.stats.cssProperties} CSS properties)`);
    console.log(`analyze(): ${analyzeMs.toFixed(0)} ms for ${api.stats.components} components; ${api.stats.fallbacks} type fallbacks to docs-json; ${report.differences} differences in ${report.componentsWithDifferences} components`);
  }
}
