import m from 'mithril';

export interface FilterOption {
  key: string;
  label: string;
  /** Shown instead of the label on narrow screens. */
  shortLabel?: string;
  href: string;
  /** Omitted while the items are still loading, which hides the count. */
  count?: number;
  selected: boolean;
}

interface FilterBarAttrs {
  label: string;
  options: FilterOption[];
  class?: string;
}

interface FilterBarState {
  revealed?: string;
}

// On narrow screens the tabs scroll sideways, which could hide the selected
// one. Only reveal it when the selection or the tabs' width changes, so
// redraws don't undo the user's own scrolling.
const revealSelected = ({
  attrs,
  dom,
  state,
}: m.VnodeDOM<FilterBarAttrs, FilterBarState>): void => {
  const selected = attrs.options.find((option) => option.selected);
  const revealed = `${selected?.key ?? ''}:${String(dom.scrollWidth)}`;
  const tab = dom.querySelector('[aria-current="page"]');
  if (revealed === state.revealed || tab === null) {
    return;
  }
  state.revealed = revealed;
  // Leave part of the next tab showing as a hint that the tabs scroll.
  const peek = 24;
  const bar = dom.getBoundingClientRect();
  const { left, right } = tab.getBoundingClientRect();
  if (left - peek < bar.left) {
    dom.scrollLeft -= bar.left - left + peek;
  } else if (right + peek > bar.right) {
    dom.scrollLeft += right + peek - bar.right;
  }
};

/** Tabs that switch a list between filtered views, each with its count. */
const FilterBar: m.Component<FilterBarAttrs, FilterBarState> = {
  oncreate: revealSelected,
  onupdate: revealSelected,
  view: ({ attrs }) =>
    m(
      'nav',
      {
        'aria-label': attrs.label,
        // The partly shown next tab hints at scrolling instead of a
        // scrollbar.
        class: `tw:d-tabs tw:d-tabs-border tw:flex-nowrap tw:overflow-x-auto tw:[scrollbar-width:none] tw:[&::-webkit-scrollbar]:hidden ${attrs.class ?? ''}`,
      },
      attrs.options.map((option) =>
        m(
          m.route.Link,
          {
            key: option.key,
            href: option.href,
            options: { replace: option.selected },
            // daisyUI's unselected tab text is too faint to read comfortably.
            class: `tw:d-tab tw:shrink-0 tw:gap-1.5 tw:max-sm:gap-1 tw:max-sm:[--d-tab-p:0.375rem] ${option.selected ? '' : 'tw:text-base-content/70 tw:hover:text-base-content'}`,
            'aria-current': option.selected ? 'page' : undefined,
            'data-testid': `filter-${option.key}`,
          },
          [
            // Screen readers get the full label at every width.
            option.shortLabel === undefined
              ? option.label
              : [
                  m('span', { class: 'tw:max-sm:sr-only' }, option.label),
                  m(
                    'span',
                    { class: 'tw:sm:hidden', 'aria-hidden': 'true' },
                    option.shortLabel
                  ),
                ],
            // Kept in place while loading, so the tabs don't shift when the
            // counts arrive.
            m(
              'span',
              {
                class: `tw:min-w-5 tw:rounded-full tw:bg-base-content/10 tw:px-1.5 tw:max-sm:px-1 tw:text-center tw:text-xs tw:leading-5 tw:tabular-nums ${option.count === undefined ? 'tw:invisible' : ''}`,
                'data-testid': 'filter-count',
              },
              option.count
            ),
          ]
        )
      )
    ),
};

export default FilterBar;
