import { test, expect } from '@playwright/test';
import { mockTokenServiceApi } from './token-service-fixtures';
import { mockRouteRegistryApi } from './route-registry-fixtures';

test.describe('Navbar', () => {
  test('redirects / to the Tokens page', async ({ page }) => {
    await mockTokenServiceApi(page, []);
    await page.goto('/');

    await expect(page).toHaveURL('/tokens');
    await expect(page.getByRole('tab', { name: 'Tokens' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await expect(page.getByTestId('empty-tokens-message')).toBeVisible();
  });

  test('switches between the Tokens and Routes pages', async ({ page }) => {
    await mockTokenServiceApi(page, []);
    await mockRouteRegistryApi(page, []);
    await page.goto('/tokens');

    await expect(page.getByTestId('empty-tokens-message')).toBeVisible();

    await page.getByRole('tab', { name: 'Routes' }).click();
    await expect(page).toHaveURL('/routes');
    await expect(page.getByRole('tab', { name: 'Routes' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await expect(page.getByTestId('empty-routes-message')).toBeVisible();

    await page.getByRole('tab', { name: 'Tokens' }).click();
    await expect(page).toHaveURL('/tokens');
    await expect(page.getByRole('tab', { name: 'Tokens' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await expect(page.getByTestId('empty-tokens-message')).toBeVisible();
  });
});
