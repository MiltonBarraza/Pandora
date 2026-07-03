import type { CombineOutputColumn, CombineResultSort, CombinedRow } from '../../types/combine';

export const defaultCombineResultSort: CombineResultSort = {
  sortColumnId: null,
  sortDirection: 'asc',
};

export function sortCombinedRows(
  rows: CombinedRow[],
  resultSort: CombineResultSort,
  outputColumns: CombineOutputColumn[],
) {
  if (!resultSort.sortColumnId || !outputColumns.some((column) => column.id === resultSort.sortColumnId)) {
    return rows;
  }

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const comparison = compareCombinedCellValues(
        left.row.values[resultSort.sortColumnId ?? ''],
        right.row.values[resultSort.sortColumnId ?? ''],
        resultSort.sortDirection,
      );
      return comparison || left.index - right.index;
    })
    .map(({ row }) => row);
}

export function normalizeCombineResultSort(
  resultSort: CombineResultSort,
  outputColumns: CombineOutputColumn[],
): CombineResultSort {
  if (!resultSort.sortColumnId || outputColumns.some((column) => column.id === resultSort.sortColumnId)) {
    return resultSort;
  }

  return defaultCombineResultSort;
}

function compareCombinedCellValues(
  leftValue: string | undefined,
  rightValue: string | undefined,
  direction: CombineResultSort['sortDirection'],
) {
  const left = normalizeSortableValue(leftValue);
  const right = normalizeSortableValue(rightValue);

  if (left.isEmpty || right.isEmpty) {
    if (left.isEmpty && right.isEmpty) {
      return 0;
    }
    return left.isEmpty ? 1 : -1;
  }

  const directionMultiplier = direction === 'asc' ? 1 : -1;
  const numericComparison = compareNumericValues(left.value, right.value);
  if (numericComparison !== null) {
    return numericComparison * directionMultiplier;
  }

  return left.value.localeCompare(right.value) * directionMultiplier;
}

function normalizeSortableValue(value: string | undefined) {
  const normalized = String(value ?? '').trim();
  return {
    value: normalized,
    isEmpty: normalized === '',
  };
}

function compareNumericValues(leftValue: string, rightValue: string) {
  const leftNumber = parseSortableNumber(leftValue);
  const rightNumber = parseSortableNumber(rightValue);

  if (leftNumber === null || rightNumber === null) {
    return null;
  }

  return leftNumber - rightNumber;
}

function parseSortableNumber(value: string) {
  if (!/^[+-]?\d+(?:[.,]\d+)?$/.test(value)) {
    return null;
  }

  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}
