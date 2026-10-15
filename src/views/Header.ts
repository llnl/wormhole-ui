import m from 'mithril';
import { faKey, faLink } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import Icon from './shared/Icon';

interface NavTab {
  href: string;
  label: string;
  icon: IconDefinition;
}

const TABS: NavTab[] = [
  { href: '/tokens', label: 'Tokens', icon: faKey },
  { href: '/routes', label: 'Routes', icon: faLink },
];

const Header: m.Component = {
  view: () => {
    // m.route.get() includes the query string, so strip it before comparing
    // against tab hrefs.
    const currentPath = m.route.get().split('?')[0];

    return m(
      'div',
      {
        class:
          'tw:sticky tw:top-0 tw:z-50 tw:d-navbar tw:bg-base-100 tw:shadow-sm',
      },
      [
        m('div', { class: 'tw:d-navbar-start' }, [
          m(
            'span',
            { class: 'tw:d-btn tw:d-btn-ghost tw:text-xl' },
            'Wormhole'
          ),
        ]),
        m('div', { class: 'tw:d-navbar-end' }, [
          m(
            'div',
            { class: 'tw:d-tabs tw:d-tabs-box', role: 'tablist' },
            TABS.map((tab) =>
              m(
                m.route.Link,
                {
                  key: tab.href,
                  href: tab.href,
                  role: 'tab',
                  class: 'tw:d-tab tw:gap-2',
                  'aria-current': tab.href === currentPath ? 'page' : undefined,
                },
                [m(Icon, { icon: tab.icon }), tab.label]
              )
            )
          ),
        ]),
      ]
    );
  },
};

export default Header;
