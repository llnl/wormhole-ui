export type SortDirection = 'ascending' | 'descending';

export interface SortableColumn {
  key: string;
  direction: SortDirection | null;
  toggle: () => void;
}

const collator = new Intl.Collator(undefined, { numeric: true });

/**
 * Sort state for a table. Each column maps a row to the value it sorts by;
 * null values sort last in either direction.
 */
export class TableSort<T, K extends string> {
  private key: K;

  public constructor(
    private readonly columns: Record<K, (row: T) => string | number | null>,
    initialKey: NoInfer<K>,
    private direction: SortDirection = 'ascending'
  ) {
    this.key = initialKey;
  }

  public column(key: K): SortableColumn {
    return {
      key,
      direction: key === this.key ? this.direction : null,
      toggle: () => {
        this.direction =
          key === this.key && this.direction === 'ascending'
            ? 'descending'
            : 'ascending';
        this.key = key;
      },
    };
  }

  public apply(rows: readonly T[]): T[] {
    const value = this.columns[this.key];
    const order = this.direction === 'ascending' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      if (x === null || y === null) {
        return Number(x === null) - Number(y === null);
      }
      return (
        order *
        (typeof x === 'number' && typeof y === 'number'
          ? x - y
          : collator.compare(String(x), String(y)))
      );
    });
  }
}
