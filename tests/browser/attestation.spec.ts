import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { makeToken, mockTokenServiceApi } from './token-service-fixtures';

// Register after mockTokenServiceApi: the last route wins, and the rest
// fall back to the mock.
const failNextRequest = async (
  page: Page,
  method: string,
  pathname: string
): Promise<void> => {
  let failed = false;
  await page.route(
    (url) => url.pathname === pathname,
    async (route) => {
      if (failed || route.request().method() !== method) {
        await route.fallback();
        return;
      }
      failed = true;
      await route.fulfill({
        status: 500,
        json: { detail: 'Database unavailable' },
      });
    }
  );
};

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

  test('shows the error when keeping a token fails, until it succeeds', async ({
    page,
  }) => {
    const token = makeToken();
    await mockTokenServiceApi(page, [token]);
    await failNextRequest(
      page,
      'PATCH',
      '/token-service/api/v1/token/attestation'
    );
    await page.goto('/tokens');

    await page.getByTestId('attest-tokens-button').click();
    await page.getByTestId('attest-acknowledge-button').click();
    const row = page.getByTestId(`attest-token-row-${token.name}`);
    const keep = row.getByTestId('attest-token-keep-button');
    await keep.click();

    const error = row.getByText('Database unavailable');
    await expect(error).toBeVisible();
    await expect(row.getByTestId('attest-token-status')).toHaveCount(0);
    await expect(keep).toBeEnabled();

    await keep.click();
    await expect(row.getByTestId('attest-token-status')).toHaveText('Kept');
    await expect(error).toHaveCount(0);
  });

  test('shows the error when deleting a token fails, until it succeeds', async ({
    page,
  }) => {
    const token = makeToken();
    await mockTokenServiceApi(page, [token]);
    await failNextRequest(page, 'DELETE', '/token-service/api/v1/token');
    await page.goto('/tokens');

    await page.getByTestId('attest-tokens-button').click();
    await page.getByTestId('attest-acknowledge-button').click();
    const row = page.getByTestId(`attest-token-row-${token.name}`);
    const remove = row.getByTestId('attest-token-delete-button');
    await remove.click();

    const error = row.getByText('Database unavailable');
    await expect(error).toBeVisible();
    await expect(row.getByTestId('attest-token-status')).toHaveCount(0);
    await expect(remove).toBeEnabled();

    await remove.click();
    await expect(row.getByTestId('attest-token-status')).toHaveText('Deleted');
    await expect(error).toHaveCount(0);
  });

  test('does not offer the session token for attestation', async ({ page }) => {
    const token = makeToken();
    await mockTokenServiceApi(page, [makeToken({ name: '_session' }), token]);
    await page.goto('/tokens');

    await page.getByTestId('attest-tokens-button').click();
    await page.getByTestId('attest-acknowledge-button').click();

    await expect(
      page.getByTestId(`attest-token-row-${token.name}`)
    ).toBeVisible();
    await expect(page.getByTestId('attest-token-row-_session')).toBeHidden();
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

  test('shows not-yet-valid tokens as non-actionable', async ({ page }) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = makeToken({
      iat: nowSeconds - 3600,
      nbf: nowSeconds + 3600,
    });
    await mockTokenServiceApi(page, [token]);
    await page.goto('/tokens');

    await page.getByTestId('attest-tokens-button').click();
    await page.getByTestId('attest-acknowledge-button').click();

    const row = page.getByTestId(`attest-token-row-${token.name}`);
    await expect(row.getByTestId('attest-token-status')).toHaveText(
      'Not Yet Valid'
    );
    await expect(row.getByTestId('attest-token-keep-button')).toBeHidden();
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

  test.describe('with a non-default token lifetime', () => {
    test.use({
      tokenServiceConfig: {
        token: { session_name: '_session', max_lifetime_days: 45 },
      },
    });

    test('states the attestation interval from the token-service config', async ({
      page,
    }) => {
      await mockTokenServiceApi(page, []);
      await page.goto('/tokens');

      await page.getByTestId('attest-tokens-button').click();
      await expect(page.getByText('once every 45 days')).toBeVisible();
    });
  });
});
