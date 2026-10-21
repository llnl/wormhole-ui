import { test, expect } from './fixtures';

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
});
