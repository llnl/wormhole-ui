import m from 'mithril';
import {
  faSort,
  faSortDown,
  faSortUp,
} from '@fortawesome/free-solid-svg-icons';
import type { SortableColumn } from './TableSort';
import Icon from './Icon';

interface SortableHeaderAttrs {
  column: SortableColumn;
  class?: string;
}

const icons = { ascending: faSortUp, descending: faSortDown };

const SortableHeader: m.Component<SortableHeaderAttrs> = {
  view: ({ attrs, children }) => {
    const { key, direction, toggle } = attrs.column;
    return m(
      'th',
      { class: attrs.class, 'aria-sort': direction ?? undefined },
      m(
        'button',
        {
          type: 'button',
          class: 'tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-1',
          'data-testid': `sort-by-${key}`,
          onclick: toggle,
        },
        [
          children,
          m(Icon, {
            icon: direction ? icons[direction] : faSort,
            class: direction ? 'tw:h-3 tw:w-3' : 'tw:h-3 tw:w-3 tw:opacity-30',
          }),
        ]
      )
    );
  },
};

export default SortableHeader;
