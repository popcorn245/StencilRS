import { Config } from '@stencil/core';
import { join } from 'node:path';

import { config as base } from './stencil.config';

// The ui-kit's real config (stencil.config.ts: loader-bundle, standalone, www, docs-json),
// unchanged except where each output lands, so bench-stencil-build.mjs can keep the stock and
// patched outputs apart: every target's `dir` (docs-json: `file`) goes under BENCH_OUT_DIR.
// tsconfig.bench.json leaves out the stories, whose Storybook imports aren't installed here.
const out = process.env.BENCH_OUT_DIR ?? '.bench/out/full';

export const config: Config = {
  ...base,
  tsconfig: 'tsconfig.bench.json',
  outputTargets: (base.outputTargets ?? []).map((t: any) =>
    t.type === 'docs-json' ? { ...t, file: join(out, 'custom-elements.json') } : { ...t, dir: join(out, t.type) },
  ),
};
