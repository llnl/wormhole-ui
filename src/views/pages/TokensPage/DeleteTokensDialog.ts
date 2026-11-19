import m from 'mithril';
import type { Token } from '../../../models/Token';

interface DeleteTokensDialogAttrs {
  tokens: Token[];
  pending: boolean;
  error: string | null;
  onconfirm: () => void;
  /**
   * Called when the user closes the dialog: Cancel, Escape or the backdrop.
   * Returns false to keep it open.
   */
  onclose: () => boolean;
}

interface DeleteTokensDialogState {
  /** Set when the user closes the dialog, so any other close is undone. */
  closing: boolean;
  wasPending: boolean;
}

const titleId = 'delete-tokens-title';
const descriptionId = 'delete-tokens-description';

export const describeTokens = (tokens: Token[]): string =>
  tokens.length === 1 ? 'token' : `${String(tokens.length)} tokens`;

/** Asks before deleting one or more tokens. */
const DeleteTokensDialog: m.Component<
  DeleteTokensDialogAttrs,
  DeleteTokensDialogState
> = {
  oninit: ({ state }) => {
    state.closing = false;
    state.wasPending = false;
  },
  oncreate: ({ dom }) => {
    (dom as HTMLDialogElement).showModal();
  },
  onupdate: ({ attrs, dom, state }) => {
    // Disabling the buttons while pending takes focus out of the dialog, a
    // moment after this runs, so the box takes it regardless. Later redraws
    // leave the user's focus alone unless it was lost.
    if (
      attrs.pending &&
      (!state.wasPending || !dom.contains(document.activeElement))
    ) {
      dom.querySelector<HTMLElement>('[tabindex="-1"]')?.focus();
    } else if (!attrs.pending && state.wasPending) {
      dom.querySelector<HTMLElement>('[autofocus]')?.focus();
    }
    state.wasPending = attrs.pending;
  },
  view: ({ attrs, state }) => {
    const { tokens, pending } = attrs;
    const what = describeTokens(tokens);
    const close = (event: Event): void => {
      if (!pending) {
        state.closing = true;
        (event.currentTarget as Element).closest('dialog')?.close();
      }
    };
    return m(
      'dialog',
      {
        class: 'tw:d-modal',
        'aria-labelledby': titleId,
        'aria-describedby': descriptionId,
        oncancel: (event: Event) => {
          if (pending) {
            event.preventDefault();
          } else {
            state.closing = true;
          }
        },
        // Browsers let a repeated Escape close it even while pending, and a
        // Cancel can land before the redraw that disables it.
        onclose: (event: Event) => {
          const dialog = event.currentTarget as HTMLDialogElement;
          const { closing } = state;
          state.closing = false;
          if ((!closing || !attrs.onclose()) && dialog.isConnected) {
            dialog.showModal();
          }
        },
      },
      [
        m(
          'div',
          {
            // Focusable while pending, without the viewport-sized focus ring a
            // focused dialog gets.
            class: 'tw:d-modal-box tw:outline-none',
            tabindex: -1,
          },
          [
            m(
              'h3',
              { id: titleId, class: 'tw:mb-4 tw:text-lg tw:font-bold' },
              `Delete ${what}?`
            ),
            tokens.length === 1
              ? m('p', { id: descriptionId, class: 'tw:wrap-anywhere' }, [
                  m('strong', tokens[0].name),
                  ' will be permanently deleted.',
                ])
              : [
                  m(
                    'p',
                    { id: descriptionId },
                    'These tokens will be permanently deleted:'
                  ),
                  m(
                    'ul',
                    {
                      class:
                        'tw:mt-3 tw:max-h-48 tw:overflow-y-auto tw:rounded-box tw:border tw:border-base-300 tw:bg-base-200 tw:px-4 tw:py-2 tw:text-sm tw:wrap-anywhere',
                      'data-testid': 'delete-tokens-list',
                    },
                    tokens.map((token) =>
                      m(
                        'li',
                        { key: token.name, class: 'tw:py-0.5' },
                        token.name
                      )
                    )
                  ),
                ],
            attrs.error &&
              m(
                'div',
                {
                  class: 'tw:d-alert tw:d-alert-error tw:mt-4 tw:text-sm',
                  role: 'alert',
                },
                attrs.error
              ),
            m('div', { class: 'tw:d-modal-action tw:mt-6' }, [
              m(
                'button',
                {
                  class: 'tw:d-btn',
                  type: 'button',
                  autofocus: true,
                  disabled: pending,
                  onclick: close,
                },
                'Cancel'
              ),
              m(
                'button',
                {
                  class: 'tw:d-btn tw:d-btn-error',
                  type: 'button',
                  'data-testid': 'confirm-delete-button',
                  disabled: pending,
                  onclick: attrs.onconfirm,
                },
                // Both labels take up space, so the buttons don't shift under
                // the pointer when the label changes.
                m('span', { class: 'tw:grid' }, [
                  m(
                    'span',
                    {
                      class: `tw:col-start-1 tw:row-start-1 ${pending ? 'tw:invisible' : ''}`,
                    },
                    `Delete ${what}`
                  ),
                  m(
                    'span',
                    {
                      class: `tw:col-start-1 tw:row-start-1 ${pending ? '' : 'tw:invisible'}`,
                    },
                    'Deleting...'
                  ),
                ])
              ),
            ]),
          ]
        ),
        m('div', { class: 'tw:d-modal-backdrop', onclick: close }),
      ]
    );
  },
};

export default DeleteTokensDialog;
