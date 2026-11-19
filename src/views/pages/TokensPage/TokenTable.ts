import m from 'mithril';
import { DateTime } from 'luxon';
import {
  faCircleExclamation,
  faTrashCan,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { TokenRepository } from '../../../repositories/TokenRepository';
import {
  EXPIRING_SOON_DAYS,
  type Token,
  type TokenStatus,
} from '../../../models/Token';
import TokenRow, { checkboxClass } from './TokenRow';
import DeleteTokensDialog, { describeTokens } from './DeleteTokensDialog';
import FilterBar from '../../shared/FilterBar';
import Icon from '../../shared/Icon';
import SortableHeader from '../../shared/SortableHeader';
import { TableSort } from '../../shared/TableSort';

const tokenRepo: TokenRepository = new TokenRepository();

const columns = {
  name: (token: Token) => token.name,
  iat: (token: Token) => token.iat,
  nbf: (token: Token) => token.nbf,
  exp: (token: Token) => token.exp,
};

interface TokenFilter {
  key: string;
  label: string;
  shortLabel?: string;
  matches: (token: Token, now: DateTime) => boolean;
  sort: TableSort<Token, keyof typeof columns>;
  emptyMessage: string;
  impliedStatus?: TokenStatus;
}

// Module-level so the sorts survive TokensPage re-keying this table.
const filters: TokenFilter[] = [
  {
    key: 'active',
    label: 'Active',
    matches: (token, now) => !token.isExpired(now),
    sort: new TableSort(columns, 'iat', 'descending'),
    emptyMessage: 'No active tokens',
  },
  {
    key: 'expiring-soon',
    label: 'Expiring Soon',
    shortLabel: 'Expiring',
    matches: (token, now) => token.isExpiringSoon(now),
    sort: new TableSort(columns, 'exp', 'ascending'),
    emptyMessage: `Nothing expires in the next ${String(EXPIRING_SOON_DAYS)} days`,
    impliedStatus: 'expiring-soon',
  },
  {
    key: 'expired',
    label: 'Expired',
    matches: (token, now) => token.isExpired(now),
    sort: new TableSort(columns, 'exp', 'descending'),
    emptyMessage: 'No expired tokens',
    impliedStatus: 'expired',
  },
  {
    key: 'all',
    label: 'All',
    matches: () => true,
    sort: new TableSort(columns, 'iat', 'descending'),
    emptyMessage: 'No tokens to display',
  },
];
const defaultFilter = filters[0];

const filterHref = (filter: TokenFilter): string =>
  filter === defaultFilter ? '/tokens' : `/tokens?filter=${filter.key}`;

const selectAll = 'thead input[type="checkbox"]:enabled';
const currentFilter = '[aria-current="page"]';
const rowDelete = (row: string): string =>
  `tbody > tr:${row} td:last-child button`;

// Outlined, so neither action overpowers the count beside them. The fill
// outranks daisyUI's hover, so each button brings its own.
const selectionButtonClass =
  'tw:d-btn tw:d-btn-sm tw:gap-1.5 tw:border-base-300 tw:bg-base-100 tw:font-normal tw:shadow-none';

interface Deletion {
  tokens: Token[];
  pending: boolean;
  error: string | null;
  /** Where focus goes once the tokens are gone. The first match wins. */
  refocus: string[];
}

interface TokenTableState {
  tokens: Token[];
  loaded: boolean;
  error: string | null;
  /** Belongs to one filter, so switching filters starts afresh. */
  selection: { filter: string; names: Set<string> };
  deletion: Deletion | null;
  /** Where focus goes if the focused element is gone after the next redraw. */
  refocus: string[];
  /** Announced to screen readers, since a deleted row leaves no trace. */
  status: string;
}

const askToDelete = (
  state: TokenTableState,
  tokens: Token[],
  refocus: string[]
): void => {
  state.status = '';
  state.deletion = { tokens, pending: false, error: null, refocus };
};

const deleteTokens = async (
  state: TokenTableState,
  deletion: Deletion
): Promise<void> => {
  const { tokens } = deletion;
  state.deletion = { ...deletion, pending: true, error: null };
  const results = await Promise.allSettled(
    tokens.map((token) => tokenRepo.deleteToken(token))
  );
  const failed: Token[] = [];
  const reasons = new Set<string>();
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      failed.push(tokens[i]);
      reasons.add(
        result.reason instanceof Error
          ? result.reason.message
          : 'An unexpected error occurred.'
      );
    }
  });
  state.tokens = state.tokens.filter(
    (token) => !tokens.includes(token) || failed.includes(token)
  );
  if (failed.length === 0) {
    state.deletion = null;
    state.refocus = deletion.refocus;
    state.status = `Deleted ${
      tokens.length === 1 ? tokens[0].name : describeTokens(tokens)
    }`;
    return;
  }
  state.deletion = {
    ...deletion,
    tokens: failed,
    pending: false,
    error: `Unable to delete ${
      failed.length === tokens.length
        ? describeTokens(tokens)
        : `${String(failed.length)} of ${String(tokens.length)} tokens`
    }: ${[...reasons].join('; ')}`,
  };
};

const TokenTable: m.Component<Record<string, never>, TokenTableState> = {
  oninit: ({ state }) => {
    state.tokens = [];
    state.loaded = false;
    state.error = null;
    state.selection = { filter: '', names: new Set() };
    state.deletion = null;
    state.refocus = [];
    state.status = '';
    void tokenRepo
      .getAllTokens()
      .then((tokens) => {
        state.tokens = tokens;
        state.loaded = true;
      })
      .catch((error: unknown) => {
        state.error =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.';
      });
  },
  onupdate: ({ dom, state }) => {
    const selectors = state.refocus;
    state.refocus = [];
    if (document.activeElement === document.body) {
      selectors
        .map((selector) => dom.querySelector<HTMLElement>(selector))
        .find((element) => element !== null)
        ?.focus();
    }
  },
  view: ({ state }) => {
    const now = DateTime.now();
    const selected =
      filters.find((filter) => filter.key === m.route.param('filter')) ??
      defaultFilter;
    const { sort } = selected;
    const tokens: Token[] = sort.apply(
      state.tokens.filter((token) => selected.matches(token, now))
    );
    if (state.selection.filter !== selected.key) {
      state.selection = { filter: selected.key, names: new Set() };
      // Browser navigation gets past the modal dialog, and the rows it was
      // opened from are no longer the ones its refocus points at.
      if (state.deletion?.pending) {
        state.deletion.refocus = [currentFilter];
      } else if (state.deletion) {
        state.deletion = null;
        state.refocus = [currentFilter];
      }
    }
    const chosen = tokens.filter((token) =>
      state.selection.names.has(token.name)
    );
    const choose = (chosenTokens: Token[]): void => {
      state.selection.names = new Set(chosenTokens.map((token) => token.name));
    };
    return m('div', { class: 'tw:rounded-box tw:border tw:border-base-300' }, [
      m(
        'div',
        {
          class:
            // The card's 1px border leaves a 1px smaller radius inside it.
            'tw:grid tw:rounded-t-[calc(var(--radius-box)_-_1px)] tw:border-b tw:border-base-300 tw:bg-base-200',
        },
        [
          m(FilterBar, {
            label: 'Filter tokens',
            // Lines the first tab's label up with the first column. The inset
            // is inside the scrolling tabs, so they scroll out at the card's
            // edges. While rows are selected, the selection bar covers the
            // tabs, which keep their place and scroll position.
            class: `tw:col-start-1 tw:row-start-1 tw:pl-1 tw:max-sm:pl-2.5 ${chosen.length > 0 ? 'tw:invisible' : ''}`,
            options: filters.map((filter) => ({
              key: filter.key,
              label: filter.label,
              shortLabel: filter.shortLabel,
              href: filterHref(filter),
              count: state.loaded
                ? state.tokens.filter((token) => filter.matches(token, now))
                    .length
                : undefined,
              selected: filter === selected,
            })),
          }),
          chosen.length > 0 &&
            m(
              'div',
              {
                // Starts where the tabs' labels do.
                class:
                  'tw:col-start-1 tw:row-start-1 tw:flex tw:items-center tw:gap-2 tw:pl-4',
                'data-testid': 'selection-bar',
              },
              [
                m(
                  'span',
                  {
                    class: 'tw:mr-1 tw:text-sm tw:font-medium',
                    'aria-live': 'polite',
                  },
                  `${String(chosen.length)} selected`
                ),
                m(
                  'button',
                  {
                    class: `${selectionButtonClass} tw:hover:bg-base-200`,
                    'aria-label': 'Clear selection',
                    onclick: () => {
                      choose([]);
                      state.refocus = [currentFilter];
                    },
                  },
                  [
                    m(Icon, { icon: faXmark, class: 'tw:h-3.5 tw:w-3.5' }),
                    'Clear',
                  ]
                ),
                m(
                  'button',
                  {
                    // The theme's error red is too light to read as text, so
                    // it's mixed with the text color.
                    class: `${selectionButtonClass} tw:text-[color-mix(in_oklab,var(--color-error)_55%,var(--color-base-content))] tw:hover:bg-error/10`,
                    'aria-label': 'Delete selected tokens',
                    onclick: () => {
                      askToDelete(state, chosen, [selectAll, currentFilter]);
                    },
                  },
                  [
                    m(Icon, { icon: faTrashCan, class: 'tw:h-3.5 tw:w-3.5' }),
                    'Delete',
                  ]
                ),
              ]
            ),
        ]
      ),
      m('div', { class: 'tw:overflow-x-auto' }, [
        m('table', { class: 'tw:d-table tw:w-full' }, [
          m('caption', { class: 'tw:sr-only' }, `${selected.label} tokens`),
          m('thead', [
            m('tr', [
              m(
                'th',
                { class: 'tw:w-0 tw:pr-0' },
                m('input', {
                  type: 'checkbox',
                  class: checkboxClass,
                  'aria-label':
                    selected.key === 'all'
                      ? 'Select all tokens'
                      : `Select all ${selected.label.toLowerCase()} tokens`,
                  'data-testid': 'select-all',
                  checked: tokens.length > 0 && chosen.length === tokens.length,
                  indeterminate:
                    chosen.length > 0 && chosen.length < tokens.length,
                  disabled: tokens.length === 0,
                  onchange: (event: Event) => {
                    choose(
                      (event.currentTarget as HTMLInputElement).checked
                        ? tokens
                        : []
                    );
                  },
                })
              ),
              m(
                SortableHeader,
                // Keeps names from breaking at every hyphen on phones.
                { column: sort.column('name'), class: 'tw:w-full tw:min-w-44' },
                'Name'
              ),
              m(
                SortableHeader,
                { column: sort.column('iat'), class: 'tw:whitespace-nowrap' },
                'Issued At'
              ),
              m(
                SortableHeader,
                { column: sort.column('nbf'), class: 'tw:whitespace-nowrap' },
                'Not Before'
              ),
              m(
                SortableHeader,
                { column: sort.column('exp'), class: 'tw:whitespace-nowrap' },
                'Expiration'
              ),
              // Holds the Delete button's width even when no rows are shown,
              // so the columns don't shift between filters.
              m(
                'th',
                { class: 'tw:min-w-28' },
                m('span', { class: 'tw:sr-only' }, 'Actions')
              ),
            ]),
          ]),
          m(
            'tbody',
            tokens.map((token: Token, index) =>
              m(TokenRow, {
                key: token.id ?? token.name,
                token,
                now,
                hiddenStatus: selected.impliedStatus,
                selected: chosen.includes(token),
                onselect: (isSelected: boolean) => {
                  // From the live selection, not this render's, in case two
                  // toggles land before a redraw.
                  if (isSelected) {
                    state.selection.names.add(token.name);
                  } else {
                    state.selection.names.delete(token.name);
                  }
                },
                ondelete: () => {
                  // The next row moves up into this one's place.
                  askToDelete(
                    state,
                    [token],
                    [
                      rowDelete(`nth-child(${String(index + 1)})`),
                      rowDelete('last-child'),
                      selectAll,
                      currentFilter,
                    ]
                  );
                },
              })
            )
          ),
        ]),
      ]),
      state.deletion &&
        m(DeleteTokensDialog, {
          tokens: state.deletion.tokens,
          pending: state.deletion.pending,
          error: state.deletion.error,
          onconfirm: () => {
            // A second click can land before the button is disabled.
            if (state.deletion && !state.deletion.pending) {
              void deleteTokens(state, state.deletion);
            }
          },
          onclose: () => {
            if (state.deletion?.pending) {
              return false;
            }
            state.deletion = null;
            return true;
          },
        }),
      m('p', { class: 'tw:sr-only', role: 'status' }, state.status),
      // Outside the scrolling table, so messages center on and wrap within
      // the visible card.
      tokens.length === 0 &&
        (state.error !== null
          ? m(
              'p',
              {
                class: 'tw:px-4 tw:py-8 tw:text-center tw:text-sm',
                role: 'alert',
                'data-testid': 'tokens-load-error',
              },
              [
                m(Icon, {
                  icon: faCircleExclamation,
                  class:
                    'tw:mr-2 tw:inline-block tw:h-4 tw:w-4 tw:align-text-bottom tw:text-error',
                }),
                `Unable to load tokens: ${state.error}`,
              ]
            )
          : state.loaded &&
            m(
              'p',
              {
                class:
                  'tw:px-4 tw:py-8 tw:text-center tw:text-sm tw:text-base-content/70',
                'data-testid': 'empty-tokens-message',
              },
              selected.emptyMessage
            )),
    ]);
  },
};

export default TokenTable;
