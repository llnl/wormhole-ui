import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures';
import { makeToken, mockTokenServiceApi } from './token-service-fixtures';

test.describe('Tokens page', () => {
  test('shows an empty state when there are no tokens', async ({ page }) => {
    await mockTokenServiceApi(page, []);
    await page.goto('/tokens');

    await expect(page.getByTestId('empty-tokens-message')).toBeVisible();
  });

  test('lists existing tokens', async ({ page }) => {
    const token = makeToken();
    await mockTokenServiceApi(page, [token]);
    await page.goto('/tokens');

    await expect(page.getByTestId(`token-row-${token.name}`)).toBeVisible();
  });

  test('hides the session token', async ({ page }) => {
    const token = makeToken();
    await mockTokenServiceApi(page, [makeToken({ name: '_session' }), token]);
    await page.goto('/tokens');

    await expect(page.getByTestId(`token-row-${token.name}`)).toBeVisible();
    await expect(page.getByTestId('token-row-_session')).toBeHidden();
  });

  test.describe('with a non-default session token name', () => {
    test.use({
      tokenServiceConfig: {
        token: { session_name: 'custom-session', max_lifetime_days: 30 },
      },
    });

    test('hides the token with the configured name', async ({ page }) => {
      await mockTokenServiceApi(page, [
        makeToken({ name: 'custom-session' }),
        makeToken({ name: '_session' }),
      ]);
      await page.goto('/tokens');

      await expect(page.getByTestId('token-row-_session')).toBeVisible();
      await expect(page.getByTestId('token-row-custom-session')).toBeHidden();
    });
  });

  test('creates a new token and shows the one-time secret', async ({
    page,
  }) => {
    const name = randomUUID();
    await mockTokenServiceApi(page, []);
    await page.goto('/tokens');

    await page.getByTestId('create-token-button').click();
    await page.getByTestId('token-name-input').fill(name);
    await page.getByTestId('submit-create-token-button').click();

    await expect(page.getByTestId('created-token-alert')).toBeVisible();
    await expect(page.getByTestId(`token-row-${name}`)).toBeVisible();
  });

  test('deletes a token', async ({ page }) => {
    const token = makeToken();
    await mockTokenServiceApi(page, [token]);
    await page.goto('/tokens');

    const row = page.getByTestId(`token-row-${token.name}`);
    await expect(row).toBeVisible();
    await row.getByTestId('delete-token-button').click();

    await expect(page.getByTestId('empty-tokens-message')).toBeVisible();
  });

  test('sorts tokens by creation date, then by the clicked column', async ({
    page,
  }) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const day = 60 * 60 * 24;
    await mockTokenServiceApi(page, [
      makeToken({
        name: 'token-a',
        iat: nowSeconds - day,
        exp: nowSeconds + 3 * day,
      }),
      makeToken({ name: 'token-b', iat: nowSeconds - 3 * day, exp: null }),
      makeToken({
        name: 'token-c',
        iat: nowSeconds - 2 * day,
        exp: nowSeconds + day,
      }),
    ]);
    await page.goto('/tokens');

    const names = page.locator('[data-testid^="token-row-"] > td:first-child');
    await expect(names).toHaveText(['token-a', 'token-c', 'token-b']);
    await expect(
      page.getByRole('columnheader', { name: 'Issued At' })
    ).toHaveAttribute('aria-sort', 'descending');

    // Tokens without an expiration sort last in both directions.
    await page.getByTestId('sort-by-exp').click();
    await expect(names).toHaveText(['token-c', 'token-a', 'token-b']);
    await expect(
      page.getByRole('columnheader', { name: 'Expiration' })
    ).toHaveAttribute('aria-sort', 'ascending');
    await page.getByTestId('sort-by-exp').click();
    await expect(names).toHaveText(['token-a', 'token-c', 'token-b']);
  });

  test('keeps the sort after creating a token', async ({ page }) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    await mockTokenServiceApi(page, [
      makeToken({ name: 'token-a', iat: nowSeconds - 120 }),
      makeToken({ name: 'token-c', iat: nowSeconds - 60 }),
    ]);
    await page.goto('/tokens');

    const names = page.locator('[data-testid^="token-row-"] > td:first-child');
    await expect(names).toHaveText(['token-c', 'token-a']);
    await page.getByTestId('sort-by-name').click();
    await expect(names).toHaveText(['token-a', 'token-c']);

    await page.getByTestId('create-token-button').click();
    await page.getByTestId('token-name-input').fill('token-b');
    await page.getByTestId('submit-create-token-button').click();

    await expect(page.getByTestId('created-token-alert')).toBeVisible();
    await expect(names).toHaveText(['token-a', 'token-b', 'token-c']);
  });
});
