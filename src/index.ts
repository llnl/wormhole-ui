import './styles/index.css';
import m from 'mithril';
import TokensPage from './views/pages/TokensPage';
import RoutesPage from './views/pages/RoutesPage';
import Root from './views/Root';

const root = document.getElementById('app');

if (root === null) {
  throw new Error('Unable to find the application root element.');
}

// Use plain paths (e.g. /routes) instead of Mithril's default hashbang
// (#!/routes) style routing.
m.route.prefix = '';

// Any unmatched path, including /, falls back to the default route /tokens.
m.route(root, '/tokens', {
  '/tokens': { render: () => m(Root, m(TokensPage)) },
  '/routes': { render: () => m(Root, m(RoutesPage)) },
});
