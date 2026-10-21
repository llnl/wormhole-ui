import { test as base } from '@playwright/test';
import type { GetTokenServiceConfigResponse } from '../../src/token-service-api-bodies';

interface ConfigOptions {
  tokenServiceConfig: GetTokenServiceConfigResponse;
}

/**
 * The app loads its config before rendering anything, so every page gets a
 * mocked one. Override it with test.use({ tokenServiceConfig: ... }).
 */
export const test = base.extend<ConfigOptions>({
  tokenServiceConfig: [{ token: { max_lifetime_days: 30 } }, { option: true }],
  page: async ({ page, tokenServiceConfig }, use) => {
    await page.route(
      (url) => url.pathname === '/token-service/api/v1/config',
      async (route) => {
        await route.fulfill({ json: tokenServiceConfig });
      }
    );
    await use(page);
  },
});

export { expect } from '@playwright/test';
