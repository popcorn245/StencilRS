// Server-renders the stencilrs page into ../dist-load-stencilrs/index.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRenderer } from '@popcorn245/stencilrs/runtime/server';

const render = await createRenderer(() => import('../dist-load-stencilrs-server/entry-server.js'));
const body = await render('<load-app></load-app>');
const file = new URL('../dist-load-stencilrs/index.html', import.meta.url);
const html = readFileSync(file, 'utf8').replace('<!--app-->', body);
writeFileSync(file, html);
console.log(`stencilrs page: ${html.length} B`);
process.exit(0);
