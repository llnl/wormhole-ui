import m from 'mithril';
import { DateTime } from 'luxon';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import type { Token, TokenStatus } from '../../../models/Token';
import Icon from '../../shared/Icon';

// daisyUI's default checkbox is round enough to pass for a radio button, too
// faint to see when unchecked, and barely marked when checked.
export const checkboxClass =
  'tw:d-checkbox tw:d-checkbox-sm tw:rounded-[0.25rem] tw:[--d-input-color:color-mix(in_oklab,var(--color-base-content)_50%,transparent)] tw:checked:text-base-100 tw:checked:[--d-input-color:var(--color-base-content)] tw:indeterminate:text-base-100 tw:indeterminate:[--d-input-color:var(--color-base-content)]';

interface TokenRowAttrs {
  token: Token;
  now: DateTime;
  /** A status the current view already makes clear, so it isn't shown. */
  hiddenStatus?: TokenStatus;
  selected: boolean;
  onselect: (selected: boolean) => void;
  ondelete: () => void;
}

// The theme's warning and info colors are too light to read as text, so the
// labels mix them with the text color.
const badges: Record<
  Exclude<TokenStatus, 'valid'>,
  { label: string; class: string }
> = {
  'expiring-soon': {
    label: 'Expiring Soon',
    class:
      'tw:bg-warning/15 tw:text-[color-mix(in_oklab,var(--color-warning)_45%,var(--color-base-content))]',
  },
  'not-yet-valid': {
    label: 'Not Yet Valid',
    class:
      'tw:bg-info/15 tw:text-[color-mix(in_oklab,var(--color-info)_45%,var(--color-base-content))]',
  },
  expired: {
    label: 'Expired',
    class: 'tw:bg-base-content/10 tw:text-base-content/70',
  },
};

const renderTimestampCell = (seconds: number | null): m.Children => {
  if (seconds === null) {
    return m('td', { class: 'tw:whitespace-nowrap' }, 'N/A');
  }
  const dt = DateTime.fromSeconds(seconds);
  const fullTimestamp = dt.toISO();
  return m(
    'td',
    {
      class: 'tw:whitespace-nowrap',
      ...(fullTimestamp ? { title: fullTimestamp } : {}),
    },
    dt.toISODate() ?? 'N/A'
  );
};

const TokenRow: m.Component<TokenRowAttrs> = {
  view: ({ attrs }) => {
    const status = attrs.token.status(attrs.now);
    const badge =
      status === 'valid' || status === attrs.hiddenStatus
        ? null
        : badges[status];
    return m(
      'tr',
      {
        class: attrs.selected ? 'tw:bg-base-200' : '',
        'data-testid': `token-row-${attrs.token.name}`,
      },
      [
        m(
          'td',
          { class: 'tw:pr-0' },
          m('input', {
            type: 'checkbox',
            class: checkboxClass,
            'aria-label': `Select ${attrs.token.name}`,
            checked: attrs.selected,
            onchange: (event: Event) => {
              attrs.onselect((event.currentTarget as HTMLInputElement).checked);
            },
          })
        ),
        m(
          'td',
          m(
            'div',
            {
              class:
                'tw:flex tw:flex-wrap tw:items-center tw:gap-x-2 tw:gap-y-1',
            },
            [
              m('span', { 'data-testid': 'token-name' }, attrs.token.name),
              badge &&
                m(
                  'span',
                  {
                    class: `tw:d-badge tw:d-badge-sm tw:border-transparent tw:whitespace-nowrap ${badge.class}`,
                    'data-testid': 'token-status',
                  },
                  badge.label
                ),
            ]
          )
        ),
        renderTimestampCell(attrs.token.iat),
        renderTimestampCell(attrs.token.nbf),
        renderTimestampCell(attrs.token.exp),
        // Without vertical padding the button sits within the text rows'
        // height instead of stretching every row.
        m('td', { class: 'tw:py-0 tw:pr-1' }, [
          m(
            'button',
            {
              class:
                'tw:d-btn tw:d-btn-ghost tw:d-btn-sm tw:gap-1.5 tw:font-normal tw:text-base-content/70 tw:hover:text-base-content',
              'aria-label': `Delete ${attrs.token.name}`,
              'data-testid': 'delete-token-button',
              onclick: attrs.ondelete,
            },
            [
              m(Icon, { icon: faTrashCan, class: 'tw:h-3.5 tw:w-3.5' }),
              'Delete',
            ]
          ),
        ]),
      ]
    );
  },
};

export default TokenRow;
