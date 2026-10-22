import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

const isLoginPage = (url: URL): boolean =>
  url.pathname === '/token-service/auth/login';

const answerWithLoginRedirect = async (
  page: Page,
  apiPath: string
): Promise<void> => {
  await page.route(
    (url) => url.pathname === apiPath,
    async (route) => {
      await route.fulfill({
        status: 307,
        headers: { location: '/token-service/auth/login' },
      });
    }
  );
};

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(isLoginPage, async (route) => {
      await route.fulfill({ contentType: 'text/html', body: 'Login page' });
    });
  });

  test('redirects to the login page when not logged in', async ({ page }) => {
    await answerWithLoginRedirect(page, '/token-service/api/v1/config');
    await page.goto('/tokens');

    await page.waitForURL(isLoginPage);
    expect(new URL(page.url()).searchParams.get('next')).toBe(
      new URL('/tokens', page.url()).href
    );
  });

  test('redirects to the login page when the session expires', async ({
    page,
  }) => {
    await answerWithLoginRedirect(page, '/token-service/api/v1/token');
    await page.goto('/tokens');

    await page.waitForURL(isLoginPage);
    expect(new URL(page.url()).searchParams.get('next')).toBe(
      new URL('/tokens', page.url()).href
    );
  });

  test('shows an error instead of looping when login does not complete', async ({
    page,
  }) => {
    await answerWithLoginRedirect(page, '/token-service/api/v1/config');
    await page.route(isLoginPage, async (route) => {
      await route.fulfill({ status: 302, headers: { location: '/tokens' } });
    });
    await page.goto('/tokens');

    await expect(page.getByTestId('config-error')).toContainText(
      'Login did not complete'
    );
  });
});
