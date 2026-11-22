// The pages and modes a child process renders: all of ssr-pages.mjs, or the subset bench-ssr.mjs passes in the environment.
import { MODES, PAGES } from '../ssr-pages.mjs';

const pick = (env, all) => (process.env[env] ? process.env[env].split(',') : all);
export const selectedModes = pick('SSR_BENCH_MODES', MODES);
export const selectedPages = pick('SSR_BENCH_PAGES', Object.keys(PAGES)).map((name) => [name, PAGES[name]]);
