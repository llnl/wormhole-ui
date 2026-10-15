import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const tokenServicePort =
    process.env.TOKEN_SERVICE_PORT || env.TOKEN_SERVICE_PORT || 5000;
  const routeRegistryPort =
    process.env.ROUTE_REGISTRY_PORT || env.ROUTE_REGISTRY_PORT || 5001;

  return {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/token-service': {
          target: `http://localhost:${tokenServicePort}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/token-service/, ''),
        },
        '/route-registry': {
          target: `http://localhost:${routeRegistryPort}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/route-registry/, ''),
        },
      },
    },
  };
});
