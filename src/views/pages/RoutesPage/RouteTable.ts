import m from 'mithril';
import { RouteRepository } from '../../../repositories/RouteRepository';
import type { Route } from '../../../models/Route';
import RouteRow from './RouteRow';

const routeRepo: RouteRepository = new RouteRepository();

interface RouteTableState {
  routes: Route[];
}

const RouteTable: m.Component<Record<string, never>, RouteTableState> = {
  oninit: ({ state }) => {
    state.routes = [];
    void routeRepo.getAllRoutes().then((routes) => {
      state.routes = routes;
    });
  },
  view: ({ state }) => {
    const routes: Route[] = state.routes;
    return m('div', { class: 'tw:overflow-x-auto' }, [
      m('table', { class: 'tw:d-table tw:w-full tw:border' }, [
        m('thead', [
          m('tr', [
            m('th', { class: 'tw:w-full' }, 'Name'),
            m('th', { class: 'tw:whitespace-nowrap' }, 'Public URL'),
            m('th', { class: 'tw:whitespace-nowrap' }, 'Destination'),
            m('th', { class: 'tw:whitespace-nowrap' }, 'Community'),
          ]),
        ]),
        m('tbody', [
          routes.length > 0
            ? routes.map((route: Route) =>
                m(RouteRow, { key: route.id ?? route.name, route })
              )
            : m('tr', [
                m(
                  'td',
                  {
                    colspan: 4,
                    class: 'tw:text-center tw:py-8 tw:text-base-content/50',
                    'data-testid': 'empty-routes-message',
                  },
                  'No routes registered'
                ),
              ]),
        ]),
      ]),
    ]);
  },
};

export default RouteTable;
