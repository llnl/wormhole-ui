# Wormhole UI

## Development

Start the token service, the route registry, and their dependencies (from this directory):

```
docker compose up
```

The token-service API is then available at `http://localhost:5000` (override with
`TOKEN_SERVICE_PORT`), and the route-registry API at `http://localhost:5001` (override with
`ROUTE_REGISTRY_PORT`).

Run the UI against them:

```
npm install
npm run dev
```

The UI dev server runs at `http://localhost:5173` and proxies `/token-service` and
`/route-registry` to the backends above.

### Testing

```
npm run test
```

Playwright/Chromium tests that mock the token-service and route-registry APIs, so no backend is
needed. The mocks, models, and repositories are typed against `src/token-service-api-types.ts` and
`src/route-registry-api-types.ts`, generated from each service's OpenAPI spec via
`npm run gen:api-types` (needs both backends running). `npm run gen:token-service-api-types` and
`npm run gen:route-registry-api-types` regenerate one at a time. `npm run check:api-types` fails if
regenerating either produces a diff.

```
npm run test:integration
```

Runs the token-service flows against a real token service instead of mocks (start it first, per
above). Assumes the database is empty and restores that state afterward, so it runs alone and
serially.


## Container configuration

The image serves the UI on port 8080, configured at startup by:

| Variable                      | Default           | Description                           |
|-------------------------------|-------------------|---------------------------------------|
| `WORMHOLE_BASE_PATH`          | `/wormhole`       | Path the UI is served under           |
| `WORMHOLE_TOKEN_SERVICE_URL`  | `/token-service`  | Browser-facing token-service API URL  |
| `WORMHOLE_ROUTE_REGISTRY_URL` | `/route-registry` | Browser-facing route-registry API URL |

Values can't contain quotes. `/health` is served at the root regardless of the base path.
With a read-only root filesystem, `/etc/nginx/conf.d` must be writable.

## Governance

Contributions are welcome. Contributors should look in `CONTRIBUTING.md` for project guidelines on how to create and structure pull requests.

This project is licensed under the Apache 2.0 license with LLVM exception. The full license text is available in `LICENSE`.

LLNL-CODE-2020712
