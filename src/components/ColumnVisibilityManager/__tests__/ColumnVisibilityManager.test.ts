import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ColumnAnalysis, IgnoredReason } from '../../../types/import';
import {
  ColumnVisibilityManager,
  ColumnExamplesTooltipContent,
  activateAllColumns,
  clearColumnSearchValue,
  containsEveryNumber,
  deactivateAllColumns,
  filterColumnsBySearch,
  getAppliedFilterState,
  getAppliedSuggestionGroups,
  getActiveColumnDragId,
  getAvailableColumnDetails,
  getAvailableColumns,
  getColumnBaseDisplayLabel,
  getColumnAutomaticReasons,
  getColumnCurrentIgnoredReasons,
  getColumnDisplayLabel,
  getColumnExamples,
  getColumnExamplesTooltipContent,
  getColumnIdentityLabel,
  getColumnReasonLabel,
  getColumnTransferEmptyMessage,
  getColumnVisibleReasonLabels,
  getOrderedActiveColumns,
  getSafeSelectedColumnIndex,
  getSelectedColumn,
  hasActiveColumns,
  reorderActiveColumnOrder,
  restoreAutomaticColumnDetection,
  sameNumberSet,
  shouldRenderColumnDetailPanel,
  shouldShowColumnDataCount,
  syncActiveColumnOrder,
  toggleColumnsByAutomaticReasons,
} from '../ColumnVisibilityManager';

describe('ColumnVisibilityManager quick actions', () => {
  it('keeps only ignored columns with data in the available list, including hidden ones', () => {
    const empty = createColumn(0, 'empty');
    const hidden = createColumn(1, 'hidden', { isHidden: true, nonEmptyCount: 3 });
    const active = createColumn(2);

    expect(getAvailableColumns([empty, hidden, active])).toEqual([hidden]);
  });

  it('uses simplified visible labels for suggested filters and reasons', () => {
    expect(getColumnReasonLabel('empty')).toBe('Sin datos');
    expect(getColumnReasonLabel('hidden')).toBe('Oculta');
    expect(getColumnReasonLabel('narrow')).toBe('Oculta');
  });

  it('shows every visible reason for a column with multiple automatic reasons', () => {
    const column = createColumn(1, 'hidden', {
      autoIgnoredReasons: ['hidden', 'empty'],
      ignoredReasons: ['hidden', 'empty'],
      isEmpty: true,
      isHidden: true,
    });

    expect(getColumnAutomaticReasons(column)).toEqual(['hidden', 'empty']);
    expect(getColumnCurrentIgnoredReasons(column)).toEqual(['hidden', 'empty']);
    expect(getColumnVisibleReasonLabels(column)).toEqual(['Oculta', 'Sin datos']);
  });

  it('hides the zero data count when the empty reason is already visible', () => {
    expect(shouldShowColumnDataCount({ nonEmptyCount: 0 }, ['Sin datos'])).toBe(false);
    expect(shouldShowColumnDataCount({ nonEmptyCount: 4 }, ['Sin datos'])).toBe(true);
    expect(shouldShowColumnDataCount({ nonEmptyCount: 0 }, ['Oculta'])).toBe(true);
  });

  it('activates all columns idempotently', () => {
    const once = activateAllColumns(createObservedColumns());
    const twice = activateAllColumns(once);

    expect(countVisibility(once)).toEqual({ active: 43, ignored: 0 });
    expect(countVisibility(twice)).toEqual({ active: 43, ignored: 0 });
    expect(twice.every((column) => column.ignoredReason === undefined)).toBe(true);
    expect(twice.every((column) => column.ignoredReasons === undefined)).toBe(true);
  });

  it('deactivates all active columns while preserving aliases and automatic reasons', () => {
    const columns = activateAllColumns([
      createColumn(0, undefined, { alias: 'Codigo manual' }),
      createColumn(1, 'empty', { alias: 'EAN', header: 'Codigo de barras' }),
      createMultiReasonColumn(2),
    ]);
    const result = deactivateAllColumns(columns);

    expect(countVisibility(result)).toEqual({ active: 0, ignored: 3 });
    expect(result[0]).toMatchObject({ ignored: true, ignoredReason: 'manual', ignoredReasons: ['manual'], alias: 'Codigo manual' });
    expect(result[1]).toMatchObject({ ignored: true, ignoredReason: 'empty', ignoredReasons: ['empty'], alias: 'EAN' });
    expect(result[2]).toMatchObject({ ignored: true, ignoredReason: 'hidden', ignoredReasons: ['hidden', 'empty'] });
  });

  it('reports no active columns for disabling the remove-all action', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const noneActive = deactivateAllColumns(allActive);

    expect(hasActiveColumns(allActive)).toBe(true);
    expect(hasActiveColumns(noneActive)).toBe(false);
  });

  it('restores suggested filters after all columns are removed', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const noneActive = deactivateAllColumns(allActive);
    const restored = restoreAutomaticColumnDetection(noneActive);

    expect(countVisibility(noneActive)).toEqual({ active: 0, ignored: 43 });
    expect(countVisibility(restored)).toEqual({ active: 5, ignored: 38 });
    expect(getAppliedFilterState(restored)).toEqual({ empty: true, hidden: true, customLabel: undefined });
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

  it('keeps a column with both automatic reasons ignored while one matching filter remains active', () => {
    const columns = [createMultiReasonColumn(0), createColumn(1)];
    const allActive = activateAllColumns(columns);
    const onlyEmptyIgnored = toggleColumnsByAutomaticReasons(allActive, ['empty']);
    const bothIgnored = toggleColumnsByAutomaticReasons(onlyEmptyIgnored, ['hidden', 'narrow']);
    const onlyHiddenIgnored = toggleColumnsByAutomaticReasons(bothIgnored, ['empty']);
    const restoredActive = toggleColumnsByAutomaticReasons(onlyHiddenIgnored, ['hidden', 'narrow']);

    expect(onlyEmptyIgnored[0]).toMatchObject({ ignored: true, ignoredReason: 'empty', ignoredReasons: ['empty'] });
    expect(getAppliedFilterState(onlyEmptyIgnored)).toEqual({ empty: true, hidden: false, customLabel: undefined });
    expect(bothIgnored[0]).toMatchObject({ ignored: true, ignoredReason: 'hidden', ignoredReasons: ['hidden', 'empty'] });
    expect(getAppliedFilterState(bothIgnored)).toEqual({ empty: true, hidden: true, customLabel: undefined });
    expect(onlyHiddenIgnored[0]).toMatchObject({ ignored: true, ignoredReason: 'hidden', ignoredReasons: ['hidden'] });
    expect(getAppliedFilterState(onlyHiddenIgnored)).toEqual({ empty: false, hidden: true, customLabel: undefined });
    expect(restoredActive[0]).toMatchObject({ ignored: false, ignoredReason: undefined, ignoredReasons: undefined });
  });

  it('manually reactivates a column with both automatic reasons and restore applies both again', () => {
    const restoredAutomatic = restoreAutomaticColumnDetection([createMultiReasonColumn(0), createColumn(1)]);
    const manuallyActivated = restoredAutomatic.map((column) =>
      column.columnIndex === 0 ? { ...column, ignored: false, ignoredReason: undefined, ignoredReasons: undefined } : column,
    );
    const restoredAgain = restoreAutomaticColumnDetection(manuallyActivated);

    expect(getAppliedFilterState(manuallyActivated)).toEqual({ empty: false, hidden: false });
    expect(restoredAgain[0]).toMatchObject({ ignored: true, ignoredReason: 'hidden', ignoredReasons: ['hidden', 'empty'] });
    expect(getAppliedFilterState(restoredAgain)).toEqual({ empty: true, hidden: true, customLabel: undefined });
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

  it('builds active item title from base column identity without alias', () => {
    expect(getColumnBaseDisplayLabel({ header: ' Codigo ', columnLetter: 'A' })).toBe('Codigo');
    expect(getColumnBaseDisplayLabel({ header: '', columnLetter: 'A' })).toBe('A');
    expect(getColumnIdentityLabel({ header: ' Precio ', columnLetter: 'J' })).toBe('Columna: J · Precio');
    expect(getColumnIdentityLabel({ header: '', columnLetter: 'J' })).toBe('Columna: J');
    expect(getAvailableColumnDetails({ alias: ' Alias largo ', header: 'Header' })).toEqual([{ label: 'Alias:', value: 'Alias largo' }]);
    expect(getAvailableColumnDetails({ alias: '', header: ' Header largo ' })).toEqual([{ label: 'Encabezado:', value: 'Header largo' }]);
  });

  it('filters columns only by alias, header or fallback letter', () => {
    const columns = [
      createColumn(0, 'empty', { alias: 'Proveedor', header: 'Nombre', sampleValues: ['Acme'], nonEmptyCount: 0 }),
      createColumn(1, 'hidden', { header: 'Precio', sampleValues: ['123'], nonEmptyCount: 4 }),
      createColumn(2, 'narrow', { header: 'SKU', sampleValues: ['ZX-9'], nonEmptyCount: 7 }),
      createColumn(16, 'narrow', { header: '', sampleValues: ['999'], nonEmptyCount: 2 }),
    ];

    expect(filterColumnsBySearch(columns, 'proveedor').map((column) => column.columnIndex)).toEqual([0]);
    expect(filterColumnsBySearch(columns, 'nombre')).toEqual([]);
    expect(filterColumnsBySearch(columns, 'precio').map((column) => column.columnIndex)).toEqual([1]);
    expect(filterColumnsBySearch(columns, 'Q').map((column) => column.columnIndex)).toEqual([16]);
    expect(filterColumnsBySearch(columns, 'zx-9')).toEqual([]);
    expect(filterColumnsBySearch(columns, '7')).toEqual([]);
  });

  it('does not match unrelated columns by auxiliary text or partial column letters', () => {
    const columns = [
      createColumn(9, 'hidden', { header: 'SKU', sampleValues: ['A1'], nonEmptyCount: 1 }),
      createColumn(10, 'empty', { header: 'EAN', sampleValues: [], nonEmptyCount: 0 }),
      createColumn(15, undefined, { header: 'Papelera', sampleValues: ['Muestra oculta'], nonEmptyCount: 12 }),
    ];

    expect(filterColumnsBySearch(columns, 'pa').map((column) => column.columnIndex)).toEqual([15]);
    expect(filterColumnsBySearch(columns, 'p').map((column) => column.columnIndex)).toEqual([15]);
    expect(filterColumnsBySearch(columns, 'muestra')).toEqual([]);
    expect(filterColumnsBySearch(columns, 'j')).toEqual([]);
    expect(filterColumnsBySearch(columns, 'k').map((column) => column.columnIndex)).toEqual([9]);
    expect(filterColumnsBySearch(columns, '1')).toEqual([]);
    expect(filterColumnsBySearch(columns, 'datos')).toEqual([]);
    expect(filterColumnsBySearch(columns, 'columna')).toEqual([]);
    expect(filterColumnsBySearch(columns, 'alias')).toEqual([]);
  });

  it('does not match automatic reason labels in search', () => {
    const columns = [
      createColumn(0, 'hidden', { header: 'SKU', sampleValues: ['A1'], nonEmptyCount: 1 }),
      createColumn(1, 'empty', { header: 'EAN', sampleValues: [], nonEmptyCount: 0 }),
    ];

    expect(filterColumnsBySearch(columns, 'o')).toEqual([]);
    expect(filterColumnsBySearch(columns, 'oc')).toEqual([]);
    expect(filterColumnsBySearch(columns, 'oculta')).toEqual([]);
    expect(filterColumnsBySearch(columns, 'va')).toEqual([]);
    expect(filterColumnsBySearch(columns, 'vacia')).toEqual([]);
  });

  it('filters active columns independently from available columns', () => {
    const activeColumns = activateAllColumns([
      createColumn(0, undefined, { alias: 'Código interno', header: 'SKU', sampleValues: ['A-1'] }),
      createColumn(1, undefined, { header: 'Descripción', sampleValues: ['Pincel'] }),
    ]);

    expect(filterColumnsBySearch(activeColumns, 'descripción').map((column) => column.columnIndex)).toEqual([1]);
    expect(filterColumnsBySearch(activeColumns, 'código').map((column) => column.columnIndex)).toEqual([0]);
  });

  it('reorders active columns visually without changing column indexes or aliases', () => {
    const activeColumns = activateAllColumns([
      createColumn(0, undefined, { alias: 'Código interno' }),
      createColumn(1, undefined, { alias: 'Descripción' }),
      createColumn(2, undefined, { alias: 'Precio' }),
    ]);
    const reorderedOrder = reorderActiveColumnOrder([0, 1, 2], [0, 1, 2], [2, 0, 1]);
    const orderedColumns = getOrderedActiveColumns(activeColumns, reorderedOrder);

    expect(orderedColumns.map((column) => column.columnIndex)).toEqual([2, 0, 1]);
    expect(orderedColumns.map((column) => column.alias)).toEqual(['Precio', 'Código interno', 'Descripción']);
    expect(activeColumns.map((column) => column.columnIndex)).toEqual([0, 1, 2]);
  });

  it('keeps available columns out of active drag ordering', () => {
    const activeColumns = activateAllColumns([createColumn(0), createColumn(2)]);
    const availableColumn = createColumn(1, 'empty');

    expect(syncActiveColumnOrder([0, 1, 2], activeColumns)).toEqual([0, 2]);
    expect(getOrderedActiveColumns(activeColumns, [2, 0]).map((column) => column.columnIndex)).toEqual([2, 0]);
    expect(availableColumn.ignored).toBe(true);
  });

  it('keeps activate and remove flows compatible with active visual ordering', () => {
    const activeColumns = activateAllColumns([createColumn(0), createColumn(2)]);
    const withActivatedColumn = [...activeColumns, { ...createColumn(1, 'empty'), ignored: false, ignoredReason: undefined, ignoredReasons: undefined }];
    const orderAfterActivate = syncActiveColumnOrder([2, 0], withActivatedColumn);
    const orderAfterRemove = syncActiveColumnOrder(orderAfterActivate, withActivatedColumn.filter((column) => column.columnIndex !== 2));

    expect(orderAfterActivate).toEqual([2, 0, 1]);
    expect(orderAfterRemove).toEqual([0, 1]);
  });

  it('reorders only visible active search results', () => {
    const currentOrder = [0, 1, 2, 3];

    expect(reorderActiveColumnOrder(currentOrder, [1, 3], [3, 1])).toEqual([0, 3, 2, 1]);
  });

  it('uses stable drag ids for active columns only', () => {
    expect(getActiveColumnDragId(7)).toBe('active-column-7');
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

  it('keeps selection for an available column without rendering the old detail panel', () => {
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
    expect(shouldRenderColumnDetailPanel()).toBe(false);
  });

  it('opens active column examples with a limited vertical tooltip payload', () => {
    const column = createColumn(0, undefined, {
      header: 'SKU',
      sampleValues: ['A-1', 'B-2', 'C-3', 'D-4', 'E-5', 'F-6', 'G-7', 'H-8', 'I-9', 'J-10', 'K-11'],
      nonEmptyCount: 7,
    });

    expect(getColumnExamples(column)).toEqual(['A-1', 'B-2', 'C-3', 'D-4', 'E-5', 'F-6', 'G-7', 'H-8', 'I-9', 'J-10']);
    expect(getColumnExamplesTooltipContent(column)).toBe('A-1\nB-2\nC-3\nD-4\nE-5\nF-6\nG-7\nH-8\nI-9\nJ-10');
  });

  it('renders active column actions as accessible icon buttons', () => {
    const originalDocument = globalThis.document;
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { body: {} },
    });

    let markup = '';
    try {
      markup = renderToStaticMarkup(createElement(ColumnVisibilityManager, {
        columns: [createColumn(0, undefined, { sampleValues: ['A-1'], nonEmptyCount: 1 })],
        onChange: () => undefined,
      }));
    } finally {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
    }

    expect(markup).toContain('aria-label="Ver ejemplos"');
    expect(markup).not.toContain('title="Ver ejemplos"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-label="Quitar columna A"');
    expect(markup).toContain('columnTransferIconAction');
    expect(markup).not.toContain('>Ver ejemplos</button>');
    expect(markup).not.toContain('>Quitar</button>');
  });

  it('labels the examples payload', () => {
    const markup = renderToStaticMarkup(createElement(ColumnExamplesTooltipContent, {
      column: createColumn(0, undefined, { sampleValues: ['A-1'] }),
    }));

    expect(markup).toContain('<strong>Datos de columna:</strong>');
    expect(markup).toContain('<span>A-1</span>');
  });

  it('shows an empty examples message when active column has no samples', () => {
    expect(getColumnExamplesTooltipContent(createColumn(0, undefined, { sampleValues: [] }))).toBe('Sin ejemplos disponibles.');
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

  it('keeps selected column even when search hides that column', () => {
    const columns = [
      createColumn(0, undefined, { header: 'SKU', sampleValues: ['A-1'] }),
      createColumn(1, undefined, { header: 'Descripción', sampleValues: ['Pincel'] }),
    ];
    const visibleColumns = filterColumnsBySearch(columns, 'descripción');
    const selectedColumn = getSelectedColumn(columns, 0);

    expect(visibleColumns.map((column) => column.columnIndex)).toEqual([1]);
    expect(selectedColumn?.columnIndex).toBe(0);
  });

  it('keeps empty selection state without rendering the old detail panel', () => {
    expect(getSelectedColumn(createObservedColumns(), null)).toBeNull();
    expect(shouldRenderColumnDetailPanel()).toBe(false);
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
  const autoIgnoredReasons = overrides.autoIgnoredReasons ?? (autoIgnoredReason ? [autoIgnoredReason] : undefined);
  const ignoredReasons = overrides.ignoredReasons ?? autoIgnoredReasons;

  return {
    columnIndex,
    columnLetter: String.fromCharCode(65 + (columnIndex % 26)),
    sampleValues: overrides.sampleValues ?? [],
    nonEmptyCount: overrides.nonEmptyCount ?? (autoIgnoredReason === 'empty' ? 0 : 1),
    isEmpty: autoIgnoredReason === 'empty',
    ignored: Boolean(autoIgnoredReason),
    ignoredReason: autoIgnoredReason,
    ignoredReasons,
    autoIgnored: Boolean(autoIgnoredReason),
    autoIgnoredReason,
    autoIgnoredReasons,
    ...overrides,
  };
}

function createMultiReasonColumn(columnIndex: number) {
  return createColumn(columnIndex, 'hidden', {
    autoIgnoredReasons: ['hidden', 'empty'],
    ignoredReasons: ['hidden', 'empty'],
    isHidden: true,
    isEmpty: true,
    nonEmptyCount: 0,
  });
}

function countVisibility(columns: ColumnAnalysis[]) {
  const ignored = columns.filter((column) => column.ignored).length;
  return {
    active: columns.length - ignored,
    ignored,
  };
}
