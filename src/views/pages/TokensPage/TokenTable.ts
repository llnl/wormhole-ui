import m from 'mithril';
import { TokenRepository } from '../../../repositories/TokenRepository';
import type { Token } from '../../../models/Token';
import TokenRow from './TokenRow';
import SortableHeader from '../../shared/SortableHeader';
import { TableSort } from '../../shared/TableSort';

const tokenRepo: TokenRepository = new TokenRepository();

// Module-level so the sort survives TokensPage re-keying this table.
const tokenSort = new TableSort(
  {
    name: (token: Token) => token.name,
    iat: (token: Token) => token.iat,
    nbf: (token: Token) => token.nbf,
    exp: (token: Token) => token.exp,
  },
  'iat',
  'descending'
);

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
    const tokens: Token[] = tokenSort.apply(state.tokens);
    return m('div', { class: 'tw:overflow-x-auto' }, [
      m('table', { class: 'tw:d-table tw:w-full tw:border' }, [
        m('thead', [
          m('tr', [
            m(
              SortableHeader,
              { column: tokenSort.column('name'), class: 'tw:w-full' },
              'Name'
            ),
            m(
              SortableHeader,
              {
                column: tokenSort.column('iat'),
                class: 'tw:whitespace-nowrap',
              },
              'Issued At'
            ),
            m(
              SortableHeader,
              {
                column: tokenSort.column('nbf'),
                class: 'tw:whitespace-nowrap',
              },
              'Not Before'
            ),
            m(
              SortableHeader,
              {
                column: tokenSort.column('exp'),
                class: 'tw:whitespace-nowrap',
              },
              'Expiration'
            ),
            m('th'),
          ]),
        ]),
        m('tbody', [
          tokens.length > 0
            ? tokens.map((token: Token) =>
                m(TokenRow, {
                  key: token.id ?? token.name,
                  token,
                  ondelete: (deletedToken: Token) => {
                    state.tokens = state.tokens.filter(
                      (existingToken) =>
                        existingToken.name !== deletedToken.name
                    );
                  },
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
                  'No tokens to display'
                ),
              ]),
        ]),
      ]),
    ]);
  },
};

export default TokenTable;
