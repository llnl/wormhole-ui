import { defineConfig } from '@playwright/test';
import type { TestOptions } from './tests/browser/fixtures';
import config from './playwright.config';

export default defineConfig<TestOptions>(config, {
  globalSetup: './tests/browser/global-setup.ts',
  globalTeardown: './tests/browser/global-teardown.ts',
  use: { coverage: true },
});
