import m from 'mithril';
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import Icon from '../../shared/Icon';

export interface CreatedTokenAlertAttrs {
  token: string;
  ondismiss: () => void;
}

interface CreatedTokenAlertState {
  copied: boolean;
  copyTimeout: number | null;
}

const CreatedTokenAlert: m.Component<
  CreatedTokenAlertAttrs,
  CreatedTokenAlertState
> = {
  oninit: ({ state }) => {
    state.copied = false;
    state.copyTimeout = null;
  },
  onremove: ({ state }) => {
    if (state.copyTimeout !== null) {
      window.clearTimeout(state.copyTimeout);
    }
  },
  view: ({ attrs, state }) => {
    const copyToken = async () => {
      try {
        await navigator.clipboard.writeText(attrs.token);
        state.copied = true;
        if (state.copyTimeout !== null) {
          window.clearTimeout(state.copyTimeout);
        }
        state.copyTimeout = window.setTimeout(() => {
          state.copied = false;
          m.redraw();
        }, 2000);
        m.redraw();
      } catch {
        // Clipboard write failed or not supported in environment
      }
    };

    const copyIcon = m(Icon, {
      icon: faCopy,
      class: 'tw:h-4 tw:w-4',
    });

    const checkIcon = m(Icon, {
      icon: faCheck,
      class: 'tw:h-4 tw:w-4 tw:text-success',
    });

    return m(
      'div',
      {
        class:
          'tw:bg-base-200 tw:border tw:border-base-300 tw:rounded-box tw:px-4 tw:py-3 tw:mb-4 tw:flex tw:flex-col tw:gap-2',
        'data-testid': 'created-token-alert',
      },
      [
        m(
          'div',
          {
            class: 'tw:flex tw:items-center tw:justify-between tw:w-full',
          },
          [
            m(
              'span',
              {
                class: 'tw:text-xs tw:font-semibold tw:text-base-content/80',
              },
              'Token created. It will not be shown again.'
            ),
            m(
              'button',
              {
                class:
                  'tw:d-btn tw:d-btn-xs tw:d-btn-ghost tw:text-base-content/70 tw:hover:text-base-content',
                onclick: () => {
                  attrs.ondismiss();
                },
                title: 'Dismiss',
                'aria-label': 'Dismiss',
              },
              '✕'
            ),
          ]
        ),
        m(
          'div',
          {
            class:
              'tw:flex tw:items-center tw:justify-between tw:gap-3 tw:bg-base-100 tw:border tw:border-base-300 tw:rounded tw:p-2.5',
          },
          [
            m(
              'code',
              {
                class:
                  'tw:flex-1 tw:font-mono tw:text-sm tw:break-all tw:select-all',
              },
              attrs.token
            ),
            m(
              'button',
              {
                class:
                  'tw:d-btn tw:d-btn-sm tw:d-btn-ghost tw:shrink-0 tw:gap-1.5',
                onclick: () => {
                  void copyToken();
                },
                title: state.copied ? 'Copied!' : 'Copy token',
              },
              [
                state.copied ? checkIcon : copyIcon,
                m('span', state.copied ? 'Copied' : 'Copy'),
              ]
            ),
          ]
        ),
      ]
    );
  },
};

export default CreatedTokenAlert;
