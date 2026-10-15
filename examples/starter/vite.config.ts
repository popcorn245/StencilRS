import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [stencilrs({ verbose: true })],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    // Tests that need real browser APIs (ElementInternals, ...): npm run test:browser.
    exclude: ['src/**/*.browser.test.ts'],
  },
});
