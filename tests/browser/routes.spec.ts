import { test, expect } from '@playwright/test';
import { makeRoute, mockRouteRegistryApi } from './route-registry-fixtures';

test.describe('Routes page', () => {
  test('shows an empty state when there are no routes', async ({ page }) => {
    await mockRouteRegistryApi(page, []);
    await page.goto('/routes');

    await expect(page.getByTestId('empty-routes-message')).toBeVisible();
  });

  test('lists existing routes', async ({ page }) => {
    const route = makeRoute();
    await mockRouteRegistryApi(page, [route]);
    await page.goto('/routes');

    const row = page.getByTestId(`route-row-${route.name}`);
    await expect(row).toBeVisible();
    await expect(
      row.getByRole('link', { name: route.src ?? '' })
    ).toHaveAttribute('href', route.src ?? '');
  });
});
