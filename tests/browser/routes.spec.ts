import { test, expect } from './fixtures';
import { makeRoute, mockRouteRegistryApi } from './route-registry-fixtures';
import { mockTokenServiceApi } from './token-service-fixtures';

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

  test('sorts routes by the clicked column', async ({ page }) => {
    await mockRouteRegistryApi(page, [
      makeRoute({ name: 'route-10', community_name: 'community-a' }),
      makeRoute({ name: 'route-1', community_name: 'community-b' }),
      makeRoute({ name: 'route-2' }),
    ]);
    await page.goto('/routes');

    const names = page.locator('[data-testid^="route-row-"] > td:first-child');
    const nameHeader = page.getByRole('columnheader', {
      name: 'Name',
      exact: true,
    });
    await expect(names).toHaveText(['route-1', 'route-2', 'route-10']);
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

    await page.getByTestId('sort-by-name').click();
    await expect(names).toHaveText(['route-10', 'route-2', 'route-1']);
    await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');

    // Routes without a community sort last in both directions.
    await page.getByTestId('sort-by-community').click();
    await expect(names).toHaveText(['route-10', 'route-1', 'route-2']);
    await expect(nameHeader).not.toHaveAttribute('aria-sort');
    await page.getByTestId('sort-by-community').click();
    await expect(names).toHaveText(['route-1', 'route-10', 'route-2']);
  });

  test('keeps the sort after switching pages', async ({ page }) => {
    await mockTokenServiceApi(page, []);
    await mockRouteRegistryApi(page, [
      makeRoute({ name: 'route-a' }),
      makeRoute({ name: 'route-b' }),
    ]);
    await page.goto('/routes');

    const names = page.locator('[data-testid^="route-row-"] > td:first-child');
    await page.getByTestId('sort-by-name').click();
    await expect(names).toHaveText(['route-b', 'route-a']);

    await page.getByRole('tab', { name: 'Tokens' }).click();
    await expect(page.getByTestId('empty-tokens-message')).toBeVisible();
    await page.getByRole('tab', { name: 'Routes' }).click();
    await expect(names).toHaveText(['route-b', 'route-a']);
  });
});
