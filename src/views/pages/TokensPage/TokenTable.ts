import m from 'mithril';
import { DateTime } from 'luxon';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { TokenRepository } from '../../../repositories/TokenRepository';
import {
  EXPIRING_SOON_DAYS,
  type Token,
  type TokenStatus,
} from '../../../models/Token';
import TokenRow from './TokenRow';
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

interface TokenTableState {
  tokens: Token[];
  loaded: boolean;
  error: string | null;
}

const TokenTable: m.Component<Record<string, never>, TokenTableState> = {
  oninit: ({ state }) => {
    state.tokens = [];
    state.loaded = false;
    state.error = null;
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
  view: ({ state }) => {
    const now = DateTime.now();
    const selected =
      filters.find((filter) => filter.key === m.route.param('filter')) ??
      defaultFilter;
    const { sort } = selected;
    const tokens: Token[] = sort.apply(
      state.tokens.filter((token) => selected.matches(token, now))
    );
    return m('div', { class: 'tw:rounded-box tw:border tw:border-base-300' }, [
      m(
        'div',
        {
          class:
            // The card's 1px border leaves a 1px smaller radius inside it.
            'tw:rounded-t-[calc(var(--radius-box)_-_1px)] tw:border-b tw:border-base-300 tw:bg-base-200',
        },
        [
          m(FilterBar, {
            label: 'Filter tokens',
            // Lines the first tab's label up with the Name column. The inset
            // is inside the scrolling tabs, so they scroll out at the card's
            // edges.
            class: 'tw:pl-1 tw:max-sm:pl-2.5',
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
        ]
      ),
      m('div', { class: 'tw:overflow-x-auto' }, [
        m('table', { class: 'tw:d-table tw:w-full' }, [
          m('caption', { class: 'tw:sr-only' }, `${selected.label} tokens`),
          m('thead', [
            m('tr', [
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
            tokens.map((token: Token) =>
              m(TokenRow, {
                key: token.id ?? token.name,
                token,
                now,
                hiddenStatus: selected.impliedStatus,
                ondelete: (deletedToken: Token) => {
                  state.tokens = state.tokens.filter(
                    (existingToken) => existingToken.name !== deletedToken.name
                  );
                },
              })
            )
          ),
        ]),
      ]),
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
