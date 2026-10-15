import m from 'mithril';
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { TokenRepository } from '../../../repositories/TokenRepository';
import type { Token } from '../../../models/Token';
import Icon from '../../shared/Icon';
import AttestTokenRow from './AttestTokenRow';

const tokenRepo = new TokenRepository();

type Step = 'closed' | 'acknowledgement' | 'list';

interface AttestTokensButtonAttrs {
  onclose: () => void;
}

interface AttestTokensButtonState {
  step: Step;
  tokens: Token[];
  isLoading: boolean;
  error: string | null;
}

const AttestTokensButton: m.Component<
  AttestTokensButtonAttrs,
  AttestTokensButtonState
> = {
  oninit: ({ state }) => {
    state.step = 'closed';
    state.tokens = [];
    state.isLoading = false;
    state.error = null;
  },
  view: ({ attrs, state }) => [
    m(
      'button',
      {
        class: 'tw:d-btn tw:d-btn-outline tw:gap-2',
        'data-testid': 'attest-tokens-button',
        onclick: () => {
          state.step = 'acknowledgement';
          state.error = null;
        },
      },
      [
        m(Icon, { icon: faShieldHalved, class: 'tw:h-4 tw:w-4' }),
        'Attest Tokens',
      ]
    ),

    state.step === 'acknowledgement' &&
      m('div', { class: 'tw:d-modal tw:d-modal-open' }, [
        m('div', { class: 'tw:d-modal-box' }, [
          m(
            'h3',
            { class: 'tw:text-lg tw:font-bold tw:mb-4' },
            'Token Attestation'
          ),
          m('div', { class: 'tw:flex tw:flex-col tw:gap-3 tw:text-sm' }, [
            m(
              'p',
              'You must verify that each token is still needed at least ' +
                'once every 30 days, or it will expire. On the next ' +
                'screen, you will confirm each token individually.'
            ),
          ]),
          m('div', { class: 'tw:d-modal-action tw:mt-6' }, [
            m(
              'button',
              {
                class: 'tw:d-btn',
                type: 'button',
                'data-testid': 'attest-cancel-button',
                onclick: () => {
                  state.step = 'closed';
                  attrs.onclose();
                },
              },
              'Cancel'
            ),
            m(
              'button',
              {
                class: 'tw:d-btn tw:d-btn-primary',
                type: 'button',
                'data-testid': 'attest-acknowledge-button',
                onclick: async () => {
                  state.isLoading = true;
                  state.error = null;
                  m.redraw();
                  try {
                    state.tokens = await tokenRepo.getAllTokens();
                    state.step = 'list';
                  } catch (error: unknown) {
                    state.error =
                      error instanceof Error
                        ? error.message
                        : 'Unable to load tokens.';
                  } finally {
                    state.isLoading = false;
                  }
                },
              },
              state.isLoading ? 'Loading...' : 'I Acknowledge, Continue'
            ),
          ]),
        ]),
        m('button', {
          class: 'tw:d-modal-backdrop',
          onclick: () => {
            state.step = 'closed';
            attrs.onclose();
          },
        }),
      ]),

    state.step === 'list' &&
      m('div', { class: 'tw:d-modal tw:d-modal-open' }, [
        m('div', { class: 'tw:d-modal-box tw:max-w-2xl' }, [
          m(
            'h3',
            { class: 'tw:text-lg tw:font-bold tw:mb-4' },
            'Token Attestation'
          ),
          state.error &&
            m(
              'div',
              { class: 'tw:d-alert tw:d-alert-error tw:text-sm tw:mb-4' },
              state.error
            ),
          m(
            'div',
            {
              class:
                'tw:flex tw:flex-col tw:gap-3 tw:max-h-96 tw:overflow-y-auto',
            },
            state.tokens.length > 0
              ? state.tokens.map((token: Token) =>
                  m(AttestTokenRow, {
                    key: token.id ?? token.name,
                    token,
                  })
                )
              : m(
                  'div',
                  {
                    class: 'tw:text-center tw:py-8 tw:text-base-content/50',
                    'data-testid': 'attest-empty-message',
                  },
                  'No tokens to display'
                )
          ),
          m('div', { class: 'tw:d-modal-action tw:mt-6' }, [
            m(
              'button',
              {
                class: 'tw:d-btn tw:d-btn-primary',
                type: 'button',
                'data-testid': 'attest-done-button',
                onclick: () => {
                  state.step = 'closed';
                  attrs.onclose();
                },
              },
              'Done'
            ),
          ]),
        ]),
        m('button', {
          class: 'tw:d-modal-backdrop',
          onclick: () => {
            state.step = 'closed';
            attrs.onclose();
          },
        }),
      ]),
  ],
};

export default AttestTokensButton;
