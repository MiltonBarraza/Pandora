import type { InputColumn, InputRow, ManualRangeValue, OutputRecipe } from '../../types/import';

export type ManualRangeRecipe = Extract<OutputRecipe, { type: 'manualRange' }>;

export type RangeSelectionDraft = {
  startRowNumber: number | null;
  endRowNumber: number | null;
};

export type ManualRangeSpreadsheetClickState = {
  selection: RangeSelectionDraft;
  selectedRangeId: string | null;
};

export type ManualRangePreviewRow = {
  rowNumber: number;
  value: string;
  rangeId: string | null;
  rangeLabel: string | null;
};

export function getManualRangeSpreadsheetColumnLabel(column: InputColumn): string {
  const alias = column.alias?.trim();
  if (alias) {
    return alias;
  }

  const header = column.header?.trim();
  if (header) {
    return header;
  }

  const columnLetter = column.columnLetter?.trim();
  if (columnLetter) {
    return columnLetter;
  }

  const label = column.label?.trim();
  if (label) {
    return label;
  }

  return `Columna ${column.columnIndex + 1}`;
}

export function getManualRangeSpreadsheetCellValue(row: InputRow, columnId: string): string {
  return String(row.values[columnId] ?? '');
}

export function getDefaultManualRangeVisibleColumnIds(inputColumns: InputColumn[]): string[] {
  return inputColumns.slice(0, 6).map((column) => column.id);
}

export function reconcileManualRangeVisibleColumnIds(
  visibleColumnIds: string[],
  inputColumns: InputColumn[],
): string[] {
  const validColumnIds = new Set(inputColumns.map((column) => column.id));
  return visibleColumnIds.filter((columnId, index) => (
    validColumnIds.has(columnId)
    && visibleColumnIds.indexOf(columnId) === index
  ));
}

export function isRowInsideManualRange(rowNumber: number, range: ManualRangeValue): boolean {
  return rowNumber >= range.startRowNumber && rowNumber <= range.endRowNumber;
}

export function isRowInsideAnyManualRange(rowNumber: number, ranges: ManualRangeValue[]): boolean {
  return ranges.some((range) => isRowInsideManualRange(rowNumber, range));
}

export function getFirstManualRangeForRowNumber(rowNumber: number, ranges: ManualRangeValue[]): ManualRangeValue | null {
  return ranges.find((range) => isRowInsideManualRange(rowNumber, range)) ?? null;
}

export function getManualRangeById(ranges: ManualRangeValue[], rangeId: string | null): ManualRangeValue | null {
  return rangeId ? ranges.find((range) => range.id === rangeId) ?? null : null;
}

export function applyManualRangeSelectedSuggestions(
  recipe: ManualRangeRecipe,
  suggestedRanges: ManualRangeValue[],
  selectedSuggestedRangeIds: Set<string>,
): { recipe: ManualRangeRecipe; appliedRanges: ManualRangeValue[] } | null {
  const appliedRanges = suggestedRanges.filter((range) => selectedSuggestedRangeIds.has(range.id));
  if (appliedRanges.length === 0) {
    return null;
  }

  return {
    recipe: {
      ...recipe,
      ranges: [...recipe.ranges, ...appliedRanges],
    },
    appliedRanges,
  };
}

export function clearManualRangeRecipeRanges(recipe: ManualRangeRecipe): ManualRangeRecipe | null {
  if (recipe.ranges.length === 0) {
    return null;
  }

  return {
    ...recipe,
    ranges: [],
  };
}

export function confirmManualRangeClearAll(
  recipe: ManualRangeRecipe,
  confirmClear: (message: string) => boolean,
): ManualRangeRecipe | null {
  if (recipe.ranges.length === 0) {
    return null;
  }

  return confirmClear('¿Querés borrar todos los rangos configurados?')
    ? clearManualRangeRecipeRanges(recipe)
    : null;
}

export function sortManualRangesByStart(ranges: ManualRangeValue[]): ManualRangeValue[] {
  return [...ranges].sort((left, right) => (
    left.startRowNumber - right.startRowNumber
    || left.endRowNumber - right.endRowNumber
  ));
}

export function sortManualRangeRecipeByStart(recipe: ManualRangeRecipe): ManualRangeRecipe {
  return {
    ...recipe,
    ranges: sortManualRangesByStart(recipe.ranges),
  };
}

export function doesManualRangeOverlap(range: ManualRangeValue, ranges: ManualRangeValue[]): boolean {
  return ranges.some((candidate) => (
    candidate.id !== range.id
    && range.startRowNumber <= candidate.endRowNumber
    && candidate.startRowNumber <= range.endRowNumber
  ));
}

export function getOverlappingManualRangeIds(ranges: ManualRangeValue[]): Set<string> {
  const overlappingIds = new Set<string>();
  ranges.forEach((range) => {
    if (doesManualRangeOverlap(range, ranges)) {
      overlappingIds.add(range.id);
    }
  });
  return overlappingIds;
}

export function getManualRangeValueSummary(range: ManualRangeValue, inputColumns: InputColumn[] = []): string {
  const source = range.valueRecipe?.source;

  if (source?.type === 'fixedText') {
    const value = source.value.trim();
    return value ? `Texto fijo: ${value}` : 'Texto fijo vacío';
  }

  if (source?.type === 'input') {
    const inputColumn = inputColumns.find((column) => column.id === source.inputColumnId);
    return inputColumn
      ? `Desde columna: ${getManualRangeSpreadsheetColumnLabel(inputColumn)}`
      : 'Desde columna';
  }

  if (source?.type === 'rangeText') {
    return source.selectedText.trim()
      ? `Texto encontrado: ${source.selectedText}`
      : 'Texto encontrado';
  }

  if (range.valueSource?.type === 'fixedText') {
    const value = range.valueSource.value.trim();
    return value ? `Texto fijo: ${value}` : 'Texto fijo vacío';
  }

  if (range.valueSource?.type === 'rangeText') {
    return range.valueSource.selectedText.trim()
      ? `Texto encontrado: ${range.valueSource.selectedText}`
      : 'Texto encontrado';
  }

  if (range.suggestedFromText?.trim()) {
    return `Sugerido: ${range.suggestedFromText}`;
  }

  return 'Sin valor configurado';
}

export function getManualRangeDisplayValue(range: ManualRangeValue): string {
  const source = range.valueRecipe?.source;

  if (source?.type === 'fixedText') {
    return source.value;
  }

  if (range.valueSource?.type === 'fixedText') {
    return range.valueSource.value;
  }

  if (range.valueSource?.type === 'rangeText') {
    return range.valueSource.selectedText;
  }

  if (typeof range.value === 'string') {
    return range.value;
  }

  return range.valueRecipe || range.valueSource ? 'Configurado' : '';
}

export function getManualRangePreviewValueForRow(
  rowNumber: number,
  ranges: ManualRangeValue[],
): string {
  const range = getFirstManualRangeForRowNumber(rowNumber, ranges);
  return range ? getManualRangeDisplayValue(range) : '';
}

export function getManualRangePreviewRows(
  rows: InputRow[],
  ranges: ManualRangeValue[],
  options: { onlyRowsWithResult?: boolean } = {},
): ManualRangePreviewRow[] {
  const previewRows = rows.map((row) => {
    const range = getFirstManualRangeForRowNumber(row.rowNumber, ranges);
    const value = range ? getManualRangeDisplayValue(range) : '';

    return {
      rowNumber: row.rowNumber,
      value,
      rangeId: range?.id ?? null,
      rangeLabel: range ? `${range.startRowNumber} - ${range.endRowNumber}` : null,
    };
  });

  if (options.onlyRowsWithResult) {
    return previewRows.filter((row) => row.value.trim() !== '');
  }

  return previewRows;
}

export function getManualRangeCompactItemClassName(
  rangeId: string,
  selectedRangeId: string | null,
  overlappingRangeIds: Set<string>,
): string {
  return [
    'manualRangeSpreadsheetRangeItem',
    selectedRangeId === rangeId ? 'manualRangeSpreadsheetRangeItemSelected' : '',
    overlappingRangeIds.has(rangeId) ? 'manualRangeSpreadsheetRangeItemOverlap' : '',
  ].filter(Boolean).join(' ');
}

export function updateManualRangeSelection(
  current: RangeSelectionDraft,
  clickedRowNumber: number,
): RangeSelectionDraft {
  if (current.startRowNumber === null) {
    return { startRowNumber: clickedRowNumber, endRowNumber: null };
  }

  if (current.endRowNumber === null) {
    return { ...current, endRowNumber: clickedRowNumber };
  }

  return { startRowNumber: clickedRowNumber, endRowNumber: null };
}

export function normalizeManualRangeSelectionBounds(startRowNumber: number, endRowNumber: number) {
  return {
    startRowNumber: Math.min(startRowNumber, endRowNumber),
    endRowNumber: Math.max(startRowNumber, endRowNumber),
  };
}

export function isRowInsideManualRangeSelection(rowNumber: number, selection: RangeSelectionDraft): boolean {
  if (selection.startRowNumber === null) {
    return false;
  }

  if (selection.endRowNumber === null) {
    return rowNumber === selection.startRowNumber;
  }

  const bounds = normalizeManualRangeSelectionBounds(selection.startRowNumber, selection.endRowNumber);
  return rowNumber >= bounds.startRowNumber && rowNumber <= bounds.endRowNumber;
}

export function isManualRangeSelectionStart(rowNumber: number, selection: RangeSelectionDraft): boolean {
  return selection.startRowNumber === rowNumber;
}

export function isManualRangeSelectionEnd(rowNumber: number, selection: RangeSelectionDraft): boolean {
  return selection.endRowNumber === rowNumber;
}

export function hasCompleteManualRangeSelection(selection: RangeSelectionDraft): selection is { startRowNumber: number; endRowNumber: number } {
  return selection.startRowNumber !== null && selection.endRowNumber !== null;
}

export function getManualRangeSelectionSummary(selection: RangeSelectionDraft): string {
  if (selection.startRowNumber === null) {
    return 'Seleccioná una fila de inicio.';
  }

  if (selection.endRowNumber === null) {
    return `Inicio seleccionado: fila ${selection.startRowNumber}. Ahora seleccioná la fila final.`;
  }

  const bounds = normalizeManualRangeSelectionBounds(selection.startRowNumber, selection.endRowNumber);
  return `Rango seleccionado: ${bounds.startRowNumber} - ${bounds.endRowNumber}.`;
}

export function getManualRangeSpreadsheetRowClassName(
  rowNumber: number,
  ranges: ManualRangeValue[],
  selection: RangeSelectionDraft,
  lastCreatedRangeId: string | null = null,
  selectedRangeId: string | null = null,
  suggestedRanges: ManualRangeValue[] = [],
  selectedSuggestedRangeIds: Set<string> = new Set(),
): string {
  const lastCreatedRange = lastCreatedRangeId
    ? ranges.find((range) => range.id === lastCreatedRangeId)
    : undefined;
  const selectedRange = selectedRangeId
    ? ranges.find((range) => range.id === selectedRangeId)
    : undefined;
  const suggestedRange = suggestedRanges.find((range) => isRowInsideManualRange(rowNumber, range));
  const selectedSuggestedRange = suggestedRange && selectedSuggestedRangeIds.has(suggestedRange.id);
  const boundaryState = getManualRangeBoundaryStateForRow(rowNumber, ranges);
  const isActiveRangeStart = selectedRange?.startRowNumber === rowNumber;
  const isActiveRangeEnd = selectedRange?.endRowNumber === rowNumber;

  return [
    'manualRangeSpreadsheetRow',
    'manualRangeSpreadsheetRow-selectable',
    suggestedRange ? 'manualRangeSpreadsheetRow-suggested' : '',
    selectedSuggestedRange ? 'manualRangeSpreadsheetRow-suggestedSelected' : '',
    isRowInsideAnyManualRange(rowNumber, ranges) ? 'manualRangeSpreadsheetRow-covered' : '',
    boundaryState.isStart ? 'manualRangeSpreadsheetRow-rangeStart' : '',
    boundaryState.isEnd ? 'manualRangeSpreadsheetRow-rangeEnd' : '',
    lastCreatedRange && isRowInsideManualRange(rowNumber, lastCreatedRange) ? 'manualRangeSpreadsheetRow-lastCreated' : '',
    selectedRange && isRowInsideManualRange(rowNumber, selectedRange) ? 'manualRangeSpreadsheetRow-activeRange' : '',
    isActiveRangeStart ? 'manualRangeSpreadsheetRow-activeRangeStart' : '',
    isActiveRangeEnd ? 'manualRangeSpreadsheetRow-activeRangeEnd' : '',
    isRowInsideManualRangeSelection(rowNumber, selection) ? 'manualRangeSpreadsheetRow-selectionInside' : '',
    isManualRangeSelectionStart(rowNumber, selection) ? 'manualRangeSpreadsheetRow-selectionStart' : '',
    isManualRangeSelectionEnd(rowNumber, selection) ? 'manualRangeSpreadsheetRow-selectionEnd' : '',
  ].filter(Boolean).join(' ');
}

export function getManualRangeBoundaryStateForRow(rowNumber: number, ranges: ManualRangeValue[]) {
  return {
    isStart: ranges.some((range) => range.startRowNumber === rowNumber),
    isEnd: ranges.some((range) => range.endRowNumber === rowNumber),
  };
}

export function createManualRangeValueFromBounds(
  startRowNumber: number,
  endRowNumber: number,
  idFactory: () => string = () => crypto.randomUUID(),
): ManualRangeValue {
  return {
    id: idFactory(),
    startRowNumber,
    endRowNumber,
    valueRecipe: {
      source: {
        type: 'fixedText',
        value: '',
      },
      steps: [],
    },
  };
}

export function createManualRangeFromSelection(
  recipe: ManualRangeRecipe,
  selection: RangeSelectionDraft,
  idFactory?: () => string,
): ManualRangeRecipe {
  if (!hasCompleteManualRangeSelection(selection)) {
    return recipe;
  }

  const bounds = normalizeManualRangeSelectionBounds(selection.startRowNumber, selection.endRowNumber);
  return {
    ...recipe,
    ranges: [
      ...recipe.ranges,
      createManualRangeValueFromBounds(bounds.startRowNumber, bounds.endRowNumber, idFactory),
    ],
  };
}

export function updateManualRangeInRecipe(
  recipe: ManualRangeRecipe,
  rangeId: string,
  nextRange: ManualRangeValue,
): ManualRangeRecipe {
  return {
    ...recipe,
    ranges: recipe.ranges.map((range) => (range.id === rangeId ? nextRange : range)),
  };
}

export function patchManualRangeInRecipe(
  recipe: ManualRangeRecipe,
  rangeId: string,
  patch: Partial<ManualRangeValue>,
): ManualRangeRecipe {
  const currentRange = getManualRangeById(recipe.ranges, rangeId);
  if (!currentRange) {
    return recipe;
  }

  return updateManualRangeInRecipe(recipe, rangeId, { ...currentRange, ...patch });
}

export function removeManualRangeFromRecipe(
  recipe: ManualRangeRecipe,
  rangeId: string,
): ManualRangeRecipe {
  return {
    ...recipe,
    ranges: recipe.ranges.filter((range) => range.id !== rangeId),
  };
}

export function updateManualRangeSpreadsheetClickState(
  current: ManualRangeSpreadsheetClickState,
  clickedRowNumber: number,
  ranges: ManualRangeValue[],
): ManualRangeSpreadsheetClickState {
  const clickedRange = getFirstManualRangeForRowNumber(clickedRowNumber, ranges);
  const hasStartedSelection = current.selection.startRowNumber !== null;
  const hasIncompleteSelection = hasStartedSelection && current.selection.endRowNumber === null;

  if (hasIncompleteSelection) {
    return {
      selection: updateManualRangeSelection(current.selection, clickedRowNumber),
      selectedRangeId: null,
    };
  }

  if (clickedRange) {
    return {
      selection: { startRowNumber: null, endRowNumber: null },
      selectedRangeId: clickedRange.id,
    };
  }

  return {
    selection: updateManualRangeSelection(current.selection, clickedRowNumber),
    selectedRangeId: null,
  };
}
