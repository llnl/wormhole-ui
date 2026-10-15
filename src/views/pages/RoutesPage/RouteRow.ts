import m from 'mithril';
import type { Route } from '../../../models/Route';

interface RouteRowAttrs {
  route: Route;
}

const RouteRow: m.Component<RouteRowAttrs> = {
  view: ({ attrs }) =>
    m('tr', { 'data-testid': `route-row-${attrs.route.name}` }, [
      m('td', attrs.route.name),
      m(
        'td',
        { class: 'tw:whitespace-nowrap' },
        attrs.route.src
          ? m(
              'a',
              {
                href: attrs.route.src,
                target: '_blank',
                rel: 'noopener noreferrer',
                class: 'tw:d-link tw:d-link-hover',
              },
              attrs.route.src
            )
          : 'N/A'
      ),
      m('td', { class: 'tw:whitespace-nowrap' }, attrs.route.dst ?? 'N/A'),
      m(
        'td',
        { class: 'tw:whitespace-nowrap' },
        attrs.route.communityName ?? 'N/A'
      ),
    ]),
};

export default RouteRow;
