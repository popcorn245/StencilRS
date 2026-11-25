// Page-load bench, Qwik side: server-rendered with renderToString, resumed in the browser.
import { qwikVite } from '@builder.io/qwik/optimizer';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [qwikVite({ client: { outDir: '../../dist-load-qwik/client' }, ssr: { outDir: '../../dist-load-qwik/server' } })],
  logLevel: 'warn',
});
