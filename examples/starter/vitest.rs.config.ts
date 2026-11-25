// The same tests on the experimental stencilrs runtime (compiled templates, no virtual DOM).
import stencilrs from '@popcorn245/stencilrs/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [stencilrs({ runtime: 'stencilrs' })],
  test: {
    include: ['src/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { channel: 'chrome' } }),
      instances: [{ browser: 'chromium' }],
    },
  },
});
