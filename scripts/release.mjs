// Readies the packages for npm at the version semantic-release picked (its prepare step runs
// `node scripts/release.mjs <version>`): every platform package at that version, and the root
// depending on them as optionalDependencies (npm installs only the one matching os/cpu/libc).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, json) => writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version ?? '')) {
  console.error(`usage: node scripts/release.mjs <version> (got ${version})`);
  process.exit(1);
}

const pkg = read(`${root}package.json`);
pkg.version = version;
pkg.optionalDependencies = {};
for (const dir of readdirSync(`${root}npm`)) {
  const file = `${root}npm/${dir}/package.json`;
  const platformPkg = read(file);
  platformPkg.version = version;
  write(file, platformPkg);
  pkg.optionalDependencies[platformPkg.name] = version;
}
write(`${root}package.json`, pkg);
console.log(`${pkg.name}@${version} with`, Object.keys(pkg.optionalDependencies).join(', '));
