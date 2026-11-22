// Every chart of the site, built from the two benchmark JSON files (see charts.ts).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineLoader } from 'vitepress';

import { ionicCharts, ssrCharts, uikitCharts, type Chart } from './charts.ts';

const ionicFile = fileURLToPath(new URL('./benchmarks-ionic.json', import.meta.url));
const ssrFile = fileURLToPath(new URL('./benchmarks-ionic-ssr.json', import.meta.url));
const uikitFile = fileURLToPath(new URL('../../storybook/docs/data/benchmarks.json', import.meta.url));

export default defineLoader({
  watch: [ionicFile, ssrFile, uikitFile],
  load() {
    const io = JSON.parse(readFileSync(ionicFile, 'utf8'));
    const ui = JSON.parse(readFileSync(uikitFile, 'utf8'));
    const ionic = ionicCharts(io);
    const so = JSON.parse(readFileSync(ssrFile, 'utf8'));
    const ssr = ssrCharts(so);
    return {
      charts: { ...ionic.charts, ...ssr.charts, ...uikitCharts(ui) } as Record<string, Chart>,
      ionic: { preview: !!io.preview, runs: io.runs, meta: ionic.meta, startedAt: io.startedAt },
      ssr: { preview: !!so.preview, meta: ssr.meta },
    };
  },
});

export declare const data: {
  charts: Record<string, Chart>;
  ionic: { preview: boolean; runs: number; meta: string; startedAt: string };
  ssr: { preview: boolean; meta: string };
};
