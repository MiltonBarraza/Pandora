import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import React from 'react';
import type { InputColumn, InputRow, OutputRecipe } from '../../../types/import';
import { ManualRangeSpreadsheetEditor } from '../ManualRangeSpreadsheetEditor';
import {
  createManualRangeFromSelection,
  createManualRangeValueFromBounds,
  getFirstManualRangeForRowNumber,
  getManualRangeById,
  getManualRangeCompactItemClassName,
  getManualRangeSpreadsheetCellValue,
  getManualRangeSpreadsheetColumnLabel,
  getManualRangeSpreadsheetRowClassName,
  getManualRangeSelectionSummary,
  getManualRangeValueSummary,
  getOverlappingManualRangeIds,
  hasCompleteManualRangeSelection,
  isRowInsideAnyManualRange,
  isRowInsideManualRange,
  isRowInsideManualRangeSelection,
  normalizeManualRangeSelectionBounds,
  patchManualRangeInRecipe,
  removeManualRangeFromRecipe,
  sortManualRangeRecipeByStart,
  sortManualRangesByStart,
  updateManualRangeSpreadsheetClickState,
  updateManualRangeSelection,
  type RangeSelectionDraft,
} from '../ManualRangeSpreadsheetEditor.helpers';

const inputColumns: InputColumn[] = [
  {
    id: 'input-code',
    columnIndex: 0,
    columnLetter: 'A',
    label: 'Codigo',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
  {
    id: 'input-name',
    columnIndex: 1,
    columnLetter: 'B',
    label: 'Nombre',
    header: 'Producto',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
  {
    id: 'input-pack',
    columnIndex: 2,
    columnLetter: 'C',
    label: 'Envase',
    header: 'Presentacion',
    alias: 'Formato',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
];

const manualRangeRows: InputRow[] = [
  { rowNumber: 8, values: { 'input-code': 'P-1', 'input-name': 'Pincel', 'input-pack': '20L' } },
  { rowNumber: 12, values: { 'input-code': 'P-2', 'input-name': 'Rodillo', 'input-pack': '10L' } },
  { rowNumber: 13, values: { 'input-code': 'P-3', 'input-name': 'Lija', 'input-pack': '1U' } },
  { rowNumber: 20, values: { 'input-code': 'P-4', 'input-name': 'Cinta', 'input-pack': '6U' } },
];

const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
  type: 'manualRange',
  ranges: [{ id: 'range-8-10', startRowNumber: 8, endRowNumber: 10, value: 'Promo' }],
};

const multiRangeRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
  type: 'manualRange',
  ranges: [
    { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, valueRecipe: { source: { type: 'fixedText', value: 'Promo' }, steps: [] } },
    { id: 'range-15-20', startRowNumber: 15, endRowNumber: 20, valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Marca' } },
  ],
};

function renderSpreadsheet(
  overrides: Partial<{
    recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
    inputColumns: InputColumn[];
    manualRangeRows: InputRow[];
  }> = {},
) {
  return renderToStaticMarkup(
    <ManualRangeSpreadsheetEditor
      recipe={overrides.recipe ?? recipe}
      inputColumns={overrides.inputColumns ?? inputColumns}
      manualRangeRows={overrides.manualRangeRows ?? manualRangeRows}
      onChange={() => undefined}
    />,
  );
}

describe('ManualRangeSpreadsheetEditor', () => {
  it('renders the title and explanatory copy', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('Vista de filas para rangos');
    expect(markup).toContain('Muestra las filas visibles disponibles para configurar rangos');
    expect(markup).toContain('Los datos originales no se modifican.');
  });

  it('shows the initial selection summary', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('Seleccioná una fila de inicio.');
    expect(markup).not.toContain('Crear rango');
    expect(markup).not.toContain('Limpiar selección');
  });

  it('renders column headers using alias, header, and column letter fallback', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('<th>A</th>');
    expect(markup).toContain('<th>Producto</th>');
    expect(markup).toContain('<th>Formato</th>');
  });

  it('renders real row numbers instead of visual indexes', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('>8</th>');
    expect(markup).toContain('>12</th>');
    expect(markup).not.toContain('>1</th>');
  });

  it('renders cell values from row values', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('P-1');
    expect(markup).toContain('Pincel');
    expect(markup).toContain('20L');
    expect(markup).toContain('Rodillo');
  });

  it('shows an empty state when there are no rows', () => {
    const markup = renderSpreadsheet({ manualRangeRows: [] });

    expect(markup).toContain('No hay filas visibles disponibles para configurar rangos.');
    expect(markup).not.toContain('<table class="manualRangeSpreadsheetTable"');
  });

  it('shows an empty state when there are no columns', () => {
    const markup = renderSpreadsheet({ inputColumns: [] });

    expect(markup).toContain('No hay columnas activas disponibles para mostrar.');
    expect(markup).not.toContain('<table class="manualRangeSpreadsheetTable"');
  });

  it('adds the configured range class to rows inside an existing range', () => {
    const markup = renderSpreadsheet();
    const rows = markup.match(/<tr[\s\S]*?<\/tr>/g) ?? [];
    const coveredRow = rows.find((row) => row.includes('>8</th>')) ?? '';
    const uncoveredRow = rows.find((row) => row.includes('>12</th>')) ?? '';

    expect(markup).toContain('manualRangeSpreadsheetRow-covered');
    expect(coveredRow).toContain('manualRangeSpreadsheetRow-covered');
    expect(uncoveredRow).not.toContain('manualRangeSpreadsheetRow-covered');
  });

  it('receives onChange without rendering it as an attribute', () => {
    const markup = renderSpreadsheet();

    expect(markup).not.toContain('onChange');
  });

  it('marks rows as selectable without requiring an external change handler', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('role="button"');
    expect(markup).toContain('aria-label="Seleccionar fila 8"');
    expect(markup).toContain('manualRangeSpreadsheetRow-selectable');
  });

  it('renders the inspector empty state without replacing the range list fallback', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('manualRangeSpreadsheetInspector');
    expect(markup).toContain('Seleccioná un rango configurado o creá uno desde la planilla.');
  });

  it('shows the compact ranges list empty state when there are no ranges', () => {
    const markup = renderSpreadsheet({ recipe: { type: 'manualRange', ranges: [] } });

    expect(markup).toContain('Rangos configurados');
    expect(markup).toContain('Todavía no hay rangos configurados. Seleccioná filas en la planilla para crear uno.');
  });

  it('renders compact range list items with row bounds and value summaries', () => {
    const markup = renderSpreadsheet({ recipe: multiRangeRecipe });

    expect(markup).toContain('Rangos configurados');
    expect(markup).toContain('8 - 13');
    expect(markup).toContain('15 - 20');
    expect(markup).toContain('Texto fijo: Promo');
    expect(markup).toContain('Texto encontrado: Marca');
  });

  it('renders the sort by start action in the compact ranges list', () => {
    const markup = renderSpreadsheet({ recipe: multiRangeRecipe });

    expect(markup).toContain('Ordenar por inicio');
    expect(markup).toContain('manualRangeSpreadsheetSortButton');
  });

  it('marks overlapping compact range items', () => {
    const markup = renderSpreadsheet({
      recipe: {
        type: 'manualRange',
        ranges: [
          { id: 'first', startRowNumber: 8, endRowNumber: 13, value: 'Primero' },
          { id: 'second', startRowNumber: 12, endRowNumber: 20, value: 'Segundo' },
        ],
      },
    });

    expect(markup).toContain('manualRangeSpreadsheetRangeItemOverlap');
    expect(markup).toContain('Se superpone con otro rango');
  });
});

describe('ManualRangeSpreadsheetEditor helpers', () => {
  it('builds column labels with the expected priority', () => {
    expect(getManualRangeSpreadsheetColumnLabel(inputColumns[2])).toBe('Formato');
    expect(getManualRangeSpreadsheetColumnLabel(inputColumns[1])).toBe('Producto');
    expect(getManualRangeSpreadsheetColumnLabel(inputColumns[0])).toBe('A');
    expect(getManualRangeSpreadsheetColumnLabel({
      id: 'input-fallback',
      columnIndex: 4,
      columnLetter: '',
      label: '',
      active: true,
      sampleValues: [],
      nonEmptyCount: 0,
    })).toBe('Columna 5');
  });

  it('reads cell values and falls back to an empty string', () => {
    expect(getManualRangeSpreadsheetCellValue(manualRangeRows[0], 'input-name')).toBe('Pincel');
    expect(getManualRangeSpreadsheetCellValue(manualRangeRows[0], 'missing')).toBe('');
  });

  it('detects rows inside manual ranges', () => {
    expect(isRowInsideManualRange(8, recipe.ranges[0])).toBe(true);
    expect(isRowInsideManualRange(10, recipe.ranges[0])).toBe(true);
    expect(isRowInsideManualRange(12, recipe.ranges[0])).toBe(false);
    expect(isRowInsideAnyManualRange(9, recipe.ranges)).toBe(true);
    expect(isRowInsideAnyManualRange(12, recipe.ranges)).toBe(false);
  });

  it('updates selection from first click to completed range', () => {
    let selection: RangeSelectionDraft = { startRowNumber: null, endRowNumber: null };

    selection = updateManualRangeSelection(selection, 8);
    expect(selection).toEqual({ startRowNumber: 8, endRowNumber: null });
    expect(getManualRangeSelectionSummary(selection)).toBe('Inicio seleccionado: fila 8. Ahora seleccioná la fila final.');

    selection = updateManualRangeSelection(selection, 13);
    expect(selection).toEqual({ startRowNumber: 8, endRowNumber: 13 });
    expect(hasCompleteManualRangeSelection(selection)).toBe(true);
    expect(getManualRangeSelectionSummary(selection)).toBe('Rango seleccionado: 8 - 13.');
  });

  it('normalizes reversed selection bounds for the visual range', () => {
    let selection: RangeSelectionDraft = { startRowNumber: null, endRowNumber: null };

    selection = updateManualRangeSelection(selection, 13);
    selection = updateManualRangeSelection(selection, 8);

    expect(selection).toEqual({ startRowNumber: 13, endRowNumber: 8 });
    expect(normalizeManualRangeSelectionBounds(selection.startRowNumber!, selection.endRowNumber!)).toEqual({
      startRowNumber: 8,
      endRowNumber: 13,
    });
    expect(getManualRangeSelectionSummary(selection)).toBe('Rango seleccionado: 8 - 13.');
    expect(isRowInsideManualRangeSelection(12, selection)).toBe(true);
  });

  it('restarts selection after a complete range when clicking a new row', () => {
    let selection: RangeSelectionDraft = { startRowNumber: null, endRowNumber: null };

    selection = updateManualRangeSelection(selection, 8);
    selection = updateManualRangeSelection(selection, 13);
    selection = updateManualRangeSelection(selection, 20);

    expect(selection).toEqual({ startRowNumber: 20, endRowNumber: null });
    expect(getManualRangeSelectionSummary(selection)).toBe('Inicio seleccionado: fila 20. Ahora seleccioná la fila final.');
  });

  it('returns to the initial summary after clearing selection', () => {
    const clearedSelection: RangeSelectionDraft = { startRowNumber: null, endRowNumber: null };

    expect(getManualRangeSelectionSummary(clearedSelection)).toBe('Seleccioná una fila de inicio.');
  });

  it('builds visual classes for selected rows and existing ranges', () => {
    const selection: RangeSelectionDraft = { startRowNumber: 8, endRowNumber: 13 };
    const startClassName = getManualRangeSpreadsheetRowClassName(8, recipe.ranges, selection);
    const insideClassName = getManualRangeSpreadsheetRowClassName(12, recipe.ranges, selection);
    const endClassName = getManualRangeSpreadsheetRowClassName(13, recipe.ranges, selection);

    expect(startClassName).toContain('manualRangeSpreadsheetRow-covered');
    expect(startClassName).toContain('manualRangeSpreadsheetRow-selectionInside');
    expect(startClassName).toContain('manualRangeSpreadsheetRow-selectionStart');
    expect(insideClassName).toContain('manualRangeSpreadsheetRow-selectionInside');
    expect(endClassName).toContain('manualRangeSpreadsheetRow-selectionEnd');
  });

  it('does not mutate the recipe while computing visual selection classes', () => {
    const originalRecipe = structuredClone(recipe);

    getManualRangeSpreadsheetRowClassName(8, recipe.ranges, { startRowNumber: 8, endRowNumber: 13 });

    expect(recipe).toEqual(originalRecipe);
  });

  it('adds the last-created visual class when a matching range id is provided', () => {
    const className = getManualRangeSpreadsheetRowClassName(8, recipe.ranges, {
      startRowNumber: null,
      endRowNumber: null,
    }, 'range-8-10');

    expect(className).toContain('manualRangeSpreadsheetRow-lastCreated');
    expect(className).toContain('manualRangeSpreadsheetRow-covered');
  });

  it('adds the active range visual class when a matching selected range id is provided', () => {
    const className = getManualRangeSpreadsheetRowClassName(8, recipe.ranges, {
      startRowNumber: null,
      endRowNumber: null,
    }, null, 'range-8-10');

    expect(className).toContain('manualRangeSpreadsheetRow-activeRange');
    expect(className).toContain('manualRangeSpreadsheetRow-covered');
  });

  it('creates a default manual range value from normalized bounds', () => {
    expect(createManualRangeValueFromBounds(8, 13, () => 'created-range')).toEqual({
      id: 'created-range',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: {
        source: {
          type: 'fixedText',
          value: '',
        },
        steps: [],
      },
    });
  });

  it('returns the same recipe when creating from an incomplete selection', () => {
    const nextRecipe = createManualRangeFromSelection(recipe, { startRowNumber: 8, endRowNumber: null }, () => 'created-range');

    expect(nextRecipe).toBe(recipe);
  });

  it('creates a manual range from a complete selection', () => {
    const nextRecipe = createManualRangeFromSelection(recipe, { startRowNumber: 8, endRowNumber: 13 }, () => 'created-range');

    expect(nextRecipe).not.toBe(recipe);
    expect(nextRecipe.ranges).toHaveLength(recipe.ranges.length + 1);
    expect(nextRecipe.ranges[0]).toBe(recipe.ranges[0]);
    expect(nextRecipe.ranges[1]).toMatchObject({
      id: 'created-range',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: {
        source: { type: 'fixedText', value: '' },
        steps: [],
      },
    });
  });

  it('creates a normalized manual range from an inverted selection', () => {
    const nextRecipe = createManualRangeFromSelection(recipe, { startRowNumber: 13, endRowNumber: 8 }, () => 'created-range');

    expect(nextRecipe.ranges[1]).toMatchObject({
      startRowNumber: 8,
      endRowNumber: 13,
    });
  });

  it('preserves existing ranges and recipe condition when creating a range', () => {
    const conditionalRecipe = {
      ...recipe,
      condition: { inputColumnId: 'input-code', operator: 'isNotEmpty' as const },
    };
    const nextRecipe = createManualRangeFromSelection(conditionalRecipe, { startRowNumber: 12, endRowNumber: 20 }, () => 'created-range');

    expect(nextRecipe.condition).toEqual(conditionalRecipe.condition);
    expect(nextRecipe.ranges[0]).toBe(recipe.ranges[0]);
    expect(nextRecipe.ranges[1].id).toBe('created-range');
  });

  it('sorts manual ranges by start and then end row', () => {
    const ranges = [
      { id: 'third', startRowNumber: 15, endRowNumber: 20, value: 'Tercero' },
      { id: 'second', startRowNumber: 8, endRowNumber: 13, value: 'Segundo' },
      { id: 'first', startRowNumber: 8, endRowNumber: 10, value: 'Primero' },
    ];

    expect(sortManualRangesByStart(ranges).map((range) => range.id)).toEqual(['first', 'second', 'third']);
    expect(ranges.map((range) => range.id)).toEqual(['third', 'second', 'first']);
  });

  it('sorts manual range recipes while preserving condition and ids', () => {
    const unsortedRecipe = {
      type: 'manualRange' as const,
      condition: { inputColumnId: 'input-code', operator: 'isNotEmpty' as const },
      ranges: [
        { id: 'range-15-20', startRowNumber: 15, endRowNumber: 20, value: 'Segundo' },
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Primero' },
      ],
    };
    const sortedRecipe = sortManualRangeRecipeByStart(unsortedRecipe);

    expect(sortedRecipe.condition).toEqual(unsortedRecipe.condition);
    expect(sortedRecipe.ranges.map((range) => range.id)).toEqual(['range-8-13', 'range-15-20']);
  });

  it('detects overlapping manual range ids', () => {
    const ranges = [
      { id: 'first', startRowNumber: 8, endRowNumber: 13, value: 'Primero' },
      { id: 'second', startRowNumber: 12, endRowNumber: 20, value: 'Segundo' },
      { id: 'third', startRowNumber: 30, endRowNumber: 35, value: 'Tercero' },
    ];

    expect([...getOverlappingManualRangeIds(ranges)]).toEqual(['first', 'second']);
  });

  it('builds compact range item classes', () => {
    const className = getManualRangeCompactItemClassName('range-8-13', 'range-8-13', new Set(['range-8-13']));

    expect(className).toContain('manualRangeSpreadsheetRangeItem');
    expect(className).toContain('manualRangeSpreadsheetRangeItemSelected');
    expect(className).toContain('manualRangeSpreadsheetRangeItemOverlap');
  });

  it('summarizes manual range values for current and legacy sources', () => {
    expect(getManualRangeValueSummary({
      id: 'fixed',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'fixedText', value: 'Promo' }, steps: [] },
    })).toBe('Texto fijo: Promo');
    expect(getManualRangeValueSummary({
      id: 'empty-fixed',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'fixedText', value: '' }, steps: [] },
    })).toBe('Texto fijo vacío');
    expect(getManualRangeValueSummary({
      id: 'input',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-pack' }, steps: [] },
    }, inputColumns)).toBe('Desde columna: Formato');
    expect(getManualRangeValueSummary({
      id: 'legacy-fixed',
      startRowNumber: 1,
      endRowNumber: 2,
      valueSource: { type: 'fixedText', value: 'Legacy' },
    })).toBe('Texto fijo: Legacy');
    expect(getManualRangeValueSummary({
      id: 'legacy-range-text',
      startRowNumber: 1,
      endRowNumber: 2,
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Marca' },
    })).toBe('Texto encontrado: Marca');
    expect(getManualRangeValueSummary({
      id: 'suggested',
      startRowNumber: 1,
      endRowNumber: 2,
      suggestedFromText: 'Grupo',
    })).toBe('Sugerido: Grupo');
  });

  it('finds the first manual range for a row number using recipe order', () => {
    const ranges = [
      { id: 'first', startRowNumber: 8, endRowNumber: 13, value: 'Primero' },
      { id: 'second', startRowNumber: 10, endRowNumber: 20, value: 'Segundo' },
    ];

    expect(getFirstManualRangeForRowNumber(12, ranges)?.id).toBe('first');
    expect(getFirstManualRangeForRowNumber(18, ranges)?.id).toBe('second');
    expect(getFirstManualRangeForRowNumber(30, ranges)).toBeNull();
  });

  it('gets a manual range by id', () => {
    expect(getManualRangeById(recipe.ranges, 'range-8-10')).toBe(recipe.ranges[0]);
    expect(getManualRangeById(recipe.ranges, 'missing')).toBeNull();
    expect(getManualRangeById(recipe.ranges, null)).toBeNull();
  });

  it('patches a manual range while preserving condition and range order', () => {
    const conditionalRecipe = {
      ...recipe,
      condition: { inputColumnId: 'input-code', operator: 'isNotEmpty' as const },
      ranges: [
        recipe.ranges[0],
        { id: 'range-20-25', startRowNumber: 20, endRowNumber: 25, value: 'Otro' },
      ],
    };
    const nextRecipe = patchManualRangeInRecipe(conditionalRecipe, 'range-20-25', { startRowNumber: 21 });

    expect(nextRecipe.condition).toEqual(conditionalRecipe.condition);
    expect(nextRecipe.ranges.map((range) => range.id)).toEqual(['range-8-10', 'range-20-25']);
    expect(nextRecipe.ranges[1]).toMatchObject({ startRowNumber: 21, endRowNumber: 25 });
  });

  it('returns the same recipe when patching a missing manual range', () => {
    expect(patchManualRangeInRecipe(recipe, 'missing', { startRowNumber: 99 })).toBe(recipe);
  });

  it('removes a manual range while preserving condition and other ranges', () => {
    const conditionalRecipe = {
      ...recipe,
      condition: { inputColumnId: 'input-code', operator: 'isNotEmpty' as const },
      ranges: [
        recipe.ranges[0],
        { id: 'range-20-25', startRowNumber: 20, endRowNumber: 25, value: 'Otro' },
      ],
    };
    const nextRecipe = removeManualRangeFromRecipe(conditionalRecipe, 'range-8-10');

    expect(nextRecipe.condition).toEqual(conditionalRecipe.condition);
    expect(nextRecipe.ranges).toEqual([conditionalRecipe.ranges[1]]);
  });

  it('selects an existing range on click when no temporary selection has started', () => {
    const nextState = updateManualRangeSpreadsheetClickState({
      selection: { startRowNumber: null, endRowNumber: null },
      selectedRangeId: null,
    }, 8, recipe.ranges);

    expect(nextState).toEqual({
      selection: { startRowNumber: null, endRowNumber: null },
      selectedRangeId: 'range-8-10',
    });
  });

  it('keeps temporary selection flow when the second click lands on an existing range', () => {
    const nextState = updateManualRangeSpreadsheetClickState({
      selection: { startRowNumber: 12, endRowNumber: null },
      selectedRangeId: null,
    }, 8, recipe.ranges);

    expect(nextState).toEqual({
      selection: { startRowNumber: 12, endRowNumber: 8 },
      selectedRangeId: null,
    });
  });

  it('starts temporary selection when clicking a row without a configured range', () => {
    const nextState = updateManualRangeSpreadsheetClickState({
      selection: { startRowNumber: null, endRowNumber: null },
      selectedRangeId: null,
    }, 20, recipe.ranges);

    expect(nextState).toEqual({
      selection: { startRowNumber: 20, endRowNumber: null },
      selectedRangeId: null,
    });
  });
});
