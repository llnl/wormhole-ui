import { randomUUID } from 'node:crypto';
import type { Page, Route } from '@playwright/test';
import type { components } from '../../src/token-service-api-types';
import type {
  ListTokensResponse,
  CreateTokenResponse,
} from '../../src/token-service-api-bodies';

export type MockToken = components['schemas']['Token'];

export const makeToken = (overrides: Partial<MockToken> = {}): MockToken => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    name: randomUUID(),
    id: randomUUID(),
    iat: nowSeconds,
    nbf: nowSeconds,
    exp: nowSeconds + 60 * 60 * 24 * 30,
    paths: [],
    scopes: [],
    rotatable: false,
    ...overrides,
  };
};

type EndpointHandler = (route: Route, url: URL) => Promise<void>;

/**
 * Intercepts token-service API calls with an in-memory fake so tests don't
 * need a real backend. Returns the backing array for assertions.
 *
 * Handlers are keyed by exact (path, method) rather than method alone, so
 * adding an endpoint that reuses a method already in use here (as PATCH and
 * DELETE could, for example) can't be misrouted to the wrong handler.
 */
export const mockTokenServiceApi = async (
  page: Page,
  initialTokens: MockToken[] = []
): Promise<MockToken[]> => {
  const tokens: ListTokensResponse = [...initialTokens];

  const handlers: Record<string, Partial<Record<string, EndpointHandler>>> = {
    '/token-service/api/v1/token': {
      GET: async (route) => {
        await route.fulfill({ json: tokens });
      },
      POST: async (route) => {
        const body = new URLSearchParams(route.request().postData() ?? '');
        const nowSeconds = Math.floor(Date.now() / 1000);
        const generatedId = randomUUID();
        const created = makeToken({
          name: body.get('name') ?? randomUUID(),
          id: generatedId,
          nbf: body.has('nbf') ? Number(body.get('nbf')) : nowSeconds,
          exp: body.has('exp')
            ? Number(body.get('exp'))
            : nowSeconds + 60 * 60 * 24 * 30,
        });
        tokens.push(created);
        const response: CreateTokenResponse = `${generatedId}.${randomUUID()}`;
        await route.fulfill({ json: response });
      },
      DELETE: async (route, url) => {
        const name = url.searchParams.get('name');
        const index = tokens.findIndex((token) => token.name === name);
        if (index !== -1) {
          tokens.splice(index, 1);
        }
        await route.fulfill({ status: 204, body: '' });
      },
    },
    '/token-service/api/v1/token/attestation': {
      PATCH: async (route) => {
        await route.fulfill({ status: 204, body: '' });
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

  return tokens;
};
