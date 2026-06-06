import { describe, expect, it } from 'vitest';
import type { ColumnAnalysis, IgnoredReason } from '../../../types/import';
import {
  activateAllColumns,
  getAppliedSuggestionGroups,
  restoreAutomaticColumnDetection,
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
  });

  it('removes suggested empty columns when that group is already applied', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const emptyIgnored = toggleColumnsByAutomaticReasons(allActive, ['empty']);
    const emptyRestored = toggleColumnsByAutomaticReasons(emptyIgnored, ['empty']);

    expect(countVisibility(emptyRestored)).toEqual({ active: 43, ignored: 0 });
    expect(getAppliedSuggestionGroups(emptyRestored)).toEqual({ empty: false, hiddenOrNarrow: false });
  });

  it('applies suggested hidden or narrow columns from an all-active state', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const result = toggleColumnsByAutomaticReasons(allActive, ['hidden', 'narrow']);

    expect(countVisibility(result)).toEqual({ active: 9, ignored: 34 });
    expect(getAppliedSuggestionGroups(result)).toEqual({ empty: false, hiddenOrNarrow: true });
  });

  it('removes suggested hidden or narrow columns when that group is already applied', () => {
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

  it('can apply both suggested groups and remove only one of them', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const emptyIgnored = toggleColumnsByAutomaticReasons(allActive, ['empty']);
    const bothIgnored = toggleColumnsByAutomaticReasons(emptyIgnored, ['hidden', 'narrow']);
    const onlyHiddenOrNarrowIgnored = toggleColumnsByAutomaticReasons(bothIgnored, ['empty']);
    const onlyEmptyIgnored = toggleColumnsByAutomaticReasons(bothIgnored, ['hidden', 'narrow']);

    expect(countVisibility(emptyIgnored)).toEqual({ active: 39, ignored: 4 });
    expect(countVisibility(bothIgnored)).toEqual({ active: 5, ignored: 38 });
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

  it('reports no applied suggestion groups when all suggested columns are active', () => {
    const allActive = activateAllColumns(createObservedColumns());

    expect(getAppliedSuggestionGroups(allActive)).toEqual({ empty: false, hiddenOrNarrow: false });
  });

  it('reports applied suggestion groups only when every column in the group is ignored', () => {
    const allActive = activateAllColumns(createObservedColumns());
    const emptyIgnored = toggleColumnsByAutomaticReasons(allActive, ['empty']);
    const emptyAndHiddenOrNarrowIgnored = toggleColumnsByAutomaticReasons(emptyIgnored, ['hidden', 'narrow']);

    expect(getAppliedSuggestionGroups(emptyIgnored)).toEqual({ empty: true, hiddenOrNarrow: false });
    expect(getAppliedSuggestionGroups(emptyAndHiddenOrNarrowIgnored)).toEqual({ empty: true, hiddenOrNarrow: true });
  });

  it('reports a suggested group as not applied when one matching column is active', () => {
    const restoredAutomatic = restoreAutomaticColumnDetection(createObservedColumns());
    const oneEmptyColumnActivated = restoredAutomatic.map((column) =>
      column.autoIgnoredReason === 'empty' && column.columnIndex === 5
        ? { ...column, ignored: false, ignoredReason: undefined }
        : column,
    );

    expect(getAppliedSuggestionGroups(restoredAutomatic)).toEqual({ empty: true, hiddenOrNarrow: true });
    expect(getAppliedSuggestionGroups(oneEmptyColumnActivated)).toEqual({ empty: false, hiddenOrNarrow: true });
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

function createColumn(columnIndex: number, autoIgnoredReason?: IgnoredReason): ColumnAnalysis {
  return {
    columnIndex,
    columnLetter: String.fromCharCode(65 + (columnIndex % 26)),
    sampleValues: [],
    nonEmptyCount: autoIgnoredReason === 'empty' ? 0 : 1,
    isEmpty: autoIgnoredReason === 'empty',
    ignored: Boolean(autoIgnoredReason),
    ignoredReason: autoIgnoredReason,
    autoIgnored: Boolean(autoIgnoredReason),
    autoIgnoredReason,
  };
}

function countVisibility(columns: ColumnAnalysis[]) {
  const ignored = columns.filter((column) => column.ignored).length;
  return {
    active: columns.length - ignored,
    ignored,
  };
}
