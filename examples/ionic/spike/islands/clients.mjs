// The two hydrating clients the checks can use (`ISLANDS_CLIENT=stencil|hydrate`, default stencil):
//   stencil   Stencil's own lazy-loader client built with `stencil build --dev` (the spike's `dist-client`, see docs/spike-islands.md)
//   hydrate   the production client of the Vite plugin's `hydrateClient` build (per-tag modules, `dist-hydrate-client`)
import { join } from 'node:path';

import { HYDRATING_DIR, bootScript } from './hydrating-client.mjs';
import { CLIENT_DIR } from './lib.mjs';

export const CLIENTS = {
  stencil: { name: 'stencil', dir: CLIENT_DIR, boot: "import '/client/dist/ionic/ionic.esm.js';" },
  hydrate: { name: 'hydrate', dir: HYDRATING_DIR, boot: bootScript('/client/') },
};
export const client = CLIENTS[process.env.ISLANDS_CLIENT ?? 'stencil'];
export { join };
