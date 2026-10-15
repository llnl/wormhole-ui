import type { FullConfig } from '@playwright/test';

const checkBackendReachable = async (config: FullConfig): Promise<void> => {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:5173';
  const url = `${baseURL}/token-service/api/v1/token`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`unexpected status ${String(response.status)}`);
    }
  } catch (cause) {
    throw new Error(
      `Integration tests require a real token-service backend reachable ` +
        `through the UI dev server proxy, but ${url} was not reachable. ` +
        'Start the backend first (e.g. "docker compose up").',
      { cause }
    );
  }
};

export default checkBackendReachable;
