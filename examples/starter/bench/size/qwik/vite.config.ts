// Qwik has no custom-element output: the app is a Qwik component rendered client-side (`csr`), as ../../qwik.
// No shadow DOM (the style is a scoped `useStylesScoped$`). Qwik's strength, resuming server HTML, is not measured here.
import { qwikVite } from '@builder.io/qwik/optimizer';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [qwikVite({ csr: true })],
  build: { outDir: '../dist/qwik', emptyOutDir: true },
  logLevel: 'warn',
});
