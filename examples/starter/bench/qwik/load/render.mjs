// Writes the server-rendered Qwik page to ../../dist-load-qwik/client/index.html.
import { writeFileSync } from 'node:fs';
const { default: render } = await import('../../dist-load-qwik/server/entry.ssr.js');
const { html } = await render({ base: '/build/' });
writeFileSync(new URL('../../dist-load-qwik/client/index.html', import.meta.url), html);
console.log(`qwik page: ${html.length} B`);
