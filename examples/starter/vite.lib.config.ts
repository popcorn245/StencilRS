// Library build: dist/lib/components.js, one ES module that registers every component.
import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [stencilrs()],
  build: {
    outDir: 'dist/lib',
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'components' },
  },
});
