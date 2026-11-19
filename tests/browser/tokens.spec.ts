import { randomUUID } from 'node:crypto';
import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  makeToken,
  mockTokenServiceApi,
  type MockToken,
} from './token-service-fixtures';

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

    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.getByTestId('created-token-alert')).toBeHidden();
  });

  test('deletes a token', async ({ page }) => {
    const token = makeToken();
    await mockTokenServiceApi(page, [token]);
    await page.goto('/tokens');

    const row = page.getByTestId(`token-row-${token.name}`);
    await expect(row).toBeVisible();
    await row.getByTestId('delete-token-button').click();
    await page.getByTestId('confirm-delete-button').click();

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

    const names = page.getByTestId('token-name');
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

    const names = page.getByTestId('token-name');
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

test.describe('Token filters', () => {
  const day = 60 * 60 * 24;
  const nowSeconds = (): number => Math.floor(Date.now() / 1000);
  const names = (page: Page): Locator => page.getByTestId('token-name');

  // A null status means the row has no status badge.
  const expectStatuses = async (
    page: Page,
    statuses: Record<string, string | null>
  ): Promise<void> => {
    for (const [name, status] of Object.entries(statuses)) {
      const row = page.getByTestId(`token-row-${name}`);
      await expect(row).toBeVisible();
      if (status === null) {
        await expect(row.getByTestId('token-status')).toHaveCount(0);
      } else {
        await expect(row.getByTestId('token-status')).toHaveText(status);
      }
    }
  };

  const mockOneOfEach = async (page: Page): Promise<MockToken[]> => {
    const now = nowSeconds();
    return await mockTokenServiceApi(page, [
      makeToken({ name: 'token-active', iat: now - 4 * day }),
      makeToken({
        name: 'token-expiring',
        iat: now - 3 * day,
        exp: now + 3 * day,
      }),
      makeToken({
        name: 'token-pending',
        iat: now - 2 * day,
        nbf: now + 2 * day,
      }),
      makeToken({
        name: 'token-expired',
        iat: now - 30 * day,
        exp: now - day,
      }),
    ]);
  };

  // Three-digit counts, so the filters overflow a 360px screen.
  const mockManyOfEach = async (page: Page): Promise<MockToken[]> => {
    const now = nowSeconds();
    return await mockTokenServiceApi(page, [
      ...Array.from({ length: 150 }, () => makeToken({ exp: now + day })),
      ...Array.from({ length: 150 }, () =>
        makeToken({ iat: now - 2 * day, exp: now - day })
      ),
    ]);
  };

  test('shows unexpired tokens by default, with a count for each filter', async ({
    page,
  }) => {
    await mockOneOfEach(page);
    await page.goto('/tokens');

    await expect(names(page)).toHaveText([
      'token-pending',
      'token-expiring',
      'token-active',
    ]);
    await expect(page.getByTestId('filter-active')).toHaveAttribute(
      'aria-current',
      'page'
    );
    for (const [key, count] of [
      ['active', '3'],
      ['expiring-soon', '1'],
      ['expired', '1'],
      ['all', '4'],
    ]) {
      await expect(
        page.getByTestId(`filter-${key}`).getByTestId('filter-count')
      ).toHaveText(count);
    }
  });

  test('switches filters through the URL', async ({ page }) => {
    await mockOneOfEach(page);
    await page.goto('/tokens');

    await page.getByTestId('filter-expiring-soon').click();
    await expect(page).toHaveURL('/tokens?filter=expiring-soon');
    await expect(names(page)).toHaveText(['token-expiring']);

    await page.getByTestId('filter-expired').click();
    await expect(page).toHaveURL('/tokens?filter=expired');
    await expect(names(page)).toHaveText(['token-expired']);

    await page.getByTestId('filter-all').click();
    await expect(names(page)).toHaveText([
      'token-pending',
      'token-expiring',
      'token-active',
      'token-expired',
    ]);

    await page.goBack();
    await expect(page).toHaveURL('/tokens?filter=expired');
    await expect(names(page)).toHaveText(['token-expired']);
    await expect(page.getByTestId('filter-expired')).toHaveAttribute(
      'aria-current',
      'page'
    );

    await page.getByTestId('filter-active').click();
    await expect(page).toHaveURL('/tokens');
  });

  test('keeps the filter after a reload', async ({ page }) => {
    await mockOneOfEach(page);
    await page.goto('/tokens?filter=expired');
    await page.reload();

    await expect(names(page)).toHaveText(['token-expired']);
    await expect(page.getByTestId('filter-expired')).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  test('shows the default filter for an unknown filter', async ({ page }) => {
    await mockOneOfEach(page);
    await page.goto('/tokens?filter=unknown');

    await expect(names(page)).toHaveText([
      'token-pending',
      'token-expiring',
      'token-active',
    ]);
    await expect(page.getByTestId('filter-active')).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  test('sorts each filter by its own default and remembers changes', async ({
    page,
  }) => {
    const now = nowSeconds();
    await mockTokenServiceApi(page, [
      makeToken({ name: 'token-a', iat: now - day, exp: now + 2 * day }),
      makeToken({ name: 'token-b', iat: now - 2 * day, exp: now + 5 * day }),
      makeToken({ name: 'token-c', iat: now - 30 * day, exp: now - 3 * day }),
      makeToken({ name: 'token-d', iat: now - 20 * day, exp: now - day }),
    ]);
    await page.goto('/tokens');

    await expect(names(page)).toHaveText(['token-a', 'token-b']);
    await page.getByTestId('sort-by-name').click();
    await expect(names(page)).toHaveText(['token-a', 'token-b']);
    await page.getByTestId('sort-by-name').click();
    await expect(names(page)).toHaveText(['token-b', 'token-a']);

    await page.getByTestId('filter-expiring-soon').click();
    await expect(names(page)).toHaveText(['token-a', 'token-b']);
    await expect(
      page.getByRole('columnheader', { name: 'Expiration' })
    ).toHaveAttribute('aria-sort', 'ascending');

    await page.getByTestId('filter-expired').click();
    await expect(names(page)).toHaveText(['token-d', 'token-c']);
    await expect(
      page.getByRole('columnheader', { name: 'Expiration' })
    ).toHaveAttribute('aria-sort', 'descending');

    await page.getByTestId('filter-all').click();
    await expect(names(page)).toHaveText([
      'token-a',
      'token-b',
      'token-d',
      'token-c',
    ]);
    await page.getByTestId('sort-by-name').click();
    await expect(names(page)).toHaveText([
      'token-a',
      'token-b',
      'token-c',
      'token-d',
    ]);

    await page.getByTestId('filter-active').click();
    await expect(names(page)).toHaveText(['token-b', 'token-a']);
    await expect(
      page.getByRole('columnheader', { name: 'Name', exact: true })
    ).toHaveAttribute('aria-sort', 'descending');
  });

  test('applies the time boundaries to the second', async ({ page }) => {
    const now = nowSeconds();
    await page.clock.setFixedTime(now * 1000);
    await mockTokenServiceApi(page, [
      makeToken({ name: 'token-ending', exp: now + 7 * day }),
      makeToken({ name: 'token-later', exp: now + 7 * day + 1 }),
      makeToken({ name: 'token-starting', iat: now - day, nbf: now }),
      makeToken({ name: 'token-ended', exp: now }),
      // nbf only counts once it's over a minute after iat.
      makeToken({ name: 'token-skewed', iat: now + day - 60, nbf: now + day }),
      makeToken({
        name: 'token-deferred',
        iat: now + day - 61,
        nbf: now + day,
      }),
    ]);
    await page.goto('/tokens?filter=all');

    // Like the token service, a token is valid only strictly between nbf and
    // exp.
    await expectStatuses(page, {
      'token-ending': 'Expiring Soon',
      'token-later': null,
      'token-starting': 'Not Yet Valid',
      'token-ended': 'Expired',
      'token-skewed': null,
      'token-deferred': 'Not Yet Valid',
    });
  });

  test('marks only tokens that are not simply valid', async ({ page }) => {
    const now = nowSeconds();
    await mockTokenServiceApi(page, [
      makeToken({ name: 'token-active', iat: now - 4 * day }),
      makeToken({
        name: 'token-expiring',
        iat: now - 3 * day,
        exp: now + 3 * day,
      }),
      makeToken({
        name: 'token-pending',
        iat: now - 2 * day,
        nbf: now + 2 * day,
      }),
      makeToken({
        name: 'token-pending-expiring',
        iat: now - 2 * day,
        nbf: now + 2 * day,
        exp: now + 5 * day,
      }),
      makeToken({
        name: 'token-expired',
        iat: now - 30 * day,
        exp: now - day,
      }),
      makeToken({ name: 'token-forever', iat: now - 5 * day, exp: null }),
      makeToken({ name: 'token-no-iat', iat: null, nbf: now + 2 * day }),
    ]);
    await page.goto('/tokens');

    await expectStatuses(page, {
      'token-active': null,
      'token-expiring': 'Expiring Soon',
      'token-pending': 'Not Yet Valid',
      'token-pending-expiring': 'Not Yet Valid',
      'token-forever': null,
      'token-no-iat': 'Not Yet Valid',
    });
    await page.getByTestId('filter-all').click();
    await expectStatuses(page, { 'token-expired': 'Expired' });

    // Filters don't repeat the status they're named after.
    await page.getByTestId('filter-expiring-soon').click();
    await expectStatuses(page, {
      'token-expiring': null,
      'token-pending-expiring': 'Not Yet Valid',
    });
    await expect(page.getByTestId('token-row-token-forever')).toHaveCount(0);
    await page.getByTestId('filter-expired').click();
    await expect(
      page.getByRole('table', { name: 'Expired tokens' })
    ).toBeVisible();
    await expectStatuses(page, { 'token-expired': null });
  });

  test('keeps the selected filter in view on narrow screens', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await mockManyOfEach(page);
    await page.goto('/tokens?filter=all');

    await expect(page.getByTestId('filter-count').last()).toHaveText('300');
    const bar = page.getByRole('navigation', { name: 'Filter tokens' });
    expect(await bar.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
      true
    );
    await expect(page.getByTestId('filter-all')).toBeInViewport({
      ratio: 0.95,
    });
  });

  test('shows part of the next filter on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await mockManyOfEach(page);
    await page.goto('/tokens?filter=expired');

    await expect(page.getByTestId('filter-count').last()).toHaveText('300');
    await expect(page.getByTestId('filter-expired')).toBeInViewport({
      ratio: 1,
    });
    const nextTabShowing = await page
      .getByRole('navigation', { name: 'Filter tokens' })
      .evaluate((nav) => {
        const next = nav.querySelector('[data-testid="filter-all"]');
        return (
          nav.getBoundingClientRect().right -
          (next?.getBoundingClientRect().left ?? Infinity)
        );
      });
    expect(nextTabShowing).toBeGreaterThanOrEqual(20);
  });

  test('keeps the empty message within the card on narrow screens', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await mockTokenServiceApi(page, []);
    await page.goto('/tokens?filter=expiring-soon');

    await expect(page.getByTestId('empty-tokens-message')).toBeInViewport({
      ratio: 1,
    });
  });

  test('keeps the columns in place when a filter is empty', async ({
    page,
  }) => {
    await mockTokenServiceApi(page, [makeToken({ name: 'token-active' })]);
    await page.goto('/tokens');
    const issuedAt = page.getByTestId('sort-by-iat');
    await expect(names(page)).toHaveText(['token-active']);
    const withRows = await issuedAt.boundingBox();

    await page.getByTestId('filter-expired').click();
    await expect(page.getByTestId('empty-tokens-message')).toBeVisible();
    expect(await issuedAt.boundingBox()).toEqual(withRows);
  });

  test('lines the filters up with the table', async ({ page }) => {
    await mockOneOfEach(page);
    for (const width of [1280, 360]) {
      await page.setViewportSize({ width, height: 640 });
      await page.goto('/tokens');
      await expect(page.getByTestId('filter-count').first()).toHaveText('3');

      const layout = await page.evaluate(() => {
        const tab = document.querySelector('[data-testid="filter-active"]');
        if (tab === null) {
          throw new Error('Missing the Active filter');
        }
        const range = document.createRange();
        range.selectNodeContents(tab);
        const nav = document.querySelector('nav[aria-label="Filter tokens"]');
        return {
          tabLabel: range.getBoundingClientRect().left,
          selectAll:
            document
              .querySelector('[data-testid="select-all"]')
              ?.getBoundingClientRect().left ?? NaN,
          scrollInset:
            (nav?.getBoundingClientRect().left ?? NaN) -
            (nav?.parentElement?.getBoundingClientRect().left ?? NaN),
        };
      });
      expect(Math.abs(layout.tabLabel - layout.selectAll)).toBeLessThan(1);
      // Tabs that overflow scroll out at the card's edge, not inside it.
      expect(layout.scrollInset).toBe(0);
    }
  });

  test('scrolls back to a filter at the start of the row', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await mockManyOfEach(page);
    await page.goto('/tokens?filter=all');
    await expect(page.getByTestId('filter-count').last()).toHaveText('300');

    const bar = page.getByRole('navigation', { name: 'Filter tokens' });
    expect(await bar.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    // Playwright's click() would scroll the tab into view itself.
    await page.getByTestId('filter-active').dispatchEvent('click');
    await expect(page).toHaveURL('/tokens');
    await expect.poll(() => bar.evaluate((el) => el.scrollLeft)).toBe(0);
  });

  test('shortens long filter labels on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await mockOneOfEach(page);
    await page.goto('/tokens');

    const tab = page.getByTestId('filter-expiring-soon');
    await expect(tab.getByText('Expiring', { exact: true })).toBeVisible();
    await expect(tab).toHaveAccessibleName('Expiring Soon 1');
    // The full label is still there for screen readers, but takes no space.
    const fullLabel = await tab
      .getByText('Expiring Soon', { exact: true })
      .boundingBox();
    expect(fullLabel?.width).toBeLessThanOrEqual(1);
  });

  test('keeps the filters where the user scrolled them', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await mockManyOfEach(page);
    await page.goto('/tokens');
    await expect(page.getByTestId('filter-count').first()).toHaveText('150');

    const bar = page.getByRole('navigation', { name: 'Filter tokens' });
    const scrolled = await bar.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
      return el.scrollLeft;
    });
    expect(scrolled).toBeGreaterThan(0);
    await page.getByTestId('sort-by-name').click();
    await expect(
      page.getByRole('columnheader', { name: 'Name' })
    ).toHaveAttribute('aria-sort', 'ascending');
    expect(await bar.evaluate((el) => el.scrollLeft)).toBe(scrolled);
  });

  test('shows a new token as valid when the server clock is ahead', async ({
    page,
  }) => {
    // The token service stamps iat and then nbf from its own clock at
    // creation, so nbf lands just after iat.
    const serverNow = nowSeconds() + 5;
    await mockTokenServiceApi(page, [
      makeToken({ name: 'token-new', iat: serverNow, nbf: serverNow + 0.001 }),
    ]);
    await page.goto('/tokens');

    await expectStatuses(page, { 'token-new': null });
  });

  test('hides the counts and empty message until tokens load', async ({
    page,
  }) => {
    await mockTokenServiceApi(page, []);
    let release = (): void => undefined;
    const loaded = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      (url) => url.pathname === '/token-service/api/v1/token',
      async (route) => {
        await loaded;
        await route.fallback();
      }
    );
    await page.goto('/tokens');

    await expect(page.getByTestId('filter-active')).toBeVisible();
    const counts = page.getByTestId('filter-count');
    await expect(counts.filter({ visible: true })).toHaveCount(0);
    await expect(page.getByTestId('empty-tokens-message')).toBeHidden();
    // The hidden counts keep their space, so the tabs don't shift.
    const expiredTab = page.getByTestId('filter-expired');
    const beforeLoad = await expiredTab.boundingBox();

    release();
    await expect(page.getByTestId('empty-tokens-message')).toBeVisible();
    await expect(counts.filter({ visible: true })).toHaveCount(4);
    expect(await expiredTab.boundingBox()).toEqual(beforeLoad);
  });

  test('shows an error instead of counts when tokens fail to load', async ({
    page,
  }) => {
    await mockTokenServiceApi(page, []);
    await page.route(
      (url) => url.pathname === '/token-service/api/v1/token',
      (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Database unavailable' }),
        })
    );
    await page.goto('/tokens');

    await expect(page.getByRole('alert')).toHaveText(
      'Unable to load tokens: Database unavailable'
    );
    await expect(
      page.getByTestId('filter-count').filter({ visible: true })
    ).toHaveCount(0);
    await expect(page.getByTestId('empty-tokens-message')).toHaveCount(0);
  });

  test('does not add a history entry for the selected filter', async ({
    page,
  }) => {
    await mockOneOfEach(page);
    await page.goto('/tokens');
    await page.getByTestId('filter-expired').click();
    await expect(page).toHaveURL('/tokens?filter=expired');
    await page.getByTestId('filter-expired').click();

    await page.goBack();
    await expect(page).toHaveURL('/tokens');
  });

  test('shows an empty message for each filter', async ({ page }) => {
    await mockTokenServiceApi(page, [makeToken({ name: 'token-active' })]);
    await page.goto('/tokens');

    const empty = page.getByTestId('empty-tokens-message');
    await page.getByTestId('filter-expiring-soon').click();
    await expect(empty).toHaveText('Nothing expires in the next 7 days');
    await page.getByTestId('filter-expired').click();
    await expect(empty).toHaveText('No expired tokens');
    await page.getByTestId('filter-all').click();
    await expect(names(page)).toHaveText(['token-active']);
  });

  test('updates the counts after deleting a token in a filtered view', async ({
    page,
  }) => {
    const tokens = await mockOneOfEach(page);
    await page.goto('/tokens?filter=expired');

    await page.getByRole('button', { name: 'Delete token-expired' }).click();
    await page.getByTestId('confirm-delete-button').click();

    await expect(page.getByTestId('empty-tokens-message')).toHaveText(
      'No expired tokens'
    );
    await expect(
      page.getByTestId('filter-expired').getByTestId('filter-count')
    ).toHaveText('0');
    await expect(
      page.getByTestId('filter-all').getByTestId('filter-count')
    ).toHaveText('3');
    expect(tokens.map((token) => token.name)).not.toContain('token-expired');
  });

  test('returns to the default filter after creating a token', async ({
    page,
  }) => {
    await mockOneOfEach(page);
    await page.goto('/tokens');
    await page.getByTestId('filter-expired').click();
    await expect(page).toHaveURL('/tokens?filter=expired');

    await page.getByTestId('create-token-button').click();
    await page.getByTestId('token-name-input').fill('token-new');
    await page.getByTestId('submit-create-token-button').click();

    await expect(page).toHaveURL('/tokens');
    await expect(page.getByTestId('created-token-alert')).toBeVisible();
    await expect(page.getByTestId('token-row-token-new')).toBeVisible();

    // The switch replaces the filtered entry, so Back skips it.
    await page.goBack();
    await expect(page).toHaveURL('/tokens');
  });
});

test.describe('Deleting tokens', () => {
  const names = (page: Page): Locator => page.getByTestId('token-name');
  const select = (page: Page, name: string): Locator =>
    page.getByRole('checkbox', { name: `Select ${name}`, exact: true });
  const deleteSelected = (page: Page): Locator =>
    page.getByRole('button', { name: 'Delete selected tokens' });
  const dialog = (page: Page): Locator => page.getByRole('dialog');

  // Holds the first DELETE request for each of the given names until the
  // returned function is called, then lets them through or fails them.
  const holdDeletes = async (
    page: Page,
    heldNames: string[]
  ): Promise<(failure?: { status: number; detail: string }) => void> => {
    let release = (): void => undefined;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    let failure: { status: number; detail: string } | undefined;
    const held = new Set(heldNames);
    await page.route(
      (url) => url.pathname === '/token-service/api/v1/token',
      async (route) => {
        const name = new URL(route.request().url()).searchParams.get('name');
        if (route.request().method() !== 'DELETE' || !held.delete(name ?? '')) {
          await route.fallback();
          return;
        }
        await released;
        if (failure === undefined) {
          await route.fallback();
        } else {
          await route.fulfill({
            status: failure.status,
            json: { detail: failure.detail },
          });
        }
      }
    );
    return (result) => {
      failure = result;
      release();
    };
  };

  test('asks before deleting a single token', async ({ page }) => {
    const tokens = await mockTokenServiceApi(page, [
      makeToken({ name: 'token-a' }),
      makeToken({ name: 'token-b' }),
      makeToken({ name: 'token-c' }),
    ]);
    await page.goto('/tokens?filter=all');
    await page.getByTestId('sort-by-name').click();
    await expect(names(page)).toHaveText(['token-a', 'token-b', 'token-c']);

    const deleteButton = page.getByRole('button', { name: 'Delete token-a' });
    await deleteButton.click();
    await expect(dialog(page)).toHaveAccessibleName('Delete token?');
    await expect(dialog(page)).toHaveAccessibleDescription(
      'token-a will be permanently deleted.'
    );
    await expect(
      dialog(page).getByRole('button', { name: 'Cancel' })
    ).toBeFocused();

    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(deleteButton).toBeFocused();
    expect(tokens).toHaveLength(3);

    await deleteButton.click();
    await dialog(page)
      .getByRole('button', { name: 'Delete token', exact: true })
      .click();
    await expect(dialog(page)).toBeHidden();
    await expect(names(page)).toHaveText(['token-b', 'token-c']);
    await expect(page.getByRole('status')).toHaveText('Deleted token-a');
    expect(tokens.map((token) => token.name)).toEqual(['token-b', 'token-c']);
    // The next row's Delete moves up into the deleted one's place, or the
    // previous row's if it was the last.
    await expect(
      page.getByRole('button', { name: 'Delete token-b' })
    ).toBeFocused();

    await page.getByRole('button', { name: 'Delete token-c' }).click();
    await dialog(page).getByTestId('confirm-delete-button').click();
    await expect(names(page)).toHaveText(['token-b']);
    await expect(
      page.getByRole('button', { name: 'Delete token-b' })
    ).toBeFocused();
  });

  test('cancels with Escape or by clicking outside', async ({ page }) => {
    const tokens = await mockTokenServiceApi(page, [
      makeToken({ name: 'token-a' }),
    ]);
    await page.goto('/tokens');

    await page.getByRole('button', { name: 'Delete token-a' }).click();
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();

    await page.getByRole('button', { name: 'Delete token-a' }).click();
    await expect(dialog(page)).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog(page)).toBeHidden();

    await expect(names(page)).toHaveText(['token-a']);
    expect(tokens).toHaveLength(1);
  });

  test('deletes the selected tokens together', async ({ page }) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const tokens = await mockTokenServiceApi(page, [
      makeToken({ name: 'token-a', iat: nowSeconds - 30 }),
      makeToken({ name: 'token-b', iat: nowSeconds - 20 }),
      makeToken({ name: 'token-c', iat: nowSeconds - 10 }),
    ]);
    await page.goto('/tokens');

    await select(page, 'token-a').check();
    await select(page, 'token-c').check();
    const bar = page.getByTestId('selection-bar');
    await expect(bar).toContainText('2 selected');
    await expect(page.getByTestId('filter-active')).toBeHidden();

    await deleteSelected(page).click();
    await expect(dialog(page)).toHaveAccessibleName('Delete 2 tokens?');
    // In the table's order.
    await expect(
      dialog(page).getByTestId('delete-tokens-list').getByRole('listitem')
    ).toHaveText(['token-c', 'token-a']);
    await dialog(page).getByRole('button', { name: 'Delete 2 tokens' }).click();

    await expect(dialog(page)).toBeHidden();
    await expect(names(page)).toHaveText(['token-b']);
    await expect(page.getByRole('status')).toHaveText('Deleted 2 tokens');
    expect(tokens.map((token) => token.name)).toEqual(['token-b']);
    await expect(bar).toBeHidden();
    await expect(
      page.getByTestId('filter-active').getByTestId('filter-count')
    ).toHaveText('1');
    await expect(page.getByTestId('select-all')).toBeFocused();
    // Cleared, so the next delete's announcement isn't swallowed as a repeat.
    await page.getByRole('button', { name: 'Delete token-b' }).click();
    await expect(page.getByRole('status')).toBeEmpty();
  });

  test('selects all the tokens in the current filter only', async ({
    page,
  }) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const day = 60 * 60 * 24;
    const tokens = await mockTokenServiceApi(page, [
      makeToken({ name: 'token-active' }),
      makeToken({ name: 'token-old', exp: nowSeconds - 2 * day }),
      makeToken({ name: 'token-older', exp: nowSeconds - 3 * day }),
    ]);
    await page.goto('/tokens?filter=expired');

    const selectAll = page.getByRole('checkbox', {
      name: 'Select all expired tokens',
    });
    await selectAll.check();
    await expect(page.getByTestId('selection-bar')).toContainText('2 selected');
    await expect(select(page, 'token-old')).toBeChecked();
    await expect(select(page, 'token-older')).toBeChecked();

    await select(page, 'token-old').uncheck();
    await expect(page.getByTestId('selection-bar')).toContainText('1 selected');
    expect(
      await selectAll.evaluate((el) => (el as HTMLInputElement).indeterminate)
    ).toBe(true);
    await selectAll.click();
    await expect(selectAll).toBeChecked();
    expect(
      await selectAll.evaluate((el) => (el as HTMLInputElement).indeterminate)
    ).toBe(false);

    await deleteSelected(page).click();
    await dialog(page).getByRole('button', { name: 'Delete 2 tokens' }).click();
    await expect(page.getByTestId('empty-tokens-message')).toHaveText(
      'No expired tokens'
    );
    expect(tokens.map((token) => token.name)).toEqual(['token-active']);
    await expect(selectAll).toBeDisabled();
    await expect(selectAll).not.toBeChecked();
    await expect(page.getByTestId('filter-expired')).toBeFocused();
  });

  test('keeps the selection when sorting but not when the filter changes', async ({
    page,
  }) => {
    await mockTokenServiceApi(page, [
      makeToken({ name: 'token-a' }),
      makeToken({ name: 'token-b' }),
    ]);
    await page.goto('/tokens?filter=all');
    await page.getByTestId('filter-active').click();
    await expect(page).toHaveURL('/tokens');

    await select(page, 'token-a').check();
    await page.getByTestId('sort-by-name').click();
    await expect(names(page)).toHaveText(['token-a', 'token-b']);
    await expect(select(page, 'token-a')).toBeChecked();

    await page.goBack();
    await expect(page.getByRole('table', { name: 'All tokens' })).toBeVisible();
    await expect(page.getByTestId('selection-bar')).toBeHidden();
    await expect(select(page, 'token-a')).not.toBeChecked();

    await page.goForward();
    await expect(
      page.getByRole('table', { name: 'Active tokens' })
    ).toBeVisible();
    await expect(page.getByTestId('selection-bar')).toBeHidden();
    await expect(select(page, 'token-a')).not.toBeChecked();
  });

  test('clears the selection', async ({ page }) => {
    await mockTokenServiceApi(page, [makeToken({ name: 'token-a' })]);
    await page.goto('/tokens');

    await select(page, 'token-a').check();
    await page.getByRole('button', { name: 'Clear selection' }).focus();
    await page.keyboard.press('Enter');
    await expect(select(page, 'token-a')).not.toBeChecked();
    // In place of the Clear button, which went with the selection.
    await expect(page.getByTestId('filter-active')).toBeFocused();
  });

  test('shows the selection in place of the filters', async ({ page }) => {
    await mockTokenServiceApi(page, [
      makeToken({ name: 'token-a' }),
      makeToken({ name: 'token-b' }),
    ]);
    for (const width of [1280, 360]) {
      await page.setViewportSize({ width, height: 640 });
      await page.goto('/tokens');
      await expect(page.getByTestId('filter-count').first()).toHaveText('2');
      // The filters leave the accessibility tree while hidden.
      const strip = page.locator('div:has(> nav[aria-label="Filter tokens"])');
      const before = await strip.boundingBox();
      expect(before).not.toBeNull();

      await select(page, 'token-a').check();
      await expect(page.getByTestId('selection-bar')).toContainText(
        '1 selected'
      );
      expect(await strip.boundingBox()).toEqual(before);
      await expect(deleteSelected(page)).toBeInViewport({ ratio: 1 });
      const layout = await page.evaluate(() => {
        const textLeft = (selector: string): number => {
          const element = document.querySelector(selector);
          if (element === null) {
            throw new Error(`Missing ${selector}`);
          }
          const range = document.createRange();
          range.selectNodeContents(element);
          return range.getBoundingClientRect().left;
        };
        return {
          count: textLeft('[data-testid="selection-bar"] span'),
          tabLabel: textLeft('[data-testid="filter-active"]'),
        };
      });
      // The strip's content starts in the same place with or without a
      // selection.
      expect(Math.abs(layout.count - layout.tabLabel)).toBeLessThan(1);
      await expect(
        page.getByRole('button', { name: 'Clear selection' })
      ).toBeInViewport({ ratio: 1 });
    }
  });

  test('keeps the tokens that fail to delete in the dialog', async ({
    page,
  }) => {
    const tokens = await mockTokenServiceApi(page, [
      makeToken({ name: 'token-a' }),
      makeToken({ name: 'token-b' }),
    ]);
    const release = await holdDeletes(page, ['token-b']);
    await page.goto('/tokens');

    await page.getByTestId('select-all').check();
    await deleteSelected(page).click();
    await dialog(page).getByRole('button', { name: 'Delete 2 tokens' }).click();
    release({ status: 500, detail: 'Database unavailable' });

    await expect(dialog(page).getByRole('alert')).toHaveText(
      'Unable to delete 1 of 2 tokens: Database unavailable'
    );
    await expect(dialog(page)).toHaveAccessibleName('Delete token?');
    await expect(dialog(page)).toContainText(
      'token-b will be permanently deleted.'
    );
    await expect(names(page)).toHaveText(['token-b']);
    expect(tokens.map((token) => token.name)).toEqual(['token-b']);
    await expect(
      dialog(page).getByRole('button', { name: 'Cancel' })
    ).toBeFocused();

    await dialog(page)
      .getByRole('button', { name: 'Delete token', exact: true })
      .click();
    await expect(dialog(page)).toBeHidden();
    await expect(page.getByTestId('empty-tokens-message')).toBeVisible();
    expect(tokens).toHaveLength(0);
  });

  test('treats a token that is already gone as deleted', async ({ page }) => {
    await mockTokenServiceApi(page, [makeToken({ name: 'token-a' })]);
    const release = await holdDeletes(page, ['token-a']);
    await page.goto('/tokens');

    await page.getByRole('button', { name: 'Delete token-a' }).click();
    await dialog(page).getByTestId('confirm-delete-button').click();
    release({ status: 404, detail: 'Token not found' });

    await expect(dialog(page)).toBeHidden();
    await expect(page.getByTestId('empty-tokens-message')).toBeVisible();
  });

  test('disables the dialog while deleting', async ({ page }) => {
    await mockTokenServiceApi(page, [makeToken({ name: 'token-a' })]);
    const release = await holdDeletes(page, ['token-a']);
    await page.goto('/tokens');

    await page.getByRole('button', { name: 'Delete token-a' }).click();
    const cancel = dialog(page).getByRole('button', { name: 'Cancel' });
    // Hovering waits for the dialog to finish scaling in.
    await cancel.hover();
    const beforePending = await cancel.boundingBox();
    await dialog(page).getByTestId('confirm-delete-button').click();
    await expect(
      dialog(page).getByTestId('confirm-delete-button')
    ).toHaveAccessibleName('Deleting...');
    // The buttons keep their places under the pointer.
    expect(await cancel.boundingBox()).toEqual(beforePending);
    // Disabled buttons can't hold focus, so the dialog's box does. (Not the
    // dialog itself, which would get a focus ring around the whole screen.)
    await expect(page.locator('dialog [tabindex="-1"]')).toBeFocused();
    await expect(
      dialog(page).getByTestId('confirm-delete-button')
    ).toBeDisabled();
    await expect(
      dialog(page).getByRole('button', { name: 'Cancel' })
    ).toBeDisabled();
    await page.locator('dialog').evaluate((el) => {
      el.addEventListener('close', () => {
        el.dataset.closed = 'true';
      });
    });
    await page.mouse.click(5, 5);
    await page.keyboard.press('Escape');
    // Gives a close event time to arrive.
    await page.waitForTimeout(100);
    await expect(page.locator('dialog')).not.toHaveAttribute('data-closed');

    release();
    await expect(dialog(page)).toBeHidden();
    await expect(page.getByTestId('empty-tokens-message')).toBeVisible();
  });

  test('keeps the dialog open until deleting finishes', async ({ page }) => {
    await mockTokenServiceApi(page, [makeToken({ name: 'token-a' })]);
    const release = await holdDeletes(page, ['token-a']);
    await page.goto('/tokens');

    await page.getByRole('button', { name: 'Delete token-a' }).click();
    await dialog(page).getByTestId('confirm-delete-button').click();
    await expect(
      dialog(page).getByTestId('confirm-delete-button')
    ).toBeDisabled();
    // Browsers close the dialog on a repeated Escape, even while it's busy.
    await page.locator('dialog').evaluate((el) => {
      (el as HTMLDialogElement).close();
    });
    await expect(page.locator('dialog')).toHaveJSProperty('open', true);
    await expect(page.locator('dialog [tabindex="-1"]')).toBeFocused();

    release({ status: 500, detail: 'Database unavailable' });
    await expect(dialog(page).getByRole('alert')).toHaveText(
      'Unable to delete token: Database unavailable'
    );
    await expect(
      dialog(page).getByRole('button', { name: 'Cancel' })
    ).toBeFocused();
    await expect(names(page)).toHaveText(['token-a']);
  });

  test('ignores a second click on the confirm button', async ({ page }) => {
    await mockTokenServiceApi(page, [
      makeToken({ name: 'token-a' }),
      makeToken({ name: 'token-b' }),
    ]);
    const deletes: string[] = [];
    await page.route(
      (url) => url.pathname === '/token-service/api/v1/token',
      async (route) => {
        if (route.request().method() === 'DELETE') {
          deletes.push(
            new URL(route.request().url()).searchParams.get('name') ?? ''
          );
        }
        await route.fallback();
      }
    );
    await page.goto('/tokens');

    await page.getByTestId('select-all').check();
    await deleteSelected(page).click();
    await dialog(page).getByTestId('confirm-delete-button').dblclick();

    await expect(page.getByTestId('empty-tokens-message')).toBeVisible();
    expect(deletes.sort()).toEqual(['token-a', 'token-b']);
  });

  test('says when none of the tokens could be deleted', async ({ page }) => {
    await mockTokenServiceApi(page, [
      makeToken({ name: 'token-a' }),
      makeToken({ name: 'token-b' }),
    ]);
    const release = await holdDeletes(page, ['token-a', 'token-b']);
    await page.goto('/tokens');

    await page.getByTestId('select-all').check();
    await deleteSelected(page).click();
    await dialog(page).getByRole('button', { name: 'Delete 2 tokens' }).click();
    release({ status: 500, detail: 'Database unavailable' });

    await expect(dialog(page).getByRole('alert')).toHaveText(
      'Unable to delete 2 tokens: Database unavailable'
    );
    await expect(names(page)).toHaveCount(2);
  });

  test('counts checkboxes toggled in the same tick', async ({ page }) => {
    await mockTokenServiceApi(page, [
      makeToken({ name: 'token-a' }),
      makeToken({ name: 'token-b' }),
    ]);
    await page.goto('/tokens');
    await expect(select(page, 'token-a')).toBeVisible();

    // Both toggles land before a redraw.
    await page.evaluate(() => {
      for (const name of ['token-a', 'token-b']) {
        document
          .querySelector<HTMLInputElement>(`[aria-label="Select ${name}"]`)
          ?.click();
      }
    });
    await expect(page.getByTestId('selection-bar')).toContainText('2 selected');
  });

  test('keeps the dialog open when Cancel lands as a delete starts', async ({
    page,
  }) => {
    await mockTokenServiceApi(page, [
      makeToken({ name: 'token-a' }),
      makeToken({ name: 'token-b' }),
    ]);
    const release = await holdDeletes(page, ['token-a']);
    await page.goto('/tokens');

    await page.getByRole('button', { name: 'Delete token-a' }).click();
    await expect(dialog(page)).toBeVisible();
    // Both clicks land before the redraw that disables the buttons.
    await page.evaluate(() => {
      document
        .querySelector<HTMLButtonElement>(
          '[data-testid="confirm-delete-button"]'
        )
        ?.click();
      Array.from(document.querySelectorAll<HTMLButtonElement>('dialog button'))
        .find((button) => button.textContent === 'Cancel')
        ?.click();
    });
    await expect(page.locator('dialog')).toHaveJSProperty('open', true);

    release({ status: 500, detail: 'Database unavailable' });
    await expect(dialog(page).getByRole('alert')).toHaveText(
      'Unable to delete token: Database unavailable'
    );
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    // The next dialog still opens.
    await page.getByRole('button', { name: 'Delete token-b' }).click();
    await expect(dialog(page)).toContainText(
      'token-b will be permanently deleted.'
    );
  });

  test('closes the dialog when browser navigation changes the filter', async ({
    page,
  }) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    await mockTokenServiceApi(page, [
      makeToken({ name: 'token-active' }),
      makeToken({ name: 'token-old', exp: nowSeconds - 60 }),
    ]);
    await page.goto('/tokens');
    await page.getByTestId('filter-expired').click();
    await expect(names(page)).toHaveText(['token-old']);

    await page.getByRole('button', { name: 'Delete token-old' }).click();
    await expect(dialog(page)).toBeVisible();
    await page.goBack();

    await expect(names(page)).toHaveText(['token-active']);
    await expect(dialog(page)).toBeHidden();
    await expect(page.getByTestId('filter-active')).toBeFocused();
  });
});
