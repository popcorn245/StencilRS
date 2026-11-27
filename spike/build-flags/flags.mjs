// node flags.mjs <repo> <srcDir> [signals]  -> flags that are on, as folded
import { pathToFileURL } from 'node:url';
const [repo, src, sig] = process.argv.slice(2);
const m = await import(pathToFileURL(repo + '/vite-fold.js').href);
const r = m.scanComponents(src, { srcDir: src });
const f = m.standaloneFlags(r.cmps, { signals: !!sig });
console.log(r.cmps.length, 'components', r.problems.length, 'problems');
console.log('ON :', Object.entries(f).filter(([, v]) => v === true).map(([k]) => k).join(' '));
