// Compiles solid-page.jsx for the server (babel-preset-solid, generate: 'ssr', hydratable) into dist/solid-page.mjs.
import { transformSync } from '@babel/core';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('./solid-page.jsx', import.meta.url), 'utf8');
const { code } = transformSync(src, { filename: 'solid-page.jsx', babelrc: false, configFile: false, presets: [['babel-preset-solid', { generate: 'ssr', hydratable: true }]] });
mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/solid-page.mjs', import.meta.url), code.replace("'./items.mjs'", "'../items.mjs'"));
console.log('solid-page compiled', code.length, 'B');
