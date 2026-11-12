import m from 'mithril';
import { DateTime } from 'luxon';
import { TokenRepository } from '../../../repositories/TokenRepository';
import type { Token } from '../../../models/Token';
import TokenRow from './TokenRow';
import SortableHeader from '../../shared/SortableHeader';
import { TableSort } from '../../shared/TableSort';

const tokenRepo: TokenRepository = new TokenRepository();

const columns = {
  name: (token: Token) => token.name,
  iat: (token: Token) => token.iat,
  nbf: (token: Token) => token.nbf,
  exp: (token: Token) => token.exp,
};

// Module-level so the sorts survive TokensPage re-keying this table.
const tokenSort = new TableSort(columns, 'iat', 'descending');
const expiredTokenSort = new TableSort(columns, 'exp', 'descending');

const renderHeading = (title: string, count: number): m.Children =>
  m(
    'h2',
    {
      class:
        'tw:mb-3 tw:flex tw:items-center tw:gap-2 tw:text-lg tw:font-semibold',
    },
    [
      title,
      m(
        'span',
        { class: 'tw:d-badge tw:d-badge-ghost', 'data-testid': 'token-count' },
        count
      ),
    ]
  );

const renderTable = (
  tokens: Token[],
  sort: TableSort<Token, keyof typeof columns>,
  ondelete: (token: Token) => void
): m.Children =>
  m('div', { class: 'tw:overflow-x-auto' }, [
    m('table', { class: 'tw:d-table tw:w-full tw:border' }, [
      m('thead', [
        m('tr', [
          m(
            SortableHeader,
            { column: sort.column('name'), class: 'tw:w-full' },
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
          m('th'),
        ]),
      ]),
      m('tbody', [
        tokens.length > 0
          ? sort.apply(tokens).map((token: Token) =>
              m(TokenRow, {
                key: token.id ?? token.name,
                token,
                ondelete,
              })
            )
          : m('tr', [
              m(
                'td',
                {
                  colspan: 5,
                  class: 'tw:text-center tw:py-8 tw:text-base-content/50',
                  'data-testid': 'empty-tokens-message',
                },
                'No active tokens'
              ),
            ]),
      ]),
    ]),
  ]);

interface TokenTableState {
  tokens: Token[];
}

const TokenTable: m.Component<Record<string, never>, TokenTableState> = {
  oninit: ({ state }) => {
    state.tokens = [];
    void tokenRepo.getAllTokens().then((tokens) => {
      state.tokens = tokens;
    });
  },
  view: ({ state }) => {
    const now = DateTime.now();
    const activeTokens = state.tokens.filter((token) => !token.isExpired(now));
    const expiredTokens = state.tokens.filter((token) => token.isExpired(now));
    const ondelete = (deletedToken: Token): void => {
      state.tokens = state.tokens.filter(
        (existingToken) => existingToken.name !== deletedToken.name
      );
    };
    return [
      m('section', { 'data-testid': 'active-tokens' }, [
        renderHeading('Active Tokens', activeTokens.length),
        renderTable(activeTokens, tokenSort, ondelete),
      ]),
      expiredTokens.length > 0 &&
        m('section', { class: 'tw:mt-8', 'data-testid': 'expired-tokens' }, [
          renderHeading('Expired Tokens', expiredTokens.length),
          renderTable(expiredTokens, expiredTokenSort, ondelete),
        ]),
    ];
  },
};

export default TokenTable;
