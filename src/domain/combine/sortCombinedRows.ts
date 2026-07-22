import type { CombinedRow, ResultSort } from '../../types/combine';

const textCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export function sortCombinedRows(rows: CombinedRow[], sort: ResultSort): CombinedRow[] {
  if (!sort.columnId) {
    return rows;
  }

  const entries = rows.map((row, index) => {
    const value = row.values[sort.columnId!] ?? '';
    return { row, index, value, numericValue: parseSafeNumber(value) };
  });
  const useNumericComparison = entries.every(({ value, numericValue }) => (
    value.trim() === '' || numericValue !== null
  ));

  return entries
    .sort((left, right) => {
      const leftEmpty = left.value.trim() === '';
      const rightEmpty = right.value.trim() === '';
      if (leftEmpty !== rightEmpty) {
        return leftEmpty ? 1 : -1;
      }
      if (leftEmpty && rightEmpty) {
        return left.index - right.index;
      }

      const comparison = useNumericComparison
        ? left.numericValue! - right.numericValue!
        : textCollator.compare(left.value, right.value);
      return comparison === 0
        ? left.index - right.index
        : comparison * (sort.direction === 'asc' ? 1 : -1);
    })
    .map(({ row }) => row);
}

export function parseSafeNumber(value: string): number | null {
  const compact = value.trim().replace(/^\$\s*/, '').replace(/\s+/g, '');
  if (!/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(compact)) {
    return null;
  }
  const parsed = Number(compact.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}
