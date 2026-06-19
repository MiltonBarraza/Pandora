import { describe, expect, it } from 'vitest';
import type { ColumnAnalysis, IgnoredReason } from '../../../types/import';
import {
  activateAllColumns,
  clearColumnSearchValue,
  containsEveryNumber,
  filterColumnsBySearch,
  getAppliedFilterState,
  getAppliedSuggestionGroups,
  getColumnDetail,
  getColumnDetailEmptyMessage,
  getColumnDisplayLabel,
  getColumnTransferEmptyMessage,
  getSafeSelectedColumnIndex,
  getSelectedColumn,
  restoreAutomaticColumnDetection,
  sameNumberSet,
  toggleColumnsByAutomaticReasons,
} from '../ColumnVisibilityManager';

describe('ColumnVisibilityManager quick actions', () => {
  it('activates all columns idempotently', () => {
    const once = activateAllColumns(createObservedColumns());
    const twice = activateAllColumns(once);

    expect(countVisibility(once)).toEqual({ active: 43, ignored: 0 });
    expect(countVisibility(twice)).toEqual({ active: 43, ignored: 0 });
    expect(twice.every((column) => column.ignoredReason === undefined)).toBe(true);
  });

  it('applies suggested empty columns from an all-active state', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const result = toggleColumnsByAutomaticReasons(allActive, ['empty']);

    expect(countVisibility(result)).toEqual({ active: 39, ignored: 4 });
    expect(getAppliedSuggestionGroups(result)).toEqual({ empty: true, hiddenOrNarrow: false });
    expect(getAppliedFilterState(result)).toEqual({ empty: true, hidden: false, customLabel: undefined });
  });

  it('removes suggested empty columns when that group is already applied', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const emptyIgnored = toggleColumnsByAutomaticReasons(allActive, ['empty']);
    const emptyRestored = toggleColumnsByAutomaticReasons(emptyIgnored, ['empty']);

    expect(countVisibility(emptyRestored)).toEqual({ active: 43, ignored: 0 });
    expect(getAppliedSuggestionGroups(emptyRestored)).toEqual({ empty: false, hiddenOrNarrow: false });
  });

  it('applies suggested hidden and narrow columns from an all-active state', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const result = toggleColumnsByAutomaticReasons(allActive, ['hidden', 'narrow']);

    expect(countVisibility(result)).toEqual({ active: 9, ignored: 34 });
    expect(getAppliedSuggestionGroups(result)).toEqual({ empty: false, hiddenOrNarrow: true });
    expect(getAppliedFilterState(result)).toEqual({ empty: false, hidden: true, customLabel: undefined });
  });

  it('removes suggested hidden and narrow columns when that group is already applied', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const hiddenOrNarrowIgnored = toggleColumnsByAutomaticReasons(allActive, ['hidden', 'narrow']);
    const hiddenOrNarrowRestored = toggleColumnsByAutomaticReasons(hiddenOrNarrowIgnored, ['hidden', 'narrow']);

    expect(countVisibility(hiddenOrNarrowRestored)).toEqual({ active: 43, ignored: 0 });
    expect(getAppliedSuggestionGroups(hiddenOrNarrowRestored)).toEqual({ empty: false, hiddenOrNarrow: false });
  });

  it('restores automatic detection idempotently', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const once = restoreAutomaticColumnDetection(allActive);
    const twice = restoreAutomaticColumnDetection(once);

    expect(countVisibility(once)).toEqual({ active: 5, ignored: 38 });
    expect(countVisibility(twice)).toEqual({ active: 5, ignored: 38 });
  });

  it('reports both quick filters when empty and hidden filters are combined', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const emptyIgnored = toggleColumnsByAutomaticReasons(allActive, ['empty']);
    const bothIgnored = toggleColumnsByAutomaticReasons(emptyIgnored, ['hidden', 'narrow']);
    const onlyHiddenOrNarrowIgnored = toggleColumnsByAutomaticReasons(bothIgnored, ['empty']);
    const onlyEmptyIgnored = toggleColumnsByAutomaticReasons(bothIgnored, ['hidden', 'narrow']);

    expect(countVisibility(emptyIgnored)).toEqual({ active: 39, ignored: 4 });
    expect(countVisibility(bothIgnored)).toEqual({ active: 5, ignored: 38 });
    expect(getAppliedFilterState(bothIgnored)).toEqual({ empty: true, hidden: true, customLabel: undefined });
    expect(getAppliedSuggestionGroups(bothIgnored)).toEqual({ empty: true, hiddenOrNarrow: true });
    expect(countVisibility(onlyHiddenOrNarrowIgnored)).toEqual({ active: 9, ignored: 34 });
    expect(getAppliedSuggestionGroups(onlyHiddenOrNarrowIgnored)).toEqual({ empty: false, hiddenOrNarrow: true });
    expect(countVisibility(onlyEmptyIgnored)).toEqual({ active: 39, ignored: 4 });
    expect(getAppliedSuggestionGroups(onlyEmptyIgnored)).toEqual({ empty: true, hiddenOrNarrow: false });
  });

  it('does not affect manually ignored columns outside the toggled group', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const manuallyIgnoredFirstColumn = allActive.map((column) =>
      column.columnIndex === 0 ? { ...column, ignored: true, ignoredReason: 'manual' as const } : column,
    );
    const emptyIgnored = toggleColumnsByAutomaticReasons(manuallyIgnoredFirstColumn, ['empty']);
    const emptyRestored = toggleColumnsByAutomaticReasons(emptyIgnored, ['empty']);

    expect(emptyRestored[0]).toMatchObject({ ignored: true, ignoredReason: 'manual' });
    expect(countVisibility(emptyRestored)).toEqual({ active: 42, ignored: 1 });
  });

  it('reports personalizado when manual changes do not match a quick filter', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const manuallyIgnoredFirstColumn = allActive.map((column) =>
      column.columnIndex === 0 ? { ...column, ignored: true, ignoredReason: 'manual' as const } : column,
    );

    expect(getAppliedFilterState(manuallyIgnoredFirstColumn)).toEqual({
      empty: false,
      hidden: false,
      customLabel: 'Personalizado: 1 ignorada manualmente',
    });
  });

  it('reports no applied suggestion groups when all suggested columns are active', () => {
    const allActive = activateAllColumns(createObservedColumns());

    expect(getAppliedSuggestionGroups(allActive)).toEqual({ empty: false, hiddenOrNarrow: false });
    expect(getAppliedFilterState(allActive)).toEqual({ empty: false, hidden: false });
  });

  it('reports initial automatic filters as empty and hidden without personalizado', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const emptyIgnored = toggleColumnsByAutomaticReasons(allActive, ['empty']);
    const emptyAndHiddenIgnored = toggleColumnsByAutomaticReasons(emptyIgnored, ['hidden', 'narrow']);

    expect(getAppliedSuggestionGroups(emptyIgnored)).toEqual({ empty: true, hiddenOrNarrow: false });
    expect(getAppliedSuggestionGroups(emptyAndHiddenIgnored)).toEqual({ empty: true, hiddenOrNarrow: true });
    expect(getAppliedFilterState(restoreAutomaticColumnDetection(allActive))).toEqual({
      empty: true,
      hidden: true,
      customLabel: undefined,
    });
  });

  it('reports suggested filters plus manual changes when current set includes extras', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const emptyIgnored = toggleColumnsByAutomaticReasons(allActive, ['empty']);
    const bothIgnored = toggleColumnsByAutomaticReasons(emptyIgnored, ['hidden', 'narrow']);
    const withManualIgnoredColumn = bothIgnored.map((column) =>
      column.columnIndex === 0 ? { ...column, ignored: true, ignoredReason: 'manual' as const } : column,
    );

    expect(getAppliedFilterState(withManualIgnoredColumn)).toEqual({
      empty: true,
      hidden: true,
      customLabel: 'Personalizado: 1 ignorada manualmente',
    });
    expect(getAppliedSuggestionGroups(withManualIgnoredColumn)).toEqual({ empty: true, hiddenOrNarrow: true });
  });

  it('reports manual activation when user activates a suggested empty column', () => {
    const restoredAutomatic = restoreAutomaticColumnDetection(createObservedColumns());
    const oneEmptyColumnActivated = restoredAutomatic.map((column) =>
      column.autoIgnoredReason === 'empty' && column.columnIndex === 5
        ? { ...column, ignored: false, ignoredReason: undefined }
        : column,
    );

    expect(getAppliedFilterState(oneEmptyColumnActivated)).toEqual({
      empty: false,
      hidden: true,
      customLabel: 'Personalizado: 1 activada manualmente',
    });
  });

  it('reports both manual activation and manual ignore when both differences exist', () => {
    const restoredAutomatic = restoreAutomaticColumnDetection(createObservedColumns());
    const mixedManualChanges = restoredAutomatic.map((column) => {
      if (column.autoIgnoredReason === 'empty' && column.columnIndex === 5) {
        return { ...column, ignored: false, ignoredReason: undefined };
      }

      if (column.columnIndex === 0) {
        return { ...column, ignored: true, ignoredReason: 'manual' as const };
      }

      return column;
    });

    expect(getAppliedFilterState(mixedManualChanges)).toEqual({
      empty: false,
      hidden: true,
      customLabel: 'Personalizado: 1 activadas, 1 ignoradas',
    });
  });

  it('compares number sets without depending on order or duplicates', () => {
    expect(sameNumberSet([5, 2, 2, 9], [9, 5, 2])).toBe(true);
    expect(sameNumberSet([5, 2, 9], [5, 2])).toBe(false);
    expect(containsEveryNumber([5, 2, 2, 9], [9, 5])).toBe(true);
    expect(containsEveryNumber([5, 2], [5, 9])).toBe(false);
  });

  it('builds the visible column label from alias, header, then column letter', () => {
    expect(getColumnDisplayLabel({ alias: ' SKU ', header: 'Codigo', columnLetter: 'A' })).toBe('SKU');
    expect(getColumnDisplayLabel({ alias: ' ', header: ' Codigo ', columnLetter: 'A' })).toBe('Codigo');
    expect(getColumnDisplayLabel({ alias: '', header: '', columnLetter: 'A' })).toBe('A');
  });

  it('filters available columns by alias, header, letter, reason, samples and data count', () => {
    const columns = [
      createColumn(0, 'empty', { alias: 'Proveedor', header: 'Nombre', sampleValues: ['Acme'], nonEmptyCount: 0 }),
      createColumn(1, 'hidden', { header: 'Precio', sampleValues: ['123'], nonEmptyCount: 4 }),
      createColumn(2, 'narrow', { header: 'SKU', sampleValues: ['ZX-9'], nonEmptyCount: 7 }),
      createColumn(16, 'narrow', { header: 'Total', sampleValues: ['999'], nonEmptyCount: 2 }),
    ];

    expect(filterColumnsBySearch(columns, 'proveedor').map((column) => column.columnIndex)).toEqual([0]);
    expect(filterColumnsBySearch(columns, 'precio').map((column) => column.columnIndex)).toEqual([1]);
    expect(filterColumnsBySearch(columns, 'Q').map((column) => column.columnIndex)).toEqual([16]);
    expect(filterColumnsBySearch(columns, 'oculta').map((column) => column.columnIndex)).toEqual([1]);
    expect(filterColumnsBySearch(columns, 'zx-9').map((column) => column.columnIndex)).toEqual([2]);
    expect(filterColumnsBySearch(columns, '7').map((column) => column.columnIndex)).toEqual([2]);
  });

  it('does not let one-letter searches match common reason labels', () => {
    const columns = [
      createColumn(0, 'hidden', { header: 'SKU', sampleValues: ['A1'], nonEmptyCount: 1 }),
      createColumn(1, 'empty', { header: 'EAN', sampleValues: [], nonEmptyCount: 0 }),
    ];

    expect(filterColumnsBySearch(columns, 'o')).toEqual([]);
    expect(filterColumnsBySearch(columns, 'oc').map((column) => column.columnIndex)).toEqual([0]);
    expect(filterColumnsBySearch(columns, 'va').map((column) => column.columnIndex)).toEqual([1]);
  });

  it('filters active columns independently from available columns', () => {
    const activeColumns = activateAllColumns([
      createColumn(0, undefined, { alias: 'Código interno', header: 'SKU', sampleValues: ['A-1'] }),
      createColumn(1, undefined, { header: 'Descripción', sampleValues: ['Pincel'] }),
    ]);

    expect(filterColumnsBySearch(activeColumns, 'descripción').map((column) => column.columnIndex)).toEqual([1]);
    expect(filterColumnsBySearch(activeColumns, 'código').map((column) => column.columnIndex)).toEqual([0]);
  });

  it('clears column search to an empty value', () => {
    expect(clearColumnSearchValue()).toBe('');
  });

  it('uses a search empty state only when real columns exist but none match', () => {
    expect(getColumnTransferEmptyMessage({
      count: 0,
      visibleCount: 0,
      emptyMessage: 'No hay columnas disponibles para activar.',
      emptySearchMessage: 'No hay columnas disponibles que coincidan con la búsqueda.',
    })).toBe('No hay columnas disponibles para activar.');

    expect(getColumnTransferEmptyMessage({
      count: 3,
      visibleCount: 0,
      emptyMessage: 'No hay columnas activas.',
      emptySearchMessage: 'No hay columnas activas que coincidan con la búsqueda.',
    })).toBe('No hay columnas activas que coincidan con la búsqueda.');
  });

  it('selects an available column and builds its detail', () => {
    const columns = [
      createColumn(0),
      createColumn(1, 'hidden', {
        alias: 'Costo visual',
        header: 'Costo',
        sampleValues: ['10', '20'],
        nonEmptyCount: 2,
      }),
    ];
    const selectedColumn = getSelectedColumn(columns, 1);

    expect(selectedColumn?.columnIndex).toBe(1);
    expect(selectedColumn ? getColumnDetail(selectedColumn) : null).toEqual({
      label: 'Costo visual',
      columnLetter: 'B',
      header: 'Costo',
      alias: 'Costo visual',
      status: 'Disponible',
      automaticReason: 'Oculta',
      nonEmptyCount: '2',
      examples: ['10', '20'],
    });
  });

  it('selects an active column and builds its detail', () => {
    const columns = [
      createColumn(0, undefined, {
        header: 'SKU',
        sampleValues: ['A-1'],
        nonEmptyCount: 7,
      }),
    ];
    const selectedColumn = getSelectedColumn(columns, 0);

    expect(selectedColumn ? getColumnDetail(selectedColumn) : null).toMatchObject({
      label: 'SKU',
      columnLetter: 'A',
      status: 'Activa',
      automaticReason: '-',
      nonEmptyCount: '7',
      examples: ['A-1'],
    });
  });

  it('keeps selection when the same column is activated or removed', () => {
    const selectedColumnIndex = 1;
    const availableColumns = [createColumn(1, 'empty')];
    const activeColumns = activateAllColumns(availableColumns);
    const removedAgain = activeColumns.map((column) => (
      column.columnIndex === selectedColumnIndex
        ? { ...column, ignored: true, ignoredReason: 'manual' as const }
        : column
    ));

    expect(getSafeSelectedColumnIndex(activeColumns, selectedColumnIndex)).toBe(selectedColumnIndex);
    expect(getSafeSelectedColumnIndex(removedAgain, selectedColumnIndex)).toBe(selectedColumnIndex);
  });

  it('keeps selected column detail even when search hides that column', () => {
    const columns = [
      createColumn(0, undefined, { header: 'SKU', sampleValues: ['A-1'] }),
      createColumn(1, undefined, { header: 'Descripción', sampleValues: ['Pincel'] }),
    ];
    const visibleColumns = filterColumnsBySearch(columns, 'descripción');
    const selectedColumn = getSelectedColumn(columns, 0);

    expect(visibleColumns.map((column) => column.columnIndex)).toEqual([1]);
    expect(selectedColumn?.columnIndex).toBe(0);
    expect(selectedColumn ? getColumnDetail(selectedColumn).header : null).toBe('SKU');
  });

  it('shows an initial detail empty state without selection', () => {
    expect(getSelectedColumn(createObservedColumns(), null)).toBeNull();
    expect(getColumnDetailEmptyMessage()).toBe('Seleccioná una columna para ver sus detalles y ejemplos.');
  });

  it('clears selection safely when selected column no longer exists', () => {
    const columns = [createColumn(0), createColumn(1)];
    const withoutSelectedColumn = columns.filter((column) => column.columnIndex !== 1);

    expect(getSafeSelectedColumnIndex(columns, 1)).toBe(1);
    expect(getSafeSelectedColumnIndex(withoutSelectedColumn, 1)).toBeNull();
  });
});

function createObservedColumns() {
  return [
    ...Array.from({ length: 5 }, (_, index) => createColumn(index)),
    ...Array.from({ length: 4 }, (_, index) => createColumn(index + 5, 'empty')),
    ...Array.from({ length: 20 }, (_, index) => createColumn(index + 9, 'narrow')),
    ...Array.from({ length: 14 }, (_, index) => createColumn(index + 29, 'hidden')),
  ];
}

function createColumn(
  columnIndex: number,
  autoIgnoredReason?: IgnoredReason,
  overrides: Partial<ColumnAnalysis> = {},
): ColumnAnalysis {
  return {
    columnIndex,
    columnLetter: String.fromCharCode(65 + (columnIndex % 26)),
    sampleValues: overrides.sampleValues ?? [],
    nonEmptyCount: overrides.nonEmptyCount ?? (autoIgnoredReason === 'empty' ? 0 : 1),
    isEmpty: autoIgnoredReason === 'empty',
    ignored: Boolean(autoIgnoredReason),
    ignoredReason: autoIgnoredReason,
    autoIgnored: Boolean(autoIgnoredReason),
    autoIgnoredReason,
    ...overrides,
  };
}

function countVisibility(columns: ColumnAnalysis[]) {
  const ignored = columns.filter((column) => column.ignored).length;
  return {
    active: columns.length - ignored,
    ignored,
  };
}
