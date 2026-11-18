// Copies the built ui-kit Storybook (storybook/dist, built with base /storybook/) into
// site/dist/storybook/, so the site's nav link and the Storybook are served from one origin.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = fileURLToPath(new URL('../../storybook/dist', import.meta.url));
const to = fileURLToPath(new URL('../dist/storybook', import.meta.url));

if (!existsSync(from)) throw new Error(`${from} is missing: run the Storybook build first (npm run build:storybook)`);
if (!existsSync(fileURLToPath(new URL('../dist', import.meta.url)))) throw new Error('site/dist is missing: run npm run build first');
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
console.log(`copied ${from} -> ${to}`);
