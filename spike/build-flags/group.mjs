// usage: node group.mjs <root> : gzip of the folded starter with groups of flags put back on
import { gzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
process.chdir(root);
const req = createRequire(root + '/x.js');
const { default: stencilrs } = await import(pathToFileURL(req.resolve('@popcorn245/stencilrs/vite')).href);
const { build } = await import(pathToFileURL(req.resolve('vite')).href);
const size = async (buildFlags) => {
  const r = await build({ root, configFile: false, logLevel: 'silent', plugins: [stencilrs({ foldRuntimeFlags: true, buildFlags })], build: { write: false } });
  const out = (Array.isArray(r) ? r[0] : r).output.filter((o) => o.type === 'chunk');
  return { raw: out.reduce((a, o) => a + o.code.length, 0), gz: out.reduce((a, o) => a + gzipSync(o.code, { level: 9 }).length, 0) };
};
const on = (...k) => Object.fromEntries(k.map((x) => [x, true]));
const base = await size({});
const groups = {
  'slot relocation + light-DOM patches': on('slotRelocation', 'lightDomPatches', 'slotChildNodes', 'slotCloneNode', 'slotDomMutations', 'slotTextContent', 'patchAll', 'patchChildren', 'patchClone', 'patchInsert'),
  hydrateClientSide: on('hydrateClientSide'),
  'host listeners': on('hostListener', 'hostListenerTarget', 'hostListenerTargetWindow', 'hostListenerTargetDocument', 'hostListenerTargetBody'),
  'vdom extras (functional, ref, svg, xlink, style, propOrAttrPrefix)': on('vdomFunctional', 'vdomRef', 'svg', 'vdomXlink', 'vdomStyle', 'vdomPropOrAttrPrefix'),
  'mode, scoped, shadow variants': on('mode', 'scoped', 'shadowModeClosed', 'shadowSlotAssignmentManual', 'shadowDelegatesFocus', 'shadowClonable', 'shadowSerializable'),
  'vdomSignals (signals-core)': on('vdomSignals'),
  'signalBacking': on('signalBacking'),
  'everything the default object has on': Object.fromEntries(Object.keys((await import(pathToFileURL(root + '/node_modules/@stencil/core/dist/app-data/index.js').href)).BUILD).map((k) => [k, true])),
};
console.log('folded', JSON.stringify(base));
for (const [name, flags] of Object.entries(groups)) {
  const s = await size(flags);
  console.log(`${name}\t+${s.raw - base.raw} raw\t+${s.gz - base.gz} gz`);
}
