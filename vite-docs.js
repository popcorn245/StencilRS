// What `docs` and `types` of the Vite plugin need, without TypeScript or @stencil/unplugin: the
// custom-elements manifest behind `@stencil/unplugin/docs`, and the `components.d.ts` that
// `types: true` writes to `srcDir`. They are ports of Stencil's own generators
// (`generateManifest` and `cmpMetaToDocsComponent`, `generateComponentTypesFile`, `parseStyleDocs`),
// fed with the component metadata stencilrs computes: the `COMPILER_META` that `transpile` writes
// for `componentMetadata: 'compilerstatic'` (what `newSpecPage` reads), and `analyze` for the
// component's JSDoc. Output is byte for byte what @stencil/unplugin produces for the same files
// (`test/vite-docs.test.js` compares them); a file stencilrs does not port yet reports a
// `stencilrs:` diagnostic and its metadata comes from Stencil's own compiler instead.
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, posix, relative, resolve } from 'node:path';

import { analyze, transpile } from './index.js';

const HTML_ELEMENT_METHODS = new Set([
  'attachInternals', 'blur', 'click', 'focus', 'hidePopover', 'showPopover', 'togglePopover', 'after', 'animate',
  'append', 'attachShadow', 'before', 'checkVisibility', 'closest', 'computedStyleMap', 'getAnimations',
  'getAttribute', 'getAttributeNames', 'getAttributeNode', 'getAttributeNodeNS', 'getAttributeNS',
  'getBoundingClientRect', 'getClientRects', 'getElementsByClassName', 'getElementsByTagName',
  'getElementsByTagNameNS', 'getHTML', 'hasAttribute', 'hasAttributeNS', 'hasAttributes', 'hasPointerCapture',
  'insertAdjacentElement', 'insertAdjacentHTML', 'insertAdjacentText', 'matches', 'moveBefore', 'prepend',
  'querySelector', 'querySelectorAll', 'releasePointerCapture', 'remove', 'removeAttribute', 'removeAttributeNode',
  'removeAttributeNS', 'replaceChildren', 'replaceWith', 'requestFullscreen', 'requestPointerLock', 'scroll',
  'scrollBy', 'scrollIntoView', 'scrollIntoViewIfNeeded', 'scrollTo', 'setAttribute', 'setAttributeNode',
  'setAttributeNodeNS', 'setAttributeNS', 'setCapture', 'setHTML', 'setHTMLUnsafe', 'setPointerCapture',
  'toggleAttribute', 'appendChild', 'cloneNode', 'compareDocumentPosition', 'contains', 'getRootNode',
  'hasChildNodes', 'insertBefore', 'isDefaultNamespace', 'isEqualNode', 'isSameNode', 'lookupNamespaceURI',
  'lookupPrefix', 'normalize', 'removeChild', 'replaceChild', 'addEventListener', 'dispatchEvent',
  'removeEventListener',]);

// ---- Stencil's small utilities -------------------------------------------------------------------------------

/** Stencil's `normalizePath`: forward slashes, `.` and `..` folded, a leading `./` kept on a relative path. */
export const normalizePath = (path, relativize = true) => {
  path = path.trim().replace(/\\/g, '/');
  const root = /^(?:\/\/[^/]+\/|\/|[A-Za-z]:\/?)?/.exec(path)[0];
  const out = [];
  for (const part of path.slice(root.length).split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (out.length && out[out.length - 1] !== '..') {
        out.pop();
        continue;
      }
      if (root) continue;
    }
    out.push(part);
  }
  const normalized = root + out.join('/');
  if (normalized === '') return '.';
  if (root === '' && out[0] && path.includes('/') && !out[0].startsWith('.') && !out[0].startsWith('@') && relativize) return `./${normalized}`;
  return normalized;
};

const sortBy = (array, prop) =>
  array.slice().sort((a, b) => {
    const x = prop(a);
    const y = prop(b);
    return x < y ? -1 : x > y ? 1 : 0;
  });
const unique = (array, predicate = (i) => i) => {
  const seen = new Set();
  return array.filter((item) => {
    const key = predicate(item);
    if (key == null) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const dashToPascalCase = (str) =>
  str
    .toLowerCase()
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
const toTitleCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const LINE_BREAK = /\r?\n|\r/g;
const SUPPRESSED_JSDOC_TAGS = ['virtualProp', 'slot', 'part', 'internal'];

const getTextDocs = (docs) => {
  if (docs == null) return '';
  return [
    docs.text.replace(LINE_BREAK, ' ').replace(/\*\//g, '*\\/'),
    ...docs.tags.filter((tag) => tag.name !== 'internal').map((tag) => `@${tag.name} ${(tag.text || '').replace(LINE_BREAK, ' ').replace(/\*\//g, '*\\/')}`),
  ]
    .join('\n')
    .trim();
};
const docBlockLines = (docs) =>
  [...docs.text.split(LINE_BREAK), ...docs.tags.filter((tag) => !SUPPRESSED_JSDOC_TAGS.includes(tag.name)).map((tag) => `@${tag.name} ${tag.text || ''}`.split(LINE_BREAK))].flat().filter(Boolean);
const formatDocBlock = (docs, indentation = 0) => {
  const lines = docBlockLines(docs);
  if (!lines.filter(Boolean).length) return '';
  const spaces = ' '.repeat(indentation);
  return [`${spaces}/**`, ...lines.map((line) => `${spaces} * ${line}`), `${spaces} */`].join('\n');
};
const addDocBlock = (str, docs, indentation = 0) => (docs ? [formatDocBlock(docs, indentation), str].filter(Boolean).join('\n') : str);

// ---- component metadata --------------------------------------------------------------------------------------

const COMPONENT_DECORATOR_RE = /(@Component|@Prop|@State|@Event|@Method|@Watch|@Listen)\s*[(\s]/;
export const hasComponentDecorator = (code) => COMPONENT_DECORATOR_RE.test(code);

/** Stencil's `parseVirtualProp`, on the component's `@virtualProp` tags. */
const virtualProperties = (docs) =>
  docs.tags
    .filter(({ name }) => name === 'virtualProp')
    .map((tag) => {
      const m = /^\s*(?:\{([^}]+)\}\s+)?(\w+)\s+-\s+(.*)$/.exec(tag.text);
      if (!m) return null;
      return { type: m[1] == null ? 'any' : m[1].trim(), name: m[2].trim(), docs: m[3].trim() };
    })
    .filter(Boolean);

/** The object literal `static get COMPILER_META()` returns (JSON strings, `undefined`, `null`, `true`, `false`, nesting). */
export const compilerMetaOf = (code) => {
  const at = code.indexOf('static get COMPILER_META()');
  if (at < 0) return null;
  const start = code.indexOf('return {', at) + 7;
  let depth = 0;
  let i = start;
  do {
    const ch = code[i++];
    if (ch === '"') {
      while (code[i] !== '"') i += code[i] === '\\' ? 2 : 1;
      i++;
    } else if (ch === '{') depth++;
    else if (ch === '}') depth--;
  } while (depth > 0);
  return new Function(`return ${code.slice(start, i)}`)();
};

/**
 * The compiler metadata (Stencil's `ComponentCompilerMeta`, the part docs and types read) of the components of one
 * file, computed by stencilrs. Returns `null` when the file has something stencilrs does not port yet (a `stencilrs:`
 * diagnostic): its metadata then comes from Stencil's compiler, see `stencilMeta`.
 */
export function stencilrsMeta(file, source, { resolveImports = true, onUnported } = {}) {
  file = normalizePath(file, false);
  const analysis = analyze(source, file, { resolveImports, complexTypes: true });
  if (analysis.diagnostics.some((d) => d.message.startsWith('stencilrs:'))) {
    onUnported?.(file, analysis.diagnostics);
    return null;
  }
  // Decorators, but no component (a base class, a mixin): nothing to document, as Stencil's compiler finds.
  if (!analysis.components.length) return [];
  const result = transpile(source, { file, resolveImports, componentExport: null, componentMetadata: 'compilerstatic', coreImportPath: '@stencil/core/testing', style: null, jsx: 'classic' });
  if (result.diagnostics.some((d) => d.message.startsWith('stencilrs:'))) return null;
  const metas = [];
  for (const a of analysis.components) {
    const cmp = compilerMetaOf(result.code);
    if (!cmp || cmp.tagName !== a.tagName) return null;
    cmp.docs = a.docs;
    cmp.virtualProperties = virtualProperties(a.docs);
    cmp.sourceFilePath = file;
    metas.push(cmp);
  }
  return analysis.components.length === 1 ? metas : null;
}

/** The same metadata from Stencil's own compiler (`transpileSync`, as @stencil/unplugin reads it): loads TypeScript. */
export async function stencilMeta(file, source) {
  const { transpileSync } = await import('@stencil/core/compiler');
  file = normalizePath(file, false);
  const result = transpileSync(source, { file, componentExport: 'customelement' });
  return (result.data ?? []).filter((c) => c.tagName).map((c) => ({ ...c, sourceFilePath: c.sourceFilePath ?? file }));
}

// ---- stylesheet docs (`parseStyleDocs`) ----------------------------------------------------------------------

const CSS_DOC_START = /\/\*(\*|!)/;
const CSS_DOC_END = '*/';
const CSS_PROP_ANNOTATION_RE = /@(?:cssproperty|cssprop|prop)\b/;
const isJsDocComment = (text) => text.startsWith('*') || text.startsWith('!');
const normalizeJsDocLines = (text) =>
  text
    .replace(/^[*!]/, '')
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\*/, '').trim())
    .filter((line, i, arr) => !(line === '' && (i === 0 || i === arr.length - 1)));
const normalizeJsDocText = (text) => normalizeJsDocLines(text).filter(Boolean).join(' ').trim();
const stripQuotes = (value) => value.replace(/^['"]|['"]$/g, '');
const parsePropertyAtRuleDescriptors = (node) => {
  let syntax;
  let initialValue;
  node.each((child) => {
    if (child.type !== 'decl') return;
    if (child.prop === 'syntax') syntax = stripQuotes(child.value);
    else if (child.prop === 'initial-value') initialValue = child.value;
  });
  return { syntax, initialValue };
};

function parseCssComment(styleDocs, comment, mode) {
  comment = comment
    .split(/\r?\n/)
    .map((line) => {
      line = line.trim();
      while (line.startsWith('*')) line = line.substring(1).trim();
      return line;
    })
    .join(' ')
    .replace(/\t/g, ' ')
    .trim();
  while (comment.includes('  ')) comment = comment.replace('  ', ' ');
  comment.split(CSS_PROP_ANNOTATION_RE).forEach((d) => {
    const cssDocument = d.trim();
    if (!cssDocument.startsWith('--')) return;
    const splt = cssDocument.split(':');
    const styleDoc = { name: splt[0].trim(), docs: (splt.shift() && splt.join(':')).trim(), annotation: 'prop', mode };
    if (!styleDocs.some((c) => c.name === styleDoc.name && c.annotation === 'prop')) styleDocs.push(styleDoc);
  });
}

function parseScopedAndNativeStyleDocs(postcss, styleDocs, styleText, mode, tag, encapsulation) {
  const processor = postcss();
  let root;
  try {
    root = processor.process(styleText, { from: undefined }).root;
  } catch {
    return;
  }
  const hasName = (name) => styleDocs.some((s) => s.name === name);
  const rootSelector = encapsulation === 'shadow' || encapsulation === 'scoped' ? ':host' : tag;
  if (rootSelector) {
    root.walkRules((rule) => {
      if (!rule.selectors.some((selector) => selector.trim() === rootSelector)) return;
      const children = rule.nodes;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.type !== 'decl' || !child.prop.startsWith('--') || hasName(child.prop)) continue;
        const prev = children[i - 1];
        if (!prev || prev.type !== 'comment' || !isJsDocComment(prev.text)) continue;
        styleDocs.push({ name: child.prop, docs: normalizeJsDocText(prev.text), annotation: 'prop', mode });
      }
    });
  }
  root.walkAtRules('property', (node) => {
    const propName = node.params.trim();
    if (!propName.startsWith('--') || hasName(propName)) return;
    const { syntax, initialValue } = parsePropertyAtRuleDescriptors(node);
    const prev = node.prev();
    const docs = prev && prev.type === 'comment' && isJsDocComment(prev.text) ? normalizeJsDocText(prev.text) : '';
    styleDocs.push({ name: propName, docs, annotation: 'prop', mode, ...(syntax && { syntax }), ...(initialValue && { default: initialValue }) });
  });
}

/** Stencil's `parseStyleDocs`; `postcss` (the package's default export) is needed only for a stylesheet with custom properties. */
export function parseStyleDocs(postcss, styleText, mode, tag, encapsulation) {
  const styleDocs = [];
  let remaining = styleText;
  let match = remaining.match(CSS_DOC_START);
  while (match !== null) {
    remaining = remaining.substring(match.index + match[0].length);
    const end = remaining.indexOf(CSS_DOC_END);
    if (end === -1) break;
    parseCssComment(styleDocs, remaining.substring(0, end), mode);
    remaining = remaining.substring(end + CSS_DOC_END.length);
    match = remaining.match(CSS_DOC_START);
  }
  if (styleText.includes('--')) parseScopedAndNativeStyleDocs(postcss, styleDocs, styleText, mode, tag, encapsulation);
  return styleDocs;
}

/**
 * @stencil/unplugin's `collectStyleDocsForComponent`: `cmp.styleDocs` from the component's inline and external stylesheets.
 * `tools.css(path)` gives a stylesheet's text (Sass and Less compiled), `tools.postcss` is postcss.
 */
export async function collectStyleDocs(cmp, componentPath, tools) {
  const dir = dirname(componentPath);
  for (const style of cmp.styles ?? []) {
    const texts = [];
    if (style.styleStr) texts.push(style.styleStr);
    for (const external of style.externalStyles ?? []) {
      const abs = resolve(dir, external.originalComponentPath ?? external.relativePath);
      const css = await tools.css(abs);
      if (css) texts.push(css);
    }
    for (const css of texts) {
      const docs = parseStyleDocs(tools.postcss, css, style.modeName, cmp.tagName, cmp.encapsulation ?? 'none');
      if (docs.length) {
        cmp.styleDocs ??= [];
        cmp.styleDocs.push(...docs);
      }
    }
  }
}

// ---- docs: `cmpMetaToDocsComponent` and `generateManifest` ---------------------------------------------------

const getDocsDeprecationText = (tags) => {
  const deprecation = tags.find((t) => t.name === 'deprecated');
  if (deprecation) return deprecation.text || '';
  return undefined;
};

const parseTypeIntoValues = (type) => {
  if (typeof type !== 'string') return [];
  const parsed = [];
  for (const raw of type.split('|')) {
    const u = raw.trim();
    if (u === 'true') parsed.push({ value: 'true', type: 'boolean' });
    else if (u === 'false') parsed.push({ value: 'false', type: 'boolean' });
    else if (!Number.isNaN(parseFloat(u))) parsed.push({ value: u, type: 'number' });
    else if (/^("|').+("|')$/gm.test(u)) parsed.push({ value: u.slice(1, -1), type: 'string' });
    else parsed.push({ type: u });
  }
  return parsed;
};

const getRealProperties = (properties) =>
  properties
    .filter((member) => !member.internal)
    .map((member) => ({
      name: member.name,
      type: member.complexType.resolved,
      complexType: member.complexType,
      mutable: member.mutable,
      attr: member.attribute,
      reflectToAttr: !!member.reflect,
      docs: member.docs.text,
      docsTags: member.docs.tags,
      default: member.defaultValue,
      deprecation: getDocsDeprecationText(member.docs.tags),
      values: parseTypeIntoValues(member.complexType.resolved),
      optional: member.optional,
      required: member.required,
      getter: member.getter,
      setter: member.setter,
    }));
const getVirtualProperties = (virtualProps) =>
  virtualProps.map((member) => ({
    name: member.name,
    type: member.type,
    mutable: false,
    attr: member.name,
    reflectToAttr: false,
    docs: member.docs,
    docsTags: [],
    default: undefined,
    deprecation: undefined,
    values: parseTypeIntoValues(member.type),
    optional: true,
    required: false,
    getter: undefined,
    setter: undefined,
  }));
const getDocsProperties = (cmp) => sortBy([...getRealProperties(cmp.properties), ...getVirtualProperties(cmp.virtualProperties)], (p) => p.name);

const getDocsMethods = (methods) =>
  sortBy(methods, (m) => m.name)
    .filter((m) => !m.internal)
    .map((m) => ({
      name: m.name,
      returns: { type: m.complexType.return, docs: m.docs.tags.filter((t) => t.name === 'return' || t.name === 'returns').map((t) => t.text).join('\n') },
      complexType: m.complexType,
      signature: `${m.name}${m.complexType.signature}`,
      parameters: m.complexType.parameters,
      docs: m.docs.text,
      docsTags: m.docs.tags,
      deprecation: getDocsDeprecationText(m.docs.tags),
    }));

const getDocsEvents = (events) =>
  sortBy(events, (e) => e.name.toLowerCase())
    .filter((e) => !e.internal)
    .map((e) => ({
      event: e.name,
      detail: e.complexType.resolved,
      bubbles: e.bubbles,
      complexType: e.complexType,
      cancelable: e.cancelable,
      composed: e.composed,
      docs: e.docs.text,
      docsTags: e.docs.tags,
      deprecation: getDocsDeprecationText(e.docs.tags),
    }));

const getDocsStyles = (cmp) => {
  if (!cmp.styleDocs) return [];
  return sortBy(cmp.styleDocs, (d) => `${d.name.toLowerCase()},${d.mode.toLowerCase()}}`).map((d) => ({
    name: d.name,
    annotation: d.annotation || '',
    docs: d.docs || '',
    mode: d.mode && d.mode !== '$' ? d.mode : undefined,
    ...(d.syntax && { syntax: d.syntax }),
    ...(d.default && { default: d.default }),
  }));
};

const getDocsListeners = (listeners) => listeners.map((l) => ({ event: l.name, target: l.target, capture: l.capture, passive: l.passive }));

const getNameText = (name, tags) =>
  tags
    .filter((tag) => tag.name === name && tag.text)
    .map(({ text }) => {
      const [namePart, ...rest] = (' ' + text).split(' - ');
      return [namePart.trim(), rest.join(' - ').trim()];
    });
const getDocsSlots = (vdom, tags) => {
  const docsSlots = getNameText('slot', tags).map(([name, docs]) => ({ name, docs }));
  const vdomSlots = vdom.map((name) => ({ name, docs: name === '' ? 'The default slot' : '' }));
  return sortBy(unique([...docsSlots, ...vdomSlots], (s) => s.name), (a) => a.name);
};
const getDocsParts = (vdom, tags) => {
  const docsParts = getNameText('part', tags).map(([name, docs]) => ({ name, docs }));
  const vdomParts = vdom.map((name) => ({ name, docs: '' }));
  return sortBy(unique([...docsParts, ...vdomParts], (p) => p.name), (p) => p.name);
};
const getDocsCustomStates = (cmp) => {
  if (!cmp.attachInternalsCustomStates || cmp.attachInternalsCustomStates.length === 0) return [];
  return sortBy(
    cmp.attachInternalsCustomStates.map((s) => ({ name: s.name, initialValue: s.initialValue, docs: s.docs || '' })),
    (s) => s.name,
  );
};

/** Stencil's `cmpMetaToDocsComponent`: one component's `JsonDocsComponent`, with an empty readme and usage. */
export function cmpMetaToDocsComponent(cmp, filePath, rootDir = process.cwd()) {
  const normalizedFilePath = normalizePath(filePath);
  const dirPath = normalizePath(posix.dirname(normalizedFilePath));
  const docs = cmp.docs ?? { text: '', tags: [] };
  return {
    dirPath,
    filePath: normalizePath(relative(rootDir, normalizedFilePath), false),
    fileName: basename(normalizedFilePath),
    readmePath: normalizePath(posix.join(dirPath, 'readme.md')),
    usagesDir: normalizePath(posix.join(dirPath, 'usage')),
    tag: cmp.tagName,
    readme: '',
    overview: docs.text,
    usage: {},
    docs: docs.text,
    docsTags: docs.tags,
    encapsulation: cmp.encapsulation === 'shadow' ? 'shadow' : cmp.encapsulation === 'scoped' ? 'scoped' : 'none',
    dependents: cmp.directDependents ?? [],
    dependencies: cmp.directDependencies ?? [],
    dependencyGraph: {},
    deprecation: getDocsDeprecationText(docs.tags),
    props: getDocsProperties(cmp),
    methods: getDocsMethods(cmp.methods ?? []),
    events: getDocsEvents(cmp.events ?? []),
    styles: getDocsStyles(cmp),
    slots: getDocsSlots(cmp.htmlSlots ?? [], docs.tags),
    parts: getDocsParts(cmp.htmlParts ?? [], docs.tags),
    customStates: getDocsCustomStates(cmp),
    listeners: getDocsListeners(cmp.listeners ?? []),
  };
}

const convertTypeReferences = (references) => {
  if (!references || Object.keys(references).length === 0) return undefined;
  return Object.entries(references).map(([name, ref]) => ({
    name,
    ...(ref.location === 'global' && { package: 'global:' }),
    ...(ref.location === 'import' && ref.path && { module: ref.path }),
  }));
};
const toTags = (docsTags, skip = []) => {
  const tags = docsTags.filter((t) => t.name !== 'deprecated' && !skip.includes(t.name)).map((t) => ({ name: t.name, ...(t.text && { text: t.text }) }));
  return tags.length > 0 ? tags : undefined;
};
const createType = (text, references) => {
  const typeRefs = convertTypeReferences(references);
  return { text, ...(typeRefs && { references: typeRefs }) };
};
const demosDir = (component) => {
  if (!component.usagesDir) return '';
  const dir = component.dirPath && component.filePath ? posix.join(posix.dirname(component.filePath), relative(component.dirPath, component.usagesDir)) : component.usagesDir;
  return `${normalizePath(dir, false)}/`;
};

const componentToDeclaration = (component) => {
  const className = dashToPascalCase(component.tag);
  const attributes = component.props
    .filter((prop) => prop.attr !== undefined)
    .map((prop) => ({
      name: prop.attr,
      ...(prop.docs && { description: prop.docs }),
      ...(prop.type && { type: createType(prop.type, prop.complexType?.references) }),
      ...(prop.default !== undefined && { default: prop.default }),
      fieldName: prop.name,
      ...(prop.deprecation !== undefined && { deprecated: prop.deprecation || true }),
      ...(toTags(prop.docsTags) && { tags: toTags(prop.docsTags) }),
    }));
  const members = [
    ...component.props.map((prop) => ({
      kind: 'field',
      name: prop.name,
      ...(prop.docs && { description: prop.docs }),
      ...(prop.type && { type: createType(prop.type, prop.complexType?.references) }),
      ...(prop.default !== undefined && { default: prop.default }),
      ...(prop.deprecation !== undefined && { deprecated: prop.deprecation || true }),
      ...(prop.getter && !prop.setter && { readonly: true }),
      ...(prop.attr && { attribute: prop.attr }),
      ...(prop.reflectToAttr && { reflects: true }),
      ...(toTags(prop.docsTags) && { tags: toTags(prop.docsTags) }),
    })),
    ...component.methods.map((method) => ({
      kind: 'method',
      name: method.name,
      ...(method.docs && { description: method.docs }),
      ...(method.deprecation !== undefined && { deprecated: method.deprecation || true }),
      ...(method.parameters &&
        method.parameters.length > 0 && {
          parameters: method.parameters.map((param) => ({
            name: param.name,
            ...(param.docs && { description: param.docs }),
            ...(param.type && { type: createType(param.type, method.complexType?.references) }),
          })),
        }),
      ...(method.returns && {
        return: {
          ...(method.returns.type && { type: createType(method.returns.type, method.complexType?.references) }),
          ...(method.returns.docs && { description: method.returns.docs }),
        },
      }),
      ...(toTags(method.docsTags) && { tags: toTags(method.docsTags) }),
    })),
  ];
  const events = component.events.map((event) => ({
    name: event.event,
    ...(event.docs && { description: event.docs }),
    type: createType(event.detail ? `CustomEvent<${event.detail}>` : 'CustomEvent', event.complexType?.references),
    ...(event.deprecation !== undefined && { deprecated: event.deprecation || true }),
    ...(toTags(event.docsTags) && { tags: toTags(event.docsTags) }),
  }));
  const slots = component.slots.map((slot) => ({ name: slot.name, ...(slot.docs && { description: slot.docs }) }));
  const cssParts = component.parts.map((part) => ({ name: part.name, ...(part.docs && { description: part.docs }) }));
  const cssProperties = component.styles
    .filter((style) => style.annotation === 'prop')
    .map((style) => ({ name: style.name, ...(style.docs && { description: style.docs }), ...(style.syntax && { syntax: style.syntax }), ...(style.default && { default: style.default }) }));
  const demos = Object.entries(component.usage || {}).map(([name, content]) => ({ url: `${demosDir(component)}${name}.md`, ...(content && { description: content }) }));
  return {
    kind: 'class',
    customElement: true,
    tagName: component.tag,
    name: className,
    ...(component.docs && { description: component.docs }),
    ...(component.deprecation !== undefined && { deprecated: component.deprecation || true }),
    ...(toTags(component.docsTags, ['slot', 'part']) && { tags: toTags(component.docsTags, ['slot', 'part']) }),
    ...(attributes.length > 0 && { attributes }),
    ...(members.length > 0 && { members }),
    ...(events.length > 0 && { events }),
    ...(slots.length > 0 && { slots }),
    ...(cssParts.length > 0 && { cssParts }),
    ...(cssProperties.length > 0 && { cssProperties }),
    ...(component.customStates.length > 0 && {
      cssStates: component.customStates.map((state) => ({ name: state.name, initialValue: state.initialValue, ...(state.docs && { description: state.docs }) })),
    }),
    ...(demos.length > 0 && { demos }),
  };
};

/** Stencil's `generateManifest`: the Custom Elements Manifest of docs components (`cmpMetaToDocsComponent`'s output). */
export function generateManifest(docsComponents) {
  const byFile = new Map();
  for (const component of docsComponents) {
    if (!byFile.has(component.filePath)) byFile.set(component.filePath, []);
    byFile.get(component.filePath).push(component);
  }
  const modules = [];
  for (const [filePath, components] of byFile) {
    const declarations = components.map((c) => componentToDeclaration(c));
    const exports = components.flatMap((component) => {
      const className = dashToPascalCase(component.tag);
      return [
        { kind: 'js', name: className, declaration: { name: className } },
        { kind: 'custom-element-definition', name: component.tag, declaration: { name: className } },
      ];
    });
    modules.push({ kind: 'javascript-module', path: filePath, declarations, exports });
  }
  return { schemaVersion: '2.1.0', modules };
}

// ---- types: `generateComponentTypesFile` ---------------------------------------------------------------------

const COMPONENTS_DTS_HEADER = `/* eslint-disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */`;
const MAX_ONE_OF_REQUIRED_PROPS = 8;
const FORM_ASSOCIATED_ATTRIBUTES = [
  { name: 'disabled', type: 'boolean', optional: true, required: false, internal: false, jsdoc: 'If `true`, the user cannot interact with the element.' },
  { name: 'form', type: 'string', optional: true, required: false, internal: false, jsdoc: 'The `id` of a `<form>` element to associate this element with.' },
  { name: 'name', type: 'string', optional: true, required: false, internal: false, jsdoc: 'The name of the element, used when submitting an HTML form.' },
];

const sortImportNames = (a, b) => {
  const x = a.localName.toLowerCase();
  const y = b.localName.toLowerCase();
  if (x < y) return -1;
  if (x > y) return 1;
  if (a.localName < b.localName) return -1;
  if (a.localName > b.localName) return 1;
  return 0;
};

const getTypeImportPath = (importResolvedFile, sourceFilePath) => {
  if (importResolvedFile && importResolvedFile.startsWith('.')) importResolvedFile = posix.resolve(posix.dirname(sourceFilePath), importResolvedFile);
  return importResolvedFile;
};
const replaceTypeNameWithContext = (typeString, localName, importName) => {
  const pattern = new RegExp(`\\b${localName}\\b`);
  let result = '';
  let i = 0;
  while (i < typeString.length) {
    const char = typeString[i];
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      result += char;
      i++;
      while (i < typeString.length && typeString[i] !== quote) {
        if (typeString[i] === '\\' && i + 1 < typeString.length) {
          result += typeString[i];
          result += typeString[i + 1];
          i += 2;
        } else {
          result += typeString[i];
          i++;
        }
      }
      if (i < typeString.length) {
        result += typeString[i];
        i++;
      }
    } else {
      const match = typeString.slice(i).match(pattern);
      if (match && match.index === 0) {
        result += importName;
        i += localName.length;
      } else {
        result += char;
        i++;
      }
    }
  }
  return result;
};
const updateTypeIdentifierNames = (typeReferences, typeImportData, sourceFilePath, initialType) => {
  let current = initialType;
  for (const ref of Object.values(typeReferences)) {
    const file = getTypeImportPath(ref.path, sourceFilePath);
    if (typeof file !== 'string') continue;
    if (!Object.prototype.hasOwnProperty.call(typeImportData, file)) continue;
    for (const datum of typeImportData[file]) {
      if (datum.importName) current = replaceTypeNameWithContext(current, datum.localName, datum.importName);
    }
  }
  return current;
};

const updateReferenceTypeImports = (importData, typeCounts, cmp, filePath) => {
  const incrementName = (name) => {
    const counter = typeCounts.get(name);
    if (counter === undefined) {
      typeCounts.set(name, 1);
      return name;
    }
    typeCounts.set(name, counter + 1);
    return `${name}${counter}`;
  };
  const update = (existing, refs) => {
    Object.keys(refs).forEach((typeName) => {
      const ref = refs[typeName];
      let resolved;
      if (ref.location === 'global') return;
      else if (ref.location === 'local') resolved = filePath;
      else resolved = ref.path;
      if (resolved.startsWith('.')) resolved = posix.resolve(posix.dirname(filePath), resolved);
      existing[resolved] = existing[resolved] || [];
      if (existing[resolved].find((df) => df.localName === typeName)) return;
      const newTypeName = incrementName(typeName);
      let originalExportName;
      if (ref.referenceLocation) originalExportName = ref.referenceLocation;
      else {
        const parts = ref.id.split('::');
        originalExportName = parts.length > 1 ? parts[parts.length - 1] : typeName;
      }
      existing[resolved].push({ originalName: originalExportName, localName: typeName, importName: newTypeName, isDefault: ref.isDefault });
    });
    return existing;
  };
  return [...cmp.properties, ...cmp.events, ...cmp.methods]
    .filter((m) => m.complexType && m.complexType.references)
    .reduce((data, m) => update(data, m.complexType.references), importData);
};

const generateEventTypes = (cmp, importData, cmpClassName) =>
  cmp.events.map((event) => ({
    name: `on${toTitleCase(event.name)}`,
    type: event.complexType.original ? `(event: ${cmpClassName}CustomEvent<${updateTypeIdentifierNames(event.complexType.references, importData, cmp.sourceFilePath, event.complexType.original)}>) => void` : 'CustomEvent',
    optional: false,
    required: false,
    internal: event.internal,
    jsdoc: getTextDocs(event.docs),
  }));
const generateMethodTypes = (cmp, importData) =>
  cmp.methods.map((m) => ({
    name: m.name,
    type: updateTypeIdentifierNames(m.complexType.references, importData, cmp.sourceFilePath, m.complexType.signature),
    optional: false,
    required: false,
    internal: m.internal,
    jsdoc: getTextDocs(m.docs),
  }));
/**
 * What `stencil build` adds to a prop's JSDoc tags while it writes `components.d.ts` (`@readonly` for a getter without a setter,
 * `@default` from its initializer), before the docs are written: docs-json carries them. Done in place, once.
 */
export const addGeneratedDocTags = (cmp) => {
  for (const prop of cmp.properties) {
    let doc = getTextDocs(prop.docs);
    if (prop.getter && !prop.setter && !doc?.match('@readonly')) {
      prop.docs = prop.docs || { tags: [], text: '' };
      prop.docs.tags = [...(prop.docs.tags || []), { name: 'readonly', text: '' }];
      doc = getTextDocs(prop.docs);
    }
    if (prop.defaultValue !== undefined && !doc?.match('@default')) {
      prop.docs = prop.docs || { tags: [], text: '' };
      prop.docs.tags = [...(prop.docs.tags || []), { name: 'default', text: prop.defaultValue }];
    }
  }
};

const generatePropTypes = (cmp, importData) => [
  ...cmp.properties.map((prop) => {
    let doc = getTextDocs(prop.docs);
    if (prop.getter && !prop.setter && !doc?.match('@readonly')) {
      prop.docs = prop.docs || { tags: [], text: '' };
      prop.docs.tags = [...(prop.docs.tags || []), { name: 'readonly', text: '' }];
      doc = getTextDocs(prop.docs);
    }
    if (prop.defaultValue !== undefined && !doc?.match('@default')) {
      prop.docs = prop.docs || { tags: [], text: '' };
      prop.docs.tags = [...(prop.docs.tags || []), { name: 'default', text: prop.defaultValue }];
      doc = getTextDocs(prop.docs);
    }
    return {
      name: prop.name,
      type: updateTypeIdentifierNames(prop.complexType.references, importData, cmp.sourceFilePath, prop.complexType.original),
      optional: prop.optional,
      required: prop.required,
      internal: prop.internal,
      jsdoc: doc,
    };
  }),
  ...cmp.virtualProperties.map((prop) => ({ name: prop.name, type: prop.type, optional: true, required: false, jsdoc: prop.docs, internal: false })),
];

const generateEventListenerTypes = (cmp, importData) => {
  const tagNameAsPascal = dashToPascalCase(cmp.tagName.toLowerCase());
  const htmlElementName = `HTML${tagNameAsPascal}Element`;
  const cmpEventInterface = `${tagNameAsPascal}CustomEvent`;
  const mapName = `${htmlElementName}EventMap`;
  const cmpEvents = cmp.events.filter((e) => e.complexType.original);
  if (!cmpEvents.length) return { htmlElementEventMap: [], htmlElementEventListenerProperties: [] };
  const props = cmpEvents.map((e) => `        "${e.name}": ${updateTypeIdentifierNames(e.complexType.references, importData, cmp.sourceFilePath, e.complexType.original)};`);
  return {
    htmlElementEventMap: [`    interface ${mapName} {`, ...props, `    }`],
    htmlElementEventListenerProperties: [
      `        addEventListener<K extends keyof ${mapName}>(type: K, listener: (this: ${htmlElementName}, ev: ${cmpEventInterface}<${mapName}[K]>) => any, options?: boolean | AddEventListenerOptions): void;`,
      '        addEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;',
      '        addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;',
      '        addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;',
      `        removeEventListener<K extends keyof ${mapName}>(type: K, listener: (this: ${htmlElementName}, ev: ${cmpEventInterface}<${mapName}[K]>) => any, options?: boolean | EventListenerOptions): void;`,
      '        removeEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => any, options?: boolean | EventListenerOptions): void;',
      '        removeEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | EventListenerOptions): void;',
      '        removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;',
    ],
  };
};

const attributesToMultiLineString = (attributes, jsxAttributes, internal) => {
  const str = sortBy(attributes, (a) => a.name)
    .filter((type) => !(jsxAttributes && !internal && type.internal))
    .reduce((list, type) => {
      if (type.jsdoc) {
        list.push(`        /**`);
        list.push(...type.jsdoc.split('\n').map((line) => '          * ' + line));
        list.push(`         */`);
      }
      const optional = jsxAttributes ? !type.required : type.optional;
      list.push(`        "${type.name}"${optional ? '?' : ''}: ${type.type};`);
      return list;
    }, [])
    .join('\n');
  return str !== '' ? `${str}\n` : '';
};

const generateComponentTypes = (cmp, importData, areTypesInternal, signalBacking = false) => {
  const tagName = cmp.tagName.toLowerCase();
  const tagNameAsPascal = dashToPascalCase(tagName);
  const htmlElementName = `HTML${tagNameAsPascal}Element`;
  const propAttributes = generatePropTypes(cmp, importData);
  const methodAttributes = generateMethodTypes(cmp, importData);
  const eventAttributes = generateEventTypes(cmp, importData, tagNameAsPascal);
  const { htmlElementEventMap, htmlElementEventListenerProperties } = generateEventListenerTypes(cmp, importData);
  const conflictingMethods = methodAttributes.filter((m) => HTML_ELEMENT_METHODS.has(m.name));
  const componentAttributes = attributesToMultiLineString([...propAttributes, ...methodAttributes], false, areTypesInternal);
  const propNames = new Set(propAttributes.map((p) => p.name));
  const formAssociatedAttrs = cmp.formAssociated ? FORM_ASSOCIATED_ATTRIBUTES.filter((a) => !propNames.has(a.name)) : [];
  const jsxPropAttributes = signalBacking ? propAttributes.map((a) => ({ ...a, type: `${a.type} | ReadonlySignal<${a.type}>` })) : propAttributes;
  const jsxAttributes = attributesToMultiLineString([...jsxPropAttributes, ...eventAttributes, ...formAssociatedAttrs], true, areTypesInternal);
  let elementInterface;
  if (conflictingMethods.length > 0) {
    const overrides = conflictingMethods
      .map((method) => {
        const optional = method.optional ? '?' : '';
        let docBlock = '';
        if (method.jsdoc) docBlock = [`        /**`, ...method.jsdoc.split('\n').map((line) => '          * ' + line), `         */`].join('\n') + '\n';
        return `${docBlock}        "${method.name}"${optional}: ${method.type};`;
      })
      .join('\n');
    elementInterface = [
      addDocBlock(`    interface ${htmlElementName} extends Omit<Components.${tagNameAsPascal}, ${conflictingMethods.map((m) => `"${m.name}"`).join(' | ')}>, HTMLStencilElement {`, cmp.docs, 4),
      overrides,
      ...htmlElementEventListenerProperties,
      `    }`,
    ];
  } else {
    elementInterface = [addDocBlock(`    interface ${htmlElementName} extends Components.${tagNameAsPascal}, HTMLStencilElement {`, cmp.docs, 4), ...htmlElementEventListenerProperties, `    }`];
  }
  if (signalBacking && cmp.properties.length > 0) {
    const names = (areTypesInternal ? cmp.properties : cmp.properties.filter((p) => !p.internal)).map((p) => `"${p.name}"`).join(' | ');
    if (names) elementInterface.splice(-1, 0, `        readonly [STENCIL_SIGNALS_SYMBOL]?: ReadonlyMap<${names}, ReadonlySignal<unknown>>;`);
  }
  const element = [...htmlElementEventMap, ...elementInterface, `    var ${htmlElementName}: {`, `        prototype: ${htmlElementName};`, `        new (): ${htmlElementName};`, `    };`];
  const propsWithAttributes = cmp.properties.filter((prop) => prop.attribute !== undefined);
  const requiredProps = propsWithAttributes.filter((prop) => (!areTypesInternal && prop.internal ? false : prop.required));
  const explicitAttributes = propsWithAttributes
    .filter((prop) => !(!areTypesInternal && prop.internal))
    .map((prop) => {
      const propMeta = cmp.properties.find((p) => p.name === prop.name);
      const simpleType = propMeta?.type?.trim();
      const attrType = simpleType && ['string', 'number', 'boolean'].includes(simpleType) ? propMeta?.complexType?.original || simpleType : 'string';
      return `        "${prop.name}": ${attrType};`;
    })
    .join('\n');
  return {
    tagName,
    tagNameAsPascal,
    htmlElementName,
    component: addDocBlock(`    interface ${tagNameAsPascal} {\n${componentAttributes}    }`, cmp.docs, 4),
    jsx: `    interface ${tagNameAsPascal} {\n${jsxAttributes}    }`,
    element: element.join('\n'),
    explicitAttributes: propsWithAttributes.length > 0 ? `    interface ${tagNameAsPascal}Attributes {\n${explicitAttributes}\n    }` : null,
    requiredProps: requiredProps.length > 0 ? requiredProps.map((p) => ({ name: p.name, type: p.type, complexType: p.complexType })) : null,
  };
};

const generateEventDetailTypes = (cmp) => {
  const tagNameAsPascal = dashToPascalCase(cmp.tagName.toLowerCase());
  return [`export interface ${tagNameAsPascal}CustomEvent<T> extends CustomEvent<T> {`, `    detail: T;`, `    target: HTML${tagNameAsPascal}Element;`, `}`].join('\n');
};

/**
 * Stencil's `generateComponentTypesFile`: the contents of `components.d.ts` for components' metadata.
 * `config`: `srcDir` (absolute) and `signalBacking`.
 */
export function generateComponentTypesFile(components, config, areTypesInternal = true) {
  let typeImportData = {};
  const c = [];
  const allTypes = new Map();
  const eventDetailTypes = [];
  const modules = components.map((cmp) => {
    typeImportData = updateReferenceTypeImports(typeImportData, allTypes, cmp, cmp.sourceFilePath);
    if (cmp.events.length > 0) eventDetailTypes.push(generateEventDetailTypes(cmp));
    return generateComponentTypes(cmp, typeImportData, areTypesInternal, !!config.signalBacking);
  });
  c.push(COMPONENTS_DTS_HEADER);
  c.push(`import { HTMLStencilElement, JSXBase } from "@stencil/core/runtime";`);
  if (config.signalBacking) {
    c.push(`import { STENCIL_SIGNALS_SYMBOL, type ReadonlySignal } from "@stencil/core/signals";`);
    c.push(`export { STENCIL_SIGNALS_SYMBOL } from "@stencil/core/signals";`);
  }
  const imports = [];
  const exports = [];
  Object.keys(typeImportData).forEach((filePath) => {
    const typeData = typeImportData[filePath];
    let importFilePath = filePath;
    if (isAbsolute(filePath)) importFilePath = normalizePath('./' + relative(config.srcDir, filePath)).replace(/\.(tsx|ts)$/, '');
    const defaultImports = typeData.filter((td) => td.isDefault);
    const named = (list) =>
      list
        .sort(sortImportNames)
        .map((td) => (td.originalName === '' ? `${td.localName}` : td.originalName === td.importName ? `${td.originalName}` : `${td.originalName} as ${td.importName}`))
        .join(', ');
    if (defaultImports.length > 0) {
      const [defaultImport, ...additional] = defaultImports;
      const namedImports = typeData.filter((td) => !td.isDefault);
      const namedPart = named(namedImports);
      if (namedImports.length > 0) {
        imports.push(`import ${defaultImport.importName}, { ${namedPart} } from "${importFilePath}";`);
        exports.push(`export { default as ${defaultImport.importName}, ${namedPart} } from "${importFilePath}";`);
      } else {
        imports.push(`import ${defaultImport.importName} from "${importFilePath}";`);
        exports.push(`export { default as ${defaultImport.importName} } from "${importFilePath}";`);
      }
      additional.forEach((td) => {
        imports.push(`import ${td.importName} from "${importFilePath}";`);
        exports.push(`export { default as ${td.importName} } from "${importFilePath}";`);
      });
    } else {
      const namedPart = named(typeData);
      imports.push(`import { ${namedPart} } from "${importFilePath}";`);
      exports.push(`export { ${namedPart} } from "${importFilePath}";`);
    }
  });
  c.push(...imports, ...exports);
  c.push(`export namespace Components {`);
  c.push(...modules.map((m) => `${m.component}`));
  c.push(`}`);
  c.push(...eventDetailTypes);
  c.push(`declare global {`);
  c.push(...modules.map((m) => m.element));
  c.push(`    interface HTMLElementTagNameMap {`);
  c.push(...modules.map((m) => `        "${m.tagName}": ${m.htmlElementName};`));
  c.push(`    }`);
  c.push(`}`);
  c.push(`declare namespace LocalJSX {`);
  if (modules.some((m) => m.requiredProps && m.requiredProps.length > 0 && m.requiredProps.length <= MAX_ONE_OF_REQUIRED_PROPS)) {
    c.push(`    type OneOf<K extends string, PropT, AttrT = PropT> = { [P in K]: PropT } & { [P in \`attr:\${K}\`]?: never } | { [P in \`attr:\${K}\`]: AttrT } & { [P in K]?: never };`);
    c.push(``);
  }
  c.push(...modules.map((m) => addDocBlock(m.jsx, components.find((cmp) => cmp.tagName === m.tagName).docs, 4)));
  const attributeInterfaces = modules.filter((m) => m.explicitAttributes).map((m) => m.explicitAttributes);
  if (attributeInterfaces.length > 0) {
    c.push(``);
    c.push(...attributeInterfaces);
    c.push(``);
  }
  c.push(`    interface IntrinsicElements {`);
  c.push(
    ...modules.map((m) => {
      if (m.explicitAttributes) {
        const P = m.tagNameAsPascal;
        const baseOptional = `Omit<${P}, keyof ${P}Attributes> & { [K in keyof ${P} & keyof ${P}Attributes]?: ${P}[K] } & { [K in keyof ${P} & keyof ${P}Attributes as \`attr:\${K}\`]?: ${P}Attributes[K] } & { [K in keyof ${P} & keyof ${P}Attributes as \`prop:\${K}\`]?: ${P}[K] }`;
        if (m.requiredProps && m.requiredProps.length > 0 && m.requiredProps.length <= MAX_ONE_OF_REQUIRED_PROPS) {
          const requiredUnions = m.requiredProps.map((prop) => `OneOf<"${prop.name}", ${P}["${prop.name}"], ${P}Attributes["${prop.name}"]>`).join(' & ');
          return `        "${m.tagName}": ${baseOptional} & ${requiredUnions};`;
        }
        return `        "${m.tagName}": ${baseOptional};`;
      }
      return `        "${m.tagName}": ${m.tagNameAsPascal};`;
    }),
  );
  c.push(`    }`);
  c.push(`}`);
  c.push(`export { LocalJSX as JSX };`);
  c.push(`declare module "@stencil/core" {`);
  c.push(`    export namespace JSX {`);
  c.push(`        interface IntrinsicElements {`);
  c.push(
    ...modules.map((m) => addDocBlock(`            "${m.tagName}": LocalJSX.IntrinsicElements["${m.tagName}"] & JSXBase.HTMLAttributes<${m.htmlElementName}>;`, components.find((cmp) => cmp.tagName === m.tagName).docs, 12)),
  );
  c.push(`        }`);
  c.push(`    }`);
  c.push(`}`);
  const out = c.join('\n') + '\n';
  return out.includes('@preact/signals-core') ? out.replaceAll('import("@preact/signals-core")', 'import("@stencil/core/signals")') : out;
}
