import m from 'mithril';
import { DateTime } from 'luxon';
import { faCheck, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import type { Token } from '../../../models/Token';
import { TokenRepository } from '../../../repositories/TokenRepository';
import Icon from '../../shared/Icon';

const tokenRepo = new TokenRepository();

interface AttestTokenRowAttrs {
  token: Token;
}

type Outcome = 'pending' | 'kept' | 'deleted';
type PendingAction = 'keep' | 'delete' | null;

interface AttestTokenRowState {
  outcome: Outcome;
  pendingAction: PendingAction;
  error: string | null;
}

const isExpired = (token: Token): boolean =>
  token.exp !== null && DateTime.now().toSeconds() > token.exp;

const isNotYetValid = (token: Token): boolean =>
  token.nbf !== null && DateTime.now().toSeconds() < token.nbf;

const AttestTokenRow: m.Component<AttestTokenRowAttrs, AttestTokenRowState> = {
  oninit: ({ state }) => {
    state.outcome = 'pending';
    state.pendingAction = null;
    state.error = null;
  },
  view: ({ attrs, state }) => {
    const { token } = attrs;
    const expired = isExpired(token);
    const notYetValid = isNotYetValid(token);
    const expText = token.exp
      ? (DateTime.fromSeconds(token.exp).toISODate() ?? 'N/A')
      : 'N/A';

    let control: m.Children;
    if (state.outcome === 'kept') {
      control = m(
        'span',
        {
          class:
            'tw:d-badge tw:d-badge-success tw:gap-1.5 tw:whitespace-nowrap',
          'data-testid': 'attest-token-status',
        },
        [m(Icon, { icon: faCheck, class: 'tw:h-3 tw:w-3' }), 'Kept']
      );
    } else if (state.outcome === 'deleted') {
      control = m(
        'span',
        {
          class:
            'tw:d-badge tw:d-badge-neutral tw:gap-1.5 tw:whitespace-nowrap',
          'data-testid': 'attest-token-status',
        },
        [m(Icon, { icon: faTrashCan, class: 'tw:h-3 tw:w-3' }), 'Deleted']
      );
    } else if (expired) {
      control = m(
        'span',
        {
          class: 'tw:d-badge tw:d-badge-ghost',
          'data-testid': 'attest-token-status',
        },
        'Expired'
      );
    } else if (notYetValid) {
      control = m(
        'span',
        {
          class: 'tw:d-badge tw:d-badge-ghost',
          'data-testid': 'attest-token-status',
        },
        'Not Yet Valid'
      );
    } else if (token.id === null) {
      control = m(
        'span',
        {
          class: 'tw:d-badge tw:d-badge-ghost',
          'data-testid': 'attest-token-status',
        },
        'Unavailable'
      );
    } else {
      const isSubmitting = state.pendingAction !== null;

      control = m('div', { class: 'tw:flex tw:gap-2' }, [
        m(
          'button',
          {
            class: 'tw:d-btn tw:d-btn-sm tw:d-btn-primary',
            'data-testid': 'attest-token-keep-button',
            disabled: isSubmitting,
            onclick: async () => {
              state.pendingAction = 'keep';
              state.error = null;
              m.redraw();
              try {
                await tokenRepo.attestToken(token);
                state.outcome = 'kept';
              } catch (error: unknown) {
                state.error =
                  error instanceof Error
                    ? error.message
                    : 'Unable to attest token.';
              } finally {
                state.pendingAction = null;
              }
            },
          },
          [
            m(Icon, { icon: faCheck, class: 'tw:h-3 tw:w-3' }),
            state.pendingAction === 'keep'
              ? 'Keeping...'
              : 'Still in use, keep',
          ]
        ),
        m(
          'button',
          {
            class: 'tw:d-btn tw:d-btn-sm tw:d-btn-error',
            'data-testid': 'attest-token-delete-button',
            disabled: isSubmitting,
            onclick: async () => {
              state.pendingAction = 'delete';
              state.error = null;
              m.redraw();
              try {
                await tokenRepo.deleteToken(token);
                state.outcome = 'deleted';
              } catch (error: unknown) {
                state.error =
                  error instanceof Error
                    ? error.message
                    : 'Unable to delete token.';
              } finally {
                state.pendingAction = null;
              }
            },
          },
          [
            m(Icon, { icon: faTrashCan, class: 'tw:h-3 tw:w-3' }),
            state.pendingAction === 'delete' ? 'Deleting...' : 'Unused, delete',
          ]
        ),
      ]);
    }

    return m(
      'div',
      {
        class:
          'tw:flex tw:flex-col tw:gap-1 tw:border tw:border-base-300 tw:rounded-md tw:p-3',
        'data-testid': `attest-token-row-${token.name}`,
      },
      [
        m('div', { class: 'tw:flex tw:items-center tw:justify-between' }, [
          m('div', { class: 'tw:flex tw:flex-col' }, [
            m('span', { class: 'tw:font-medium' }, token.name),
            m(
              'span',
              { class: 'tw:text-xs tw:text-base-content/60' },
              `Expires ${expText}`
            ),
          ]),
          control,
        ]),
        state.error &&
          m(
            'div',
            { class: 'tw:d-alert tw:d-alert-error tw:text-sm tw:py-2' },
            state.error
          ),
      ]
    );
  },
};

export default AttestTokenRow;
