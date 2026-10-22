import './styles/index.css';
import m from 'mithril';
import { loadConfig } from './config';
import TokensPage from './views/pages/TokensPage';
import RoutesPage from './views/pages/RoutesPage';
import Root from './views/Root';

const root = document.getElementById('app');

if (root === null) {
  throw new Error('Unable to find the application root element.');
}

try {
  await loadConfig();
} catch (error: unknown) {
  // Not wrapped in Root: its Header reads m.route, which isn't set up yet.
  m.render(
    root,
    m(
      'div',
      { class: 'tw:p-4' },
      m(
        'div',
        { class: 'tw:d-alert tw:d-alert-error', 'data-testid': 'config-error' },
        `Unable to load configuration: ${
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.'
        }`
      )
    )
  );
  throw error;
}

// Use plain paths (e.g. /routes) instead of Mithril's default hashbang
// (#!/routes) style routing.
m.route.prefix = new URL(document.baseURI).pathname.replace(/\/$/, '');

// Any unmatched path, including /, falls back to the default route /tokens.
m.route(root, '/tokens', {
  '/tokens': { render: () => m(Root, m(TokensPage)) },
  '/routes': { render: () => m(Root, m(RoutesPage)) },
});
