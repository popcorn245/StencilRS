// Chart specs, built from the benchmark JSON and nothing else: storybook/docs/data/benchmarks.json (the
// ui-kit) and site/data/benchmarks-ionic.json (Ionic). BenchChart.vue draws them as inline SVG at build time;
// scripts/snapshots.mjs photographs the result. Change a number in the JSON and every chart follows.

export type Compiler = 'stencilrs' | 'stencil5' | 'stencil4';
export type Display = 's' | 'ms' | 'MiB';

export interface Bar {
  id: Compiler;
  /** Short name, drawn on the chart. */
  label: string;
  /** What the row measured, for the table. */
  full: string;
  median: number;
  min?: number;
  max?: number;
  n?: number;
}

export interface Chart {
  id: string;
  title: string;
  /** How the values are written; they are stored in milliseconds (or MiB). */
  display: Display;
  bars: Bar[];
  /** One sentence, the message of the chart. */
  headline: string;
  what: string;
  /** "Preview" and the like; shown as a badge under the chart. */
  status?: string;
  /** The machine and the run, one line. */
  meta: string;
  /** A slot key in the page for an honest note (a row where stencilrs is slower). */
  note?: 'watch-rebuild';
}

const SHORT: Record<Compiler, string> = { stencilrs: 'stencilrs', stencil5: 'Stencil 5', stencil4: 'Stencil 4' };
export const compilerName = (id: Compiler) => SHORT[id];

const num = (v: number) => v.toLocaleString('en-US');

export function format(display: Display, v: number): string {
  if (display === 's') {
    const s = v / 1000;
    return `${s >= 10 ? s.toFixed(1) : s.toFixed(2)} s`;
  }
  if (display === 'ms') {
    if (v < 1) return `${v.toFixed(2)} ms`;
    if (v < 100) return `${v.toFixed(1)} ms`;
    return `${num(Math.round(v))} ms`;
  }
  return `${num(Math.round(v))} MiB`;
}

const times = (n: number) => `${n >= 10 ? Math.round(n) : n.toFixed(1)}×`;

/** "stencilrs is 5.7× faster than Stencil 5", or, honestly, "5.8× slower". */
function headline(bars: Bar[], kind: 'time' | 'memory', against: Compiler): string {
  const a = bars.find((b) => b.id === 'stencilrs');
  const b = bars.find((x) => x.id === against);
  if (!a || !b) return '';
  const r = b.median / a.median;
  const [better, worse] = kind === 'time' ? ['faster', 'slower'] : ['less memory', 'more memory'];
  if (Math.abs(r - 1) < 0.05) return `stencilrs and ${SHORT[against]} are level`;
  return r >= 1 ? `stencilrs: ${times(r)} ${better} than ${SHORT[against]}` : `stencilrs: ${times(1 / r)} ${worse} than ${SHORT[against]}`;
}

const cleanCpu = (s: string) => s.replace(/\(R\)|\(TM\)/g, '').replace(/\s+/g, ' ').replace(/ Processor/, '').trim();

export function ionicCharts(io: any): { charts: Record<string, Chart>; meta: string; status: string } {
  const ids: Compiler[] = ['stencilrs', 'stencil5', 'stencil4'];
  const rowKey: Record<Compiler, string> = { stencilrs: 'stencilrs', stencil5: 'stencil', stencil4: 'stencil4' };
  const m = io.machine;
  const meta = `Measured on ${m.description}; ${cleanCpu(m.cpu)}, ${m.logicalCores} logical cores, ${m.ramGiB} GB; median of ${io.runs} runs`;
  const status = io.preview ? 'Preview' : '';

  const make = (id: string, metric: string, title: string, display: Display, opts: { div?: number; kind?: 'time' | 'memory'; note?: Chart['note']; what?: string } = {}): Chart => {
    const mm = io.metrics[metric];
    const div = opts.div ?? 1;
    const bars: Bar[] = ids
      .filter((c) => mm.rows[rowKey[c]])
      .map((c) => {
        const r = mm.rows[rowKey[c]];
        return { id: c, label: SHORT[c], full: io.rows[rowKey[c]], median: r.median / div, min: r.min / div, max: r.max / div, n: r.n };
      });
    return {
      id, title, display, bars,
      headline: headline(bars, opts.kind ?? 'time', 'stencil5'),
      what: opts.what ?? mm.what,
      status, meta, note: opts.note,
    };
  };

  const files = io.metrics.transpileCold.corpus.stencilrs.files as number;
  const charts: Record<string, Chart> = {};
  const add = (c: Chart) => (charts[c.id] = c);
  add(make('ionic-cold-build', 'coldBuild', 'Cold build', 's', { what: 'Ionic core, fresh process, build caches removed first. The Stencil rows include the Sass step for css/.' }));
  add(make('ionic-warm-build', 'warmBuild', 'Warm rebuild', 's', { what: 'The same command again with every cache kept. No tool here has an incremental build between processes, so this is "run it again".' }));
  add(make('ionic-dev-start', 'devStart', 'Dev server start', 's', { what: 'Fresh process until the compiled ion-button module answers HTTP 200. Vite compiles on request; Stencil builds everything before it serves.' }));
  add(make('ionic-edit-rebuild', 'editRebuild', 'Watch rebuild after one edit', 's', { note: 'watch-rebuild', what: 'One line added to button.tsx while watching, until the rebuild has finished. Stencil: the dev server process; stencilrs: vite build --watch.' }));
  add(make('ionic-transpile-cold', 'transpileCold', `Compile all ${files} components, cold pass`, 'ms', { what: 'First pass over every @Component file in a fresh process, source maps on. The compiler alone, one thread.' }));
  add(make('ionic-transpile-warm', 'transpileWarm', `Compile all ${files} components, warm pass`, 'ms', { what: 'Median of the passes after the first, same process. The compiler alone, one thread.' }));
  add(make('ionic-peak-rss', 'peakRss', 'Peak memory, cold build', 'MiB', { kind: 'memory', what: 'Resident memory of the whole process tree, build workers included, sampled every 250 ms.' }));
  add(make('ionic-dev-rss', 'devPeakRss', 'Peak memory, dev server', 'MiB', { kind: 'memory', what: 'Resident memory of the dev server process tree, from start through the edit.' }));
  // The home page and the social card: the same data, per file.
  add(make('ionic-per-file', 'transpileWarm', 'Transform one component file', 'ms', { div: files, what: `The warm pass over all ${files} component files, divided by ${files}.` }));
  return { charts, meta, status };
}

export function uikitCharts(b: any): Record<string, Chart> {
  const meta = `${b.machine}; measured ${b.date}`;
  const t = b.transpile.rows;
  const v = b.viteBuild.rows;
  const s = b.stencilBuild.rows;
  const bar = (id: Compiler, full: string, median: number, extra: Partial<Bar> = {}): Bar => ({ id, label: SHORT[id], full, median, ...extra });
  const mk = (id: string, title: string, display: Display, bars: Bar[], what: string, cold?: any): Chart => ({
    id, title, display, bars, what, headline: headline(bars, 'time', 'stencil5'),
    // Cold rows carry their own machine (and the preview flag) because they can be measured apart from the warm ones.
    meta: cold ? `${cold.machine}; measured ${cold.date}; median of ${cold.runs} runs` : meta,
    ...(cold?.preview ? { status: 'Preview' } : {}),
  });
  const charts: Record<string, Chart> = {
    'uikit-transpile': mk('uikit-transpile', 'Compile one file', 'ms',
      [bar('stencilrs', t[2].compiler, t[2].perFileUs / 1000), bar('stencil5', t[0].compiler, t[0].perFileUs / 1000)],
      `${b.transpile.files} files (${b.transpile.kib} KiB) of the ui-kit, one process, single-threaded, source maps on; per-file mean of the median run.`),
    'uikit-vite-build': mk('uikit-vite-build', 'Production build with Vite', 's',
      [bar('stencilrs', v[1].compiler, v[1].warmMedianMs), bar('stencil5', v[0].compiler, v[0].warmMedianMs)],
      `All ${b.viteBuild.components} ui-kit components as one library, warm median; only the component compiler changes.`),
    'uikit-stencil-build': mk('uikit-stencil-build', 'Full stencil build', 's',
      [bar('stencilrs', s[1].compiler, s[1].buildFinishedMedianMs), bar('stencil5', s[0].compiler, s[0].buildFinishedMedianMs)],
      'Stencil v5 CLI and config for both rows; stencilrs replaces only the per-bundle component transform. Build finished, median of 5.'),
  };
  const coldBars = (e: any, field: string, spread: string) =>
    e.rows.map((r: any, i: number) => bar(i === 0 ? 'stencilrs' : 'stencil5', r.compiler, r[field], { min: r[spread][0], max: r[spread][1], n: e.runs }));
  if (b.coldBuild) {
    charts['uikit-cold-build'] = mk('uikit-cold-build', 'Cold build: a fresh vite build', 's', coldBars(b.coldBuild, 'wallMedianMs', 'wallSpreadMs'),
      'A new node process builds all the ui-kit components as one library; loading Vite and the compiler is inside the time (TypeScript for Stencil, the native module for stencilrs).', b.coldBuild);
  }
  if (b.coldDev) {
    charts['uikit-cold-dev'] = mk('uikit-cold-dev', 'Cold dev server: first response', 'ms', coldBars(b.coldDev, 'firstResponseMedianMs', 'firstResponseSpreadMs'),
      'A new node process starts the Vite dev server and asks for one component module, until the 200 arrives; module load is inside the time.', b.coldDev);
  }
  return charts;
}
