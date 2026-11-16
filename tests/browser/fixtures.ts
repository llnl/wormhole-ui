import { test as base } from '@playwright/test';
import type { GetTokenServiceConfigResponse } from '../../src/token-service-api-bodies';

export interface TestOptions {
  tokenServiceConfig: GetTokenServiceConfigResponse;
  coverage: boolean;
}

/**
 * The app loads its config before rendering anything, so every page gets a
 * mocked one. Override it with test.use({ tokenServiceConfig: ... }).
 */
export const test = base.extend<TestOptions>({
  tokenServiceConfig: [
    { token: { session_name: '_session', max_lifetime_days: 30 } },
    { option: true },
  ],
  coverage: [false, { option: true }],
  page: async ({ page, tokenServiceConfig, coverage }, use) => {
    await page.route(
      (url) => url.pathname === '/token-service/api/v1/config',
      async (route) => {
        await route.fulfill({ json: tokenServiceConfig });
      }
    );
    if (coverage) {
      await page.coverage.startJSCoverage();
    }
    await use(page);
    if (coverage && !page.isClosed()) {
      // Imported here so plain test runs don't depend on the coverage tooling.
      const { saveCoverage } = await import('./coverage');
      await saveCoverage(await page.coverage.stopJSCoverage());
    }
  },
});

export { expect } from '@playwright/test';
