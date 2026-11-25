// The same tests in a real browser: the Chrome installed on this machine, headless.
// No Playwright browser download needed (channel: 'chrome').
import stencilrs from '@popcorn245/stencilrs/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [stencilrs({ signals: true })],
  test: {
    include: ['src/**/*.test.ts'],
    // *.rs.test.ts needs the stencilrs runtime: npx vitest run --config vitest.rs.config.ts.
    exclude: ['src/**/*.rs.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { channel: 'chrome' } }),
      instances: [{ browser: 'chromium' }],
    },
  },
});
