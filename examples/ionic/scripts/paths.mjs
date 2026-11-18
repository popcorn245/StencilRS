import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
export const IONIC_REPO = 'https://github.com/ionic-team/ionic-framework.git';
export const IONIC_TAG = 'v9.0.12';
