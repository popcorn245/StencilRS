// Everything the landing page, the story and the benchmarks page show as a number comes through
// here: storybook/docs/data/benchmarks.json (the one benchmark source) and site/data/stats.json.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineLoader } from 'vitepress';

const benchmarksFile = fileURLToPath(new URL('../../storybook/docs/data/benchmarks.json', import.meta.url));
const statsFile = fileURLToPath(new URL('./stats.json', import.meta.url));

const ratio = (a: number, b: number) => a / b;
const x = (n: number) => `${n >= 10 ? Math.round(n) : n.toFixed(1)}×`;
const sec = (ms: number) => `${(ms / 1000).toFixed(ms >= 10000 ? 1 : 2)} s`;

export default defineLoader({
  watch: [benchmarksFile, statsFile],
  load() {
    const bench = JSON.parse(readFileSync(benchmarksFile, 'utf8'));
    const stats = JSON.parse(readFileSync(statsFile, 'utf8'));
    const t = bench.transpile.rows;
    const v = bench.viteBuild.rows;
    const s = bench.stencilBuild.rows;
    const derived = {
      perFile: x(ratio(t[0].medianMs, t[2].medianMs)),
      perFileStencilMs: t[0].medianMs,
      perFileStencilrsMs: t[2].medianMs,
      viteBuild: x(ratio(v[0].warmMedianMs, v[1].warmMedianMs)),
      viteStencilMs: v[0].warmMedianMs,
      viteStencilrsMs: v[1].warmMedianMs,
      fullBuild: `${ratio(s[0].buildFinishedMedianMs, s[1].buildFinishedMedianMs).toFixed(2)}×`,
      coldBuildBefore: sec(stats.coldStart.build.beforeMs),
      coldBuildAfter: sec(stats.coldStart.build.afterMs),
      devBefore: sec(stats.coldStart.dev.beforeMs),
      devAfter: sec(stats.coldStart.dev.afterMs),
      coldBuildRatio: x(ratio(stats.coldStart.build.beforeMs, stats.coldStart.build.afterMs)),
      devRatio: x(ratio(stats.coldStart.dev.beforeMs, stats.coldStart.dev.afterMs)),
    };
    return { bench, stats, derived };
  },
});

export declare const data: {
  bench: any;
  stats: any;
  derived: Record<string, string | number>;
};
