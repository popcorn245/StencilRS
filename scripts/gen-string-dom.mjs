// Generates runtime-string-dom.js: what the DOM-free string renderer (runtime-string.js) needs to know about
// the DOM it does not have, read from happy-dom (the DOM the default renderer uses), so both agree:
//   - WINDOW_ON / ELEMENT_ON: the `on*` names of the window and of HTMLElement (the event-type rule of
//     `EventPart`, and "the page does not delegate this event, so the component hydrates on load").
//   - DOM_GLOBALS: the names `createRenderer` installs on `globalThis` that Node does not have. While the string
//     renderer runs components, each is an accessor that makes the render fall back, so a hook touching one (or
//     only testing `typeof window`) is detected whatever it does with the answer.
//   - ELEMENT_PROPS / TAG_PROPS: the property names an HTML element has (all of them, then per tag the ones
//     beyond that), so an attribute part knows whether `AttrPart` would set a property or an attribute.
//
//   node scripts/gen-string-dom.mjs        (needs happy-dom; run again after a happy-dom update)
import { Window } from 'happy-dom';
import { readFileSync, writeFileSync } from 'node:fs';

const window = new Window();
const sorted = (xs) => [...xs].sort();
const chain = (o) => {
  const s = new Set();
  for (let p = o; p && p !== Object.prototype; p = Object.getPrototypeOf(p)) for (const k of Object.getOwnPropertyNames(p)) if (k !== 'constructor') s.add(k);
  return s;
};
const on = (o) => sorted([...chain(o)].filter((k) => k.startsWith('on')));
const ownOn = (o) => sorted(Object.getOwnPropertyNames(o).filter((k) => k.startsWith('on')));

// Names Node itself has (the renderer's `keep` set): not ours to trap, except the ones it overrides.
const FORCED = ['navigator'];
const node = new Set(Object.getOwnPropertyNames(globalThis));
const globals = sorted(Object.getOwnPropertyNames(window).filter((k) => (!node.has(k) || FORCED.includes(k)) && k !== 'undefined' && k !== 'NaN' && k !== 'Infinity'));

const TAGS = 'a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd label legend li link main map mark menu meta meter nav noscript object ol optgroup option output p param picture pre progress q rp rt ruby s samp script section select slot small source span strong style sub summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr'.split(' ');
const base = chain(window.document.createElement('div'));
// Names that are methods on HTMLElement (`click`, `focus`...): a component may assign its own over them.
const methods = new Set();
for (let p = window.HTMLElement.prototype; p && p !== Object.prototype; p = Object.getPrototypeOf(p)) for (const k of Object.getOwnPropertyNames(p)) if (k !== 'constructor' && typeof Object.getOwnPropertyDescriptor(p, k).value === 'function') methods.add(k);
const perTag = {};
for (const tag of TAGS) {
  const extra = sorted([...chain(window.document.createElement(tag))].filter((k) => !base.has(k)));
  if (extra.length) perTag[tag] = extra.join(' ');
}

// The HTML 4 named entities, with the character happy-dom decodes each to.
const ENTITY_NAMES = 'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml fnof Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho Sigma Tau Upsilon Phi Chi Psi Omega alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigmaf sigma tau upsilon phi chi psi omega thetasym upsih piv bull hellip prime Prime oline frasl weierp image real trade alefsym larr uarr rarr darr harr crarr lArr uArr rArr dArr hArr forall part exist empty nabla isin notin ni prod sum minus lowast radic prop infin ang and or cap cup int there4 sim cong asymp ne equiv le ge sub sup nsub sube supe oplus otimes perp sdot lceil rceil lfloor rfloor lang rang loz spades clubs hearts diams quot amp lt gt OElig oelig Scaron scaron Yuml circ tilde ensp emsp thinsp zwnj zwj lrm rlm ndash mdash lsquo rsquo sbquo ldquo rdquo bdquo dagger Dagger permil lsaquo rsaquo euro apos'.split(' ');
const probe = window.document.createElement('div');
const entities = [];
for (const name of ENTITY_NAMES) {
  probe.innerHTML = `&${name};`;
  const ch = probe.textContent;
  if (ch && ch !== `&${name};` && [...ch].length === 1) entities.push(`${name}${ch}`);
}

const version = JSON.parse(readFileSync(new URL('../node_modules/happy-dom/package.json', import.meta.url), 'utf8')).version;
const words = (xs) => JSON.stringify(xs.join(' '));
writeFileSync(
  new URL('../runtime-string-dom.js', import.meta.url),
  `// Generated by scripts/gen-string-dom.mjs from happy-dom ${version}: the DOM facts the string renderer needs without a DOM.
// Do not edit; run \`node scripts/gen-string-dom.mjs\`.
const set = (s) => new Set(s.split(' '));
export const WINDOW_ON = set(${words(ownOn(window))});
// \`name\` + the character it decodes to, as \`&name;\` in text and attribute values.
export const ENTITIES = Object.fromEntries(${JSON.stringify(entities.join(' '))}.split(' ').map((e) => { const m = /^[A-Za-z0-9]+/.exec(e)[0]; return [m, e.slice(m.length)]; }));
export const ELEMENT_ON = set(${words(on(window.HTMLElement.prototype))});
export const DOM_GLOBALS = ${words(globals)}.split(' ');
export const ELEMENT_PROPS = set(${words(sorted(base))});
export const ELEMENT_METHODS = set(${words(sorted([...methods].filter((k) => base.has(k))))});
const EXTRA = {
${Object.entries(perTag)
  .map(([tag, v]) => `  ${/^[a-z]+$/.test(tag) ? tag : JSON.stringify(tag)}: ${JSON.stringify(v)},`)
  .join('\n')}
};
export const TAG_PROPS = Object.fromEntries(Object.entries(EXTRA).map(([tag, v]) => [tag, set(v)]));
`,
);
console.log(`runtime-string-dom.js: ${globals.length} globals, ${base.size} element props, ${Object.keys(perTag).length} tags with extras (happy-dom ${version})`);
