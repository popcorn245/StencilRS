// A single-pass replacement for mock-doc's `serializeNodeToHtml` (Stencil v5's hydrate runner).
//
// Stencil's serializer is a recursive generator: `streamToHtml` yields every tag, attribute and
// space as its own tiny string, `yield*` delegates through one generator frame per tree level, and
// `serializeNodeToHtml` runs `Array.from(generator).join('')` per top-level child. On an Ionic page
// that is ~70% of `renderToString`'s CPU (the components themselves are under 5%). This walks the
// same tree with plain recursion, appends to one string, and keeps the original's decisions step
// for step, so the output is byte-identical (test/ssr-serializer.test.js checks that across an
// options matrix). What it does differently is only cost:
//   - `attributes.__items` is read once per element; mock-doc's `attributes` is a Proxy, and
//     `item(i)` through it is the slowest line left in the original after the generators;
//   - `attributes.getNamedItem('s-id')` (a linear scan, run per child in the original) runs once
//     per element, and only when a child is a <template>;
//   - escaping tests with one regex before replacing, since most text and attribute values have
//     nothing to escape, and replaces in a single pass.
//
// `prettyHtml: true` is not ported: it sorts and rewrites each element's classes and attribute
// order (mutating the tree) and is a debugging aid, not a production option. It, and anything
// that is not a mock-doc tree, goes to the `original` the caller passes.
//
// This file is plain ESM with no imports and a single export, because `ssr.js` also inlines its
// text into bundles (the runner, or an already-built hydrate app) where an import can't resolve.

const HYDRATE_ID = 's-id';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const SHADOW_ROOT_TAG = 'mock:shadow-root';

// Mock-doc's own tables (`serialize-node.ts`); `ssr.js`'s guard and the differential test are what
// notice if a Stencil upgrade changes them.
const NON_ESCAPABLE_CONTENT = new Set(['STYLE', 'SCRIPT', 'IFRAME', 'NOSCRIPT']);
const WHITESPACE_SENSITIVE = new Set(['CODE', 'OUTPUT', 'PRE', 'SCRIPT', 'TEMPLATE', 'TEXTAREA']);
const EMPTY_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const REMOVE_EMPTY_ATTR = new Set(['class', 'dir', 'id', 'lang', 'name', 'title']);
const BOOLEAN_ATTR = new Set([
  'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'controls', 'default', 'defer', 'disabled', 'formnovalidate',
  'hidden', 'inert', 'ismap', 'itemscope', 'loop', 'multiple', 'muted', 'nomodule', 'novalidate', 'open', 'readonly', 'required',
  'reversed', 'selected', 'shadowrootclonable', 'shadowrootcustomelementregistry', 'shadowrootdelegatesfocus',
  'shadowrootserializable',
]);
const STRUCTURE_ELEMENTS = new Set(['html', 'body', 'head', 'iframe', 'meta', 'link', 'base', 'title', 'script', 'style']);
const CAN_REMOVE_ATTR_QUOTES = /^[^ \t\n\f\r"'`=<>/\\-]+$/;

// One pass for `&`, nbsp and the mode's quote or angle brackets. The original chains replaces, but
// none of its replacements contains a character a later one looks for (`&` goes first), so the
// results are equal.
const TEXT_ESCAPE_TEST = /[& <>]/;
const TEXT_ESCAPE = /[& <>]/g;
const ATTR_ESCAPE_TEST = /[& "]/;
const ATTR_ESCAPE = /[& "]/g;
const ESCAPED = { '&': '&amp;', ' ': '&nbsp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeChar = (c) => ESCAPED[c];
const escapeText = (s) => (TEXT_ESCAPE_TEST.test(s) ? s.replace(TEXT_ESCAPE, escapeChar) : s);
const escapeAttr = (s) => (ATTR_ESCAPE_TEST.test(s) ? s.replace(ATTR_ESCAPE, escapeChar) : s);

const getTagName = (el) => (el.namespaceURI === 'http://www.w3.org/1999/xhtml' ? el.nodeName.toLowerCase() : el.nodeName);
const getChildNodes = (node) => node.__childNodes || node.childNodes;

const isWithinWhitespaceSensitive = (node) => {
  let n = node;
  while (n?.nodeName) {
    if (WHITESPACE_SENSITIVE.has(n.nodeName)) return true;
    n = n.parentNode;
  }
  return false;
};

/** `normalizeSerializationOptions`, as it is for everything but `prettyHtml: true`. */
const normalize = (opts) => ({
  ...opts,
  outerHtml: typeof opts.outerHtml !== 'boolean' ? false : opts.outerHtml,
  prettyHtml: false,
  indentSpaces: typeof opts.indentSpaces !== 'number' ? 0 : opts.indentSpaces,
  newLines: typeof opts.newLines !== 'boolean' ? false : opts.newLines,
  approximateLineWidth: typeof opts.approximateLineWidth !== 'number' ? -1 : opts.approximateLineWidth,
  removeEmptyAttributes: typeof opts.removeEmptyAttributes !== 'boolean' ? true : opts.removeEmptyAttributes,
  removeAttributeQuotes: typeof opts.removeAttributeQuotes !== 'boolean' ? false : opts.removeAttributeQuotes,
  removeBooleanAttributeQuotes: typeof opts.removeBooleanAttributeQuotes !== 'boolean' ? false : opts.removeBooleanAttributeQuotes,
  removeHtmlComments: typeof opts.removeHtmlComments !== 'boolean' ? false : opts.removeHtmlComments,
  serializeShadowRoot: typeof opts.serializeShadowRoot === 'undefined' ? 'declarative-shadow-dom' : opts.serializeShadowRoot,
  fullDocument: typeof opts.fullDocument !== 'boolean' ? true : opts.fullDocument,
});

/**
 * @param elm the node to serialize
 * @param serializationOptions `SerializeNodeToHtmlOptions`
 * @param original mock-doc's own `serializeNodeToHtml`, used for what is not ported
 */
export function fastSerializeNodeToHtml(elm, serializationOptions = {}, original) {
  if (serializationOptions.prettyHtml) return original(elm, serializationOptions);
  const opts = normalize(serializationOptions);
  const { newLines, indentSpaces, approximateLineWidth, excludeTags, excludeTagContent, removeEmptyAttributes } = opts;
  const lineWidth = approximateLineWidth > 0;
  const indenting = indentSpaces > 0;
  const layout = newLines || indenting;
  const { removeAttributeQuotes, removeBooleanAttributeQuotes, removeHtmlComments, serializeShadowRoot } = opts;

  // The original's `output` object, as locals.
  let out = '';
  let width = 0;
  let indent = 0;
  let inBody = false;

  const pad = () => {
    out += ' '.repeat(indent);
    width += indent;
  };

  const walk = (node) => {
    const type = node.nodeType;
    const isShadowRoot = type === 11;
    if (type === 1 || isShadowRoot) {
      const tagName = isShadowRoot ? SHADOW_ROOT_TAG : getTagName(node);
      if (tagName === 'body') inBody = true;
      const ignoreTag = excludeTags != null && excludeTags.includes(tagName);
      if (ignoreTag === false) {
        const sensitive = layout ? isWithinWhitespaceSensitive(node) : false;
        if (newLines && !sensitive) {
          out += '\n';
          width = 0;
        }
        if (indenting && !sensitive) pad();
        const tag = tagName === SHADOW_ROOT_TAG ? 'template' : tagName;
        out += '<' + tag;
        width += tag.length + 1;
        // The shadow root is a document fragment with no mode attribute (stenciljs/core#4111).
        if (tag === 'template' && (!node.getAttribute || !node.getAttribute('shadowrootmode')) && ('host' in node || node.nodeName.toLocaleLowerCase() === SHADOW_ROOT_TAG)) {
          out += ' shadowrootmode="open"';
          width += 22;
          if (node.delegatesFocus) {
            out += ' shadowrootdelegatesfocus';
            width += 25;
          }
          if (node.clonable) {
            out += ' shadowrootclonable';
            width += 19;
          }
          if (node.serializable) {
            out += ' shadowrootserializable';
            width += 23;
          }
        }
        const attrs = node.attributes;
        const attrsLength = attrs.length;
        // `attributes` is a Proxy over a MockAttributeMap; its array is the cheap way in.
        const items = attrs.__items;
        for (let i = 0; i < attrsLength; i++) {
          const attr = items !== undefined ? items[i] : attrs.item(i);
          const attrName = attr.name;
          if (attrName === 'style') continue;
          if (tag === 'template' && isShadowRoot && (attrName === 'shadowrootmode' || attrName === 'shadowrootdelegatesfocus' || attrName === 'shadowrootcustomelementregistry')) continue;
          const attrValue = attr.value;
          if (removeEmptyAttributes && attrValue === '' && REMOVE_EMPTY_ATTR.has(attrName)) continue;
          const ns = attr.namespaceURI;
          const localName = attr.localName ?? attrName;
          if (ns == null) {
            width += attrName.length + 1;
            if (lineWidth && width > approximateLineWidth) {
              out += '\n' + attrName;
              width = 0;
            } else out += ' ' + attrName;
          } else if (ns === XML_NS) {
            out += ' xml:' + localName;
            width += localName.length + 5;
          } else if (ns === XMLNS_NS) {
            if (localName !== 'xmlns') {
              out += ' xmlns:' + localName;
              width += localName.length + 7;
            } else {
              out += ' ' + localName;
              width += localName.length + 1;
            }
          } else if (ns === XLINK_NS) {
            out += ' xlink:' + localName;
            width += localName.length + 7;
          } else {
            out += ' ' + ns + ':' + localName;
            width += ns.length + localName.length + 2;
          }
          if (attrValue === '') {
            if (attrName === 'shadowrootdelegatesfocus') continue;
            if (removeBooleanAttributeQuotes && BOOLEAN_ATTR.has(attrName)) continue;
            if (removeEmptyAttributes && attrName.startsWith('data-')) continue;
          }
          if (removeAttributeQuotes && CAN_REMOVE_ATTR_QUOTES.test(attrValue)) {
            out += '=' + escapeAttr(attrValue);
            width += attrValue.length + 1;
          } else {
            out += '="' + escapeAttr(attrValue) + '"';
            width += attrValue.length + 3;
          }
        }
        if (node.hasAttribute('style')) {
          const cssText = node.style.cssText;
          if (lineWidth && width + cssText.length + 10 > approximateLineWidth) {
            out += `\nstyle="${cssText}">`;
            width = 0;
          } else {
            out += ` style="${cssText}">`;
            width += cssText.length + 10;
          }
        } else {
          out += '>';
          width += 1;
        }
      }
      if (EMPTY_ELEMENTS.has(tagName) === false) {
        const shadowRoot = node.shadowRoot;
        if (shadowRoot != null && serializeShadowRoot !== false) {
          indent += indentSpaces;
          walk(shadowRoot);
          indent -= indentSpaces;
          const childNodes = getChildNodes(node);
          if (newLines && (childNodes.length === 0 || (childNodes.length === 1 && childNodes[0].nodeType === 3 && childNodes[0].nodeValue?.trim() === ''))) {
            out += '\n';
            width = 0;
            pad();
          }
        }
        if (excludeTagContent == null || excludeTagContent.includes(tagName) === false) {
          const tag = tagName === SHADOW_ROOT_TAG ? 'template' : tagName;
          const childNodes = tagName === 'template' ? node.content.childNodes : getChildNodes(node);
          const childNodeLength = childNodes.length;
          if (childNodeLength > 0) {
            if (childNodeLength === 1 && childNodes[0].nodeType === 3 && (typeof childNodes[0].nodeValue !== 'string' || childNodes[0].nodeValue.trim() === '')) {
              // Only whitespace: the original writes nothing for it.
            } else {
              const sensitive = layout ? isWithinWhitespaceSensitive(node) : false;
              if (!sensitive && indenting && ignoreTag === false) indent += indentSpaces;
              // A hydrated Stencil component's own <template> (its declarative shadow root, from
              // parsed input) is replaced by a marker: the shadow root is serialized again above.
              let sId;
              let sIdRead = false;
              for (let i = 0; i < childNodeLength; i++) {
                const child = childNodes[i];
                if (child.nodeName.toLowerCase() === 'template') {
                  if (!sIdRead) {
                    sId = node.attributes.getNamedItem(HYDRATE_ID);
                    sIdRead = true;
                  }
                  if (sId) {
                    out += `\n${' '.repeat(indent)}<!--r.${sId.value}-->`;
                    continue;
                  }
                }
                walk(child);
              }
              if (ignoreTag === false) {
                if (newLines && !sensitive) {
                  out += '\n';
                  width = 0;
                }
                if (indenting && !sensitive) {
                  indent -= indentSpaces;
                  pad();
                }
              }
            }
          }
          if (ignoreTag === false) {
            out += '</' + tag + '>';
            width += tag.length + 3;
          }
        }
      }
      if (lineWidth && STRUCTURE_ELEMENTS.has(tagName)) {
        out += '\n';
        width = 0;
      }
      if (tagName === 'body') inBody = false;
    } else if (type === 3) {
      let text = node.nodeValue;
      if (typeof text === 'string') {
        const trimmed = text.trim();
        if (trimmed === '') {
          if (isWithinWhitespaceSensitive(node)) {
            out += text;
            width += text.length;
          } else if (lineWidth && !inBody) {
            // Dropped.
          } else {
            width += 1;
            if (lineWidth && width > approximateLineWidth) {
              out += '\n';
              width = 0;
            } else out += ' ';
          }
        } else {
          const sensitive = layout ? isWithinWhitespaceSensitive(node) : false;
          if (newLines && !sensitive) {
            out += '\n';
            width = 0;
          }
          if (indenting && !sensitive) pad();
          let length = text.length;
          if (length > 0) {
            const parent = node.parentNode;
            const parentTagName = parent != null && parent.nodeType === 1 ? parent.nodeName : null;
            if (typeof parentTagName === 'string' && NON_ESCAPABLE_CONTENT.has(parentTagName)) {
              if (isWithinWhitespaceSensitive(node)) out += text;
              else {
                out += trimmed;
                length = trimmed.length;
              }
              width += length;
            } else {
              if (layout ? sensitive : isWithinWhitespaceSensitive(node)) width += length;
              else {
                if (/\s/.test(text.charAt(0))) text = ' ' + text.trimStart();
                length = text.length;
                if (length > 1) {
                  if (/\s/.test(text.charAt(length - 1))) {
                    if (lineWidth && width + length > approximateLineWidth) {
                      text = text.trimEnd() + '\n';
                      width = 0;
                    } else text = text.trimEnd() + ' ';
                  }
                }
                width += length;
              }
              out += escapeText(text);
            }
          }
        }
      }
    } else if (type === 8) {
      const value = node.nodeValue;
      const isHydrateAnnotation = value?.startsWith('r.') || value?.startsWith('o.') || value?.startsWith('s.') || value?.startsWith('t.');
      // `removeHtmlComments` keeps Stencil's own hydrate annotations.
      if (removeHtmlComments && !isHydrateAnnotation) return;
      const sensitive = layout ? isWithinWhitespaceSensitive(node) : false;
      if (newLines && !sensitive) {
        out += '\n';
        width = 0;
      }
      if (indenting && !sensitive) pad();
      out += '<!--' + value + '-->';
      if (value) width += value.length + 7;
    } else if (type === 10) out += '<!doctype html>';
  };

  const children = !opts.fullDocument && elm.body ? Array.from(elm.body.childNodes) : opts.outerHtml ? [elm] : Array.from(getChildNodes(elm));
  for (let i = 0, ii = children.length; i < ii; i++) walk(children[i]);
  return out.trim();
}
