import { test, expect } from '@playwright/test';
import { makeToken, mockTokenServiceApi } from './token-service-fixtures';

test.describe('Token attestation', () => {
  test('walks through the acknowledgement before listing tokens', async ({
    page,
  }) => {
    const token = makeToken();
    await mockTokenServiceApi(page, [token]);
    await page.goto('/tokens');

    await page.getByTestId('attest-tokens-button').click();
    await expect(
      page.getByRole('heading', { name: 'Token Attestation' })
    ).toBeVisible();
    await expect(
      page.getByTestId(`attest-token-row-${token.name}`)
    ).toBeHidden();

    await page.getByTestId('attest-acknowledge-button').click();
    await expect(
      page.getByTestId(`attest-token-row-${token.name}`)
    ).toBeVisible();
  });

  test('cancelling the acknowledgement does not show the token list', async ({
    page,
  }) => {
    await mockTokenServiceApi(page, [makeToken()]);
    await page.goto('/tokens');

    await page.getByTestId('attest-tokens-button').click();
    await page.getByTestId('attest-cancel-button').click();

    await expect(
      page.getByRole('heading', { name: 'Token Attestation' })
    ).toBeHidden();
  });

  test('keeping a token shows a confirmation for that token only', async ({
    page,
  }) => {
    const keepMe = makeToken();
    const leaveAlone = makeToken();
    await mockTokenServiceApi(page, [keepMe, leaveAlone]);
    await page.goto('/tokens');

    await page.getByTestId('attest-tokens-button').click();
    await page.getByTestId('attest-acknowledge-button').click();

    const row = page.getByTestId(`attest-token-row-${keepMe.name}`);
    await row.getByTestId('attest-token-keep-button').click();
    await expect(row.getByTestId('attest-token-status')).toHaveText('Kept');

    const otherRow = page.getByTestId(`attest-token-row-${leaveAlone.name}`);
    await expect(
      otherRow.getByTestId('attest-token-keep-button')
    ).toBeVisible();
    await expect(
      otherRow.getByTestId('attest-token-delete-button')
    ).toBeVisible();
  });

  test('deleting a token from the attestation screen removes it', async ({
    page,
  }) => {
    const token = makeToken();
    await mockTokenServiceApi(page, [token]);
    await page.goto('/tokens');

    await page.getByTestId('attest-tokens-button').click();
    await page.getByTestId('attest-acknowledge-button').click();

    const row = page.getByTestId(`attest-token-row-${token.name}`);
    await row.getByTestId('attest-token-delete-button').click();
    await expect(row.getByTestId('attest-token-status')).toHaveText('Deleted');

    await page.getByTestId('attest-done-button').click();
    await expect(page.getByTestId(`token-row-${token.name}`)).toBeHidden();
  });

  test('shows expired tokens as non-actionable', async ({ page }) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = makeToken({ exp: nowSeconds - 3600 });
    await mockTokenServiceApi(page, [token]);
    await page.goto('/tokens');

    await page.getByTestId('attest-tokens-button').click();
    await page.getByTestId('attest-acknowledge-button').click();

    const row = page.getByTestId(`attest-token-row-${token.name}`);
    await expect(row.getByTestId('attest-token-status')).toHaveText('Expired');
    await expect(row.getByTestId('attest-token-keep-button')).toBeHidden();
    await expect(row.getByTestId('attest-token-delete-button')).toBeHidden();
  });

  test('shows an empty message when there are no tokens to attest', async ({
    page,
  }) => {
    await mockTokenServiceApi(page, []);
    await page.goto('/tokens');

    await page.getByTestId('attest-tokens-button').click();
    await page.getByTestId('attest-acknowledge-button').click();

    await expect(page.getByTestId('attest-empty-message')).toBeVisible();
  });

  test('closing the flow refreshes the main table', async ({ page }) => {
    const token = makeToken();
    await mockTokenServiceApi(page, [token]);
    await page.goto('/tokens');

    await page.getByTestId('attest-tokens-button').click();
    await page.getByTestId('attest-acknowledge-button').click();
    await page
      .getByTestId(`attest-token-row-${token.name}`)
      .getByTestId('attest-token-keep-button')
      .click();
    await page.getByTestId('attest-done-button').click();

    await expect(
      page.getByRole('heading', { name: 'Token Attestation' })
    ).toBeHidden();
    await expect(page.getByTestId(`token-row-${token.name}`)).toBeVisible();
  });
});
