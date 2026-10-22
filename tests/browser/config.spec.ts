import { test, expect } from './fixtures';
import type { UiConfigSchema } from '../../src/models/UiConfig';

test.describe('Config', () => {
  test('shows an error instead of the app when the config cannot be loaded', async ({
    page,
  }) => {
    await page.route(
      (url) => url.pathname === '/token-service/api/v1/config',
      async (route) => {
        await route.fulfill({ status: 500, json: { detail: 'Config error' } });
      }
    );
    await page.goto('/tokens');

    await expect(page.getByTestId('config-error')).toContainText(
      'Config error'
    );
    await expect(page.getByRole('tab', { name: 'Tokens' })).toBeHidden();
  });

  test('shows an error instead of the app when the UI config cannot be loaded', async ({
    page,
  }) => {
    await page.route(
      (url) => url.pathname === '/config.json',
      async (route) => {
        await route.fulfill({
          status: 500,
          json: { detail: 'UI config error' },
        });
      }
    );
    await page.goto('/tokens');

    await expect(page.getByTestId('config-error')).toContainText(
      'UI config error'
    );
    await expect(page.getByRole('tab', { name: 'Tokens' })).toBeHidden();
  });

  test('sends API requests to the service URLs from the UI config', async ({
    page,
    tokenServiceConfig,
  }) => {
    const uiConfig: UiConfigSchema = {
      tokenServiceUrl: '/custom/token-service',
      routeRegistryUrl: '/custom/route-registry',
    };
    await page.route(
      (url) => url.pathname === '/config.json',
      async (route) => {
        await route.fulfill({ json: uiConfig });
      }
    );
    const requestedPaths: string[] = [];
    await page.route(
      (url) => url.pathname.startsWith('/custom/'),
      async (route) => {
        const { pathname } = new URL(route.request().url());
        requestedPaths.push(pathname);
        await route.fulfill({
          json: pathname.endsWith('/config') ? tokenServiceConfig : [],
        });
      }
    );
    await page.goto('/routes');

    await expect(page.getByTestId('empty-routes-message')).toBeVisible();
    expect(requestedPaths).toEqual([
      '/custom/token-service/api/v1/config',
      '/custom/route-registry/api/v1/route',
    ]);
  });
});
