import { randomUUID } from 'node:crypto';
import type { Page, Route } from '@playwright/test';
import type { components } from '../../src/route-registry-api-types';
import type { ListRoutesResponse } from '../../src/route-registry-api-bodies';

export type MockRoute = components['schemas']['Route'];

export const makeRoute = (overrides: Partial<MockRoute> = {}): MockRoute => ({
  name: randomUUID(),
  id: randomUUID(),
  src: randomUUID(),
  dst: randomUUID(),
  community_name: null,
  rules: {
    allowed: { users: [], groups: [] },
    disallowed: { users: [], groups: [] },
  },
  ...overrides,
});

type EndpointHandler = (route: Route, url: URL) => Promise<void>;

/**
 * Intercepts route-registry API calls with an in-memory fake so tests don't
 * need a real backend. Returns the backing array for assertions.
 *
 * Handlers are keyed by exact (path, method) rather than method alone, so
 * adding an endpoint that reuses a method already in use here can't be
 * misrouted to the wrong handler.
 */
export const mockRouteRegistryApi = async (
  page: Page,
  initialRoutes: MockRoute[] = []
): Promise<MockRoute[]> => {
  const routes: ListRoutesResponse = [...initialRoutes];

  const handlers: Record<string, Partial<Record<string, EndpointHandler>>> = {
    '/route-registry/api/v1/route': {
      GET: async (route) => {
        await route.fulfill({ json: routes });
      },
    },
  };

  await page.route(
    (url) => url.pathname in handlers,
    async (route) => {
      const url = new URL(route.request().url());
      const handler = handlers[url.pathname][route.request().method()];
      if (!handler) {
        await route.continue();
        return;
      }
      await handler(route, url);
    }
  );

  return routes;
};
