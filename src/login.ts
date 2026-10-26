import { getUiConfig } from './config';

const REDIRECTED_AT_KEY = 'wormhole.loginRedirectedAt';
const LOOP_WINDOW_MS = 30_000;

export const redirectToLogin = (): Promise<never> => {
  const redirectedAt = Number(sessionStorage.getItem(REDIRECTED_AT_KEY));
  if (Date.now() - redirectedAt < LOOP_WINDOW_MS) {
    sessionStorage.removeItem(REDIRECTED_AT_KEY);
    throw new Error('Login did not complete. Reload the page to try again.');
  }

  sessionStorage.setItem(REDIRECTED_AT_KEY, String(Date.now()));
  window.location.assign(
    getUiConfig().loginUrl + encodeURIComponent(window.location.href)
  );
  // Never settles, so callers don't show an error while the page unloads.
  return new Promise(() => undefined);
};
