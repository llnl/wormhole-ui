import m from 'mithril';
import { RouteRepository } from '../../../repositories/RouteRepository';
import type { Route } from '../../../models/Route';
import RouteRow from './RouteRow';
import SortableHeader from '../../shared/SortableHeader';
import { TableSort } from '../../shared/TableSort';

const routeRepo: RouteRepository = new RouteRepository();

const routeSort = new TableSort(
  {
    name: (route: Route) => route.name,
    src: (route: Route) => route.src,
    dst: (route: Route) => route.dst,
    community: (route: Route) => route.communityName,
  },
  'name'
);

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
    const routes: Route[] = routeSort.apply(state.routes);
    return m('div', { class: 'tw:overflow-x-auto' }, [
      m('table', { class: 'tw:d-table tw:w-full tw:border' }, [
        m('thead', [
          m('tr', [
            m(
              SortableHeader,
              { column: routeSort.column('name'), class: 'tw:w-full' },
              'Name'
            ),
            m(
              SortableHeader,
              {
                column: routeSort.column('src'),
                class: 'tw:whitespace-nowrap',
              },
              'Public URL'
            ),
            m(
              SortableHeader,
              {
                column: routeSort.column('dst'),
                class: 'tw:whitespace-nowrap',
              },
              'Destination'
            ),
            m(
              SortableHeader,
              {
                column: routeSort.column('community'),
                class: 'tw:whitespace-nowrap',
              },
              'Community'
            ),
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
