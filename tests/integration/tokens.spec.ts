import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

let tokenName: string;

// Runs against a real backend, not mocks. Assumes the database starts empty
// and restores that state afterwards, so it must run alone and serially.
test.describe.serial('Tokens page (live backend)', () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.get('/token-service/api/v1/token');
    expect(response.ok()).toBeTruthy();

    const tokens: unknown[] = (await response.json()) as unknown[];
    expect(
      tokens,
      'Integration tests require an empty database. Clear existing tokens before running.'
    ).toEqual([]);
  });

  test.afterEach(async ({ request }) => {
    // Best-effort: guarantees the database is empty again even if the test
    // failed partway through, before it created or deleted anything.
    await request
      .delete('/token-service/api/v1/token', {
        params: { name: tokenName },
      })
      .catch(() => undefined);
  });

  test('creates a token, lists it after reload, and deletes it', async ({
    page,
  }) => {
    tokenName = randomUUID();
    await page.goto('/tokens');

    await page.getByTestId('create-token-button').click();
    await page.getByTestId('token-name-input').fill(tokenName);
    await page.getByTestId('submit-create-token-button').click();

    await expect(page.getByTestId('created-token-alert')).toBeVisible();
    await expect(page.getByTestId(`token-row-${tokenName}`)).toBeVisible();

    // Reload to prove the token is actually persisted and listed on a fresh
    // load, not just carried over in client-side state.
    await page.reload();
    const reloadedRow = page.getByTestId(`token-row-${tokenName}`);
    await expect(reloadedRow).toBeVisible();

    await reloadedRow.getByTestId('delete-token-button').click();
    await expect(reloadedRow).toBeHidden();
  });

  test('attests a token', async ({ page }) => {
    tokenName = randomUUID();
    await page.goto('/tokens');

    await page.getByTestId('create-token-button').click();
    await page.getByTestId('token-name-input').fill(tokenName);
    await page.getByTestId('submit-create-token-button').click();
    await expect(page.getByTestId('created-token-alert')).toBeVisible();

    await page.getByTestId('attest-tokens-button').click();
    await page.getByTestId('attest-acknowledge-button').click();

    const row = page.getByTestId(`attest-token-row-${tokenName}`);
    await row.getByTestId('attest-token-keep-button').click();
    await expect(row.getByTestId('attest-token-status')).toHaveText('Kept');
  });
});
