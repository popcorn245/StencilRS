// Qwik, for comparison: the same table and cells as ../src, client-rendered (`csr`), built with
// Qwik's own optimizer. Qwik's strength, resuming server HTML without hydration, is not what
// this table measures; the DOM update cases are.
import { qwikVite } from '@builder.io/qwik/optimizer';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [qwikVite({ csr: true })],
  build: { outDir: '../dist-qwik', emptyOutDir: true },
  logLevel: 'warn',
});
