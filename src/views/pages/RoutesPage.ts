import m from 'mithril';
import RouteTable from './RoutesPage/RouteTable';

const RoutesPage: m.Component = {
  view: () => m('div', { class: 'tw:p-4' }, m(RouteTable)),
};

export default RoutesPage;
