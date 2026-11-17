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
        const textLeft = (selector: string): number => {
          const element = document.querySelector(selector);
          if (element === null) {
            throw new Error(`Missing ${selector}`);
          }
          const range = document.createRange();
          range.selectNodeContents(element);
          return range.getBoundingClientRect().left;
        };
        const nav = document.querySelector('nav[aria-label="Filter tokens"]');
        return {
          tabLabel: textLeft('[data-testid="filter-active"]'),
          nameHeader: textLeft('[data-testid="sort-by-name"]'),
          scrollInset:
            (nav?.getBoundingClientRect().left ?? NaN) -
            (nav?.parentElement?.getBoundingClientRect().left ?? NaN),
        };
      });
      expect(Math.abs(layout.tabLabel - layout.nameHeader)).toBeLessThan(1);
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
