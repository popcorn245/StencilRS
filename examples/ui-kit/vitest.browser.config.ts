// The ui-kit specs in headless Chrome (the Chrome installed on this machine), instead of jsdom.
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

import base from './vitest.config';

export default mergeConfig(
  base,
  defineConfig({
    test: {
      browser: {
        enabled: true,
        headless: true,
        provider: playwright({ launchOptions: { channel: 'chrome' } }),
        instances: [{ browser: 'chromium' }],
      },
    },
  }),
);
