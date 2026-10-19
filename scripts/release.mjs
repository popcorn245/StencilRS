// Readies the packages for npm: every platform package at the root's version, and the root
// depending on them as optionalDependencies (npm installs only the one matching os/cpu/libc).
// The release workflow runs it after `napi artifacts`; on a tag it also checks the tag matches.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, json) => writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);

const pkg = read(`${root}package.json`);
const tag = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : undefined;
if (tag && tag !== `v${pkg.version}`) {
  console.error(`tag ${tag} does not match package.json version ${pkg.version}`);
  process.exit(1);
}

pkg.optionalDependencies = {};
for (const dir of readdirSync(`${root}npm`)) {
  const file = `${root}npm/${dir}/package.json`;
  const platformPkg = read(file);
  platformPkg.version = pkg.version;
  write(file, platformPkg);
  pkg.optionalDependencies[platformPkg.name] = pkg.version;
}
write(`${root}package.json`, pkg);
console.log(`${pkg.name}@${pkg.version} with`, Object.keys(pkg.optionalDependencies).join(', '));
