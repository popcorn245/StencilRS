// Builds the islands fixture once per test file: the hydrate app with the `idBase` patch (default), the same without it (the
// baseline Stencil's own runner gives), and the client bundle.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildClient, buildHydrateApp } from './build.mjs';

export const buildFixture = async ({ client = false } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'stencilrs-islands-'));
  const [withIdBase, plain, clientFile] = await Promise.all([
    buildHydrateApp(join(dir, 'hydrate')),
    buildHydrateApp(join(dir, 'hydrate-plain'), { runtimePatches: { idBase: false } }),
    client ? buildClient(join(dir, 'client')) : null,
  ]);
  return { dir, hydrate: withIdBase.file, plain: plain.file, client: clientFile && join(dir, 'client') };
};
