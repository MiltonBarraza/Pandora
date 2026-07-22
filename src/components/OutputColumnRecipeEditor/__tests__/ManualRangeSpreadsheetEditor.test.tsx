import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { InputColumn, InputRow, OutputRecipe } from '../../../types/import';
import { SortableList } from '../../SortableList/SortableList';
import { ManualRangeAdvancedRangeModal } from '../ManualRangeAdvancedRangeModal';
import {
    addManualRangeVisibleColumn,
    getManualRangeColumnsTransferState,
    hideAllManualRangeColumns,
    ManualRangeColumnsModal,
    removeManualRangeVisibleColumn,
    showAllManualRangeColumns,
} from '../ManualRangeColumnsModal';
import {
    clearManualRangeSuggestedRanges,
    getManualRangeSuggestedRanges,
    getManualRangeSuggestedSummary,
    getManualRangeSuggestedWarnings,
    ManualRangeClearAllRangesConfirmDialog,
    ManualRangeClearSuggestionsConfirmDialog,
    ManualRangeDeleteRangeConfirmDialog,
    ManualRangeDeleteSuggestedRangeConfirmDialog,
    ManualRangeDiscardSuggestionsConfirmDialog,
    ManualRangePreviewPanel,
    ManualRangeSpreadsheetEditor,
    ManualRangeSuggestedRangesModal,
    ManualRangeSuggestedRangesPanel,
    removeManualRangeSuggestedRange,
} from '../ManualRangeSpreadsheetEditor';
import {
    applyManualRangeSelectedSuggestions,
    confirmManualRangeClearAll,
    createManualRangeFromSelection,
    createManualRangeValueFromBounds,
    getDefaultManualRangeVisibleColumnIds,
    getFirstManualRangeForRowNumber,
    getManualRangeBoundaryStateForRow,
    getManualRangeById,
    getManualRangeCompactItemClassName,
    getManualRangeDisplayValue,
    getManualRangePreviewRows,
    getManualRangePreviewValueForRow,
    getManualRangeSelectionSummary,
    getManualRangeSpreadsheetCellValue,
    getManualRangeSpreadsheetColumnLabel,
    getManualRangeSpreadsheetRowClassName,
    getManualRangeValueSummary,
    getOverlappingManualRangeIds,
    hasCompleteManualRangeSelection,
    isRowInsideAnyManualRange,
    isRowInsideManualRange,
    isRowInsideManualRangeSelection,
    normalizeManualRangeSelectionBounds,
    patchManualRangeInRecipe,
    reconcileManualRangeVisibleColumnIds,
    removeManualRangeFromRecipe,
    sortManualRangeRecipeByStart,
    sortManualRangesByStart,
    updateManualRangeSelection,
    updateManualRangeSpreadsheetClickState,
    type RangeSelectionDraft
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
  vi.stubGlobal('document', { body: {} });
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
  it('renders the title and moves explanatory copy to an info tooltip', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('Vista de filas para rangos');
    expect(markup).toContain('aria-label="Ayuda: vista de filas para rangos"');
    expect(markup).not.toContain('<p>Muestra las filas visibles disponibles para configurar rangos');
  });

  it('renders the compact toolbar with disabled selection actions initially', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('manualRangeSpreadsheetToolbar');
    expect(markup).toContain('manualRangeSpreadsheetToolbarPrimaryActions');
    expect(markup).not.toContain('manualRangeSpreadsheetSelectionBar');
    expect(markup).not.toContain('Seleccioná una fila de inicio.');
    expect(markup).toContain('disabled="">Crear rango');
    expect(markup).toContain('disabled="">Limpiar selección');
    expect(markup).toContain('Rangos sugeridos');
    expect(markup).toContain('Armar columnas');
    expect(markup).not.toContain('manualRangeSpreadsheetToolbarDivider');
    expect(markup).not.toContain('Crear rango de esta fila');
  });

  it('renders the build columns button', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('Armar columnas');
    expect(markup).toContain('manualRangeColumnsButton');
  });

  it('renders column headers using alias, header, and column letter fallback', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('>A</th>');
    expect(markup).toContain('>Producto</th>');
    expect(markup).toContain('>Formato</th>');
    expect(markup).toContain('>Resultado');
  });

  it('renders real row numbers instead of visual indexes', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('manualRangeSpreadsheetRowNumberCell">8</th>');
    expect(markup).toContain('manualRangeSpreadsheetRowNumberCell">12</th>');
    expect(markup).not.toContain('>1</th>');
  });

  it('keeps one-value rows visible for range selection', () => {
    const markup = renderSpreadsheet({
      manualRangeRows: [
        { rowNumber: 12, values: { 'input-code': 'REMOVEDOR EN GEL' } },
        { rowNumber: 13, values: { 'input-name': 'VIR 1', 'input-pack': '12' } },
        { rowNumber: 14, values: { 'input-code': 'Rapida accion', 'input-name': 'VIR 1', 'input-pack': '12' } },
        { rowNumber: 15, values: { 'input-code': 'AGUARRAS PREMIUM' } },
      ],
    });

    expect(markup).toContain('manualRangeSpreadsheetRowNumberCell">12</th>');
    expect(markup).toContain('REMOVEDOR EN GEL');
    expect(markup).toContain('manualRangeSpreadsheetRowNumberCell">15</th>');
    expect(markup).toContain('AGUARRAS PREMIUM');
  });

  it('renders cell values from row values', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('P-1');
    expect(markup).toContain('Pincel');
    expect(markup).toContain('20L');
    expect(markup).toContain('Rodillo');
  });

  it('renders the local result preview column by default', () => {
    const markup = renderSpreadsheet({ recipe: multiRangeRecipe });

    expect(markup).toContain('manualRangeSpreadsheetResultHeader');
    expect(markup).toContain('manualRangeSpreadsheetResultCell');
    expect(markup).toContain('Resultado estimado según los rangos configurados.');
    expect(markup).toContain('Promo');
  });

  it('shows an empty state when there are no rows', () => {
    const markup = renderSpreadsheet({ manualRangeRows: [] });

    expect(markup).toContain('No hay filas visibles disponibles para configurar rangos.');
    expect(markup).not.toContain('<table class="manualRangeSpreadsheetTable"');
  });

  it('keeps the row and result columns when there are no input columns', () => {
    const markup = renderSpreadsheet({ inputColumns: [] });

    expect(markup).toContain('>Fila</th>');
    expect(markup).toContain('>Resultado</th>');
    expect(markup).toContain('<table class="manualRangeSpreadsheetTable"');
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

  it('does not call onChange while rendering the spreadsheet preview state', () => {
    const onChange = vi.fn();

    renderToStaticMarkup(
      <ManualRangeSpreadsheetEditor
        recipe={multiRangeRecipe}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        onChange={onChange}
      />,
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('marks rows as selectable without requiring an external change handler', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('role="button"');
    expect(markup).toContain('aria-label="Seleccionar fila 8"');
    expect(markup).toContain('manualRangeSpreadsheetRow-selectable');
  });

  it('renders ranges directly in the side panel without range tabs', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('manualRangeSpreadsheetSidePanel');
    expect(markup).toContain('Rangos configurados');
    expect(markup).toContain('aria-label="Ayuda: rangos configurados"');
    expect(markup).toContain('infoTooltipTrigger');
    expect(markup).not.toContain('manualRangeSpreadsheetSideTabs');
    expect(markup).not.toContain('manualRangeSpreadsheetSideTab');
    expect(markup).not.toContain('>Sugeridos</button>');
    expect(markup).not.toContain('>Vista previa</button>');
    expect(markup).not.toContain('disabled="" title="Vista preparada para una próxima fase.">Sugeridos</button>');
    expect(markup).not.toContain('disabled="" title="Vista preparada para una próxima fase.">Vista previa</button>');
  });

  it('shows ranges as the direct side panel content', () => {
    const markup = renderSpreadsheet({ recipe: multiRangeRecipe });

    expect(markup).toContain('Rangos configurados');
    expect(markup).toContain('manualRangeSpreadsheetRangesList');
    expect(markup).not.toContain('Resultado estimado según los rangos configurados.</p>');
  });

  it('renders the suggested ranges modal button next to build columns', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('manualRangeSpreadsheetToolbarActions');
    expect(markup).toContain('manualRangeSuggestedModalButton');
    expect(markup).toContain('Rangos sugeridos');
    expect(markup).toContain('Armar columnas');
  });

  it('shows the compact ranges list empty state when there are no ranges', () => {
    const markup = renderSpreadsheet({ recipe: { type: 'manualRange', ranges: [] } });

    expect(markup).toContain('Rangos configurados');
    expect(markup).toContain('Todavía no hay rangos configurados. Seleccioná filas en la planilla para crear uno.');
    expect(markup).toContain('Borrar todos');
    expect(markup).toContain('manualRangeSpreadsheetDeleteAllButton');
    expect(markup).toContain('disabled="">Borrar todos');
  });

  it('renders compact range list items with row bounds and value summaries', () => {
    const markup = renderSpreadsheet({ recipe: multiRangeRecipe });

    expect(markup).toContain('Rangos configurados');
    expect(markup).toContain('8 - 13');
    expect(markup).toContain('15 - 20');
    expect(markup).toContain('Texto fijo: Promo');
    expect(markup).toContain('Texto encontrado: Marca');
    expect(markup).toContain('manualRangeSpreadsheetRangeEditButton');
    expect(markup).toContain('manualRangeSpreadsheetRangeItemMain');
    expect(markup).toContain('manualRangeSpreadsheetRangeItemActions');
    expect(markup).toContain('manualRangeSpreadsheetRangeItemActionsSeparated');
    expect(markup).toContain('aria-label="Editar rango 8 - 13"');
    expect(markup).toContain('aria-label="Eliminar rango"');
    expect(markup).toContain('manualRangeSpreadsheetRangeDeleteButton');
    expect(markup).not.toContain('title="Eliminar rango"');
  });

  it('does not render the selected range editor inline in the side panel', () => {
    const markup = renderSpreadsheet({ recipe: multiRangeRecipe });

    expect(markup).toContain('manualRangeSpreadsheetSideContent');
    expect(markup).not.toContain('Rango seleccionado');
    expect(markup).toContain('manualRangeSpreadsheetRangeDeleteButton');
  });

  it('renders the sort by start action in the compact ranges list', () => {
    const markup = renderSpreadsheet({ recipe: multiRangeRecipe });

    expect(markup).toContain('Ordenar por inicio');
    expect(markup).toContain('manualRangeSpreadsheetSortButton');
    expect(markup).toContain('Borrar todos');
    expect(markup).toContain('manualRangeSpreadsheetDeleteAllButton');
  });

  it('renders the app confirmation dialog for clearing all ranges', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeClearAllRangesConfirmDialog
        open
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(markup).toContain('confirmDialogModal');
    expect(markup).toContain('Borrar todos los rangos');
    expect(markup).toContain('Se eliminarán todos los rangos configurados. Esta acción se aplicará al confirmar el editor.');
    expect(markup).toContain('Borrar rangos');
    expect(markup).not.toContain('window.confirm');
  });

  it('renders the app confirmation dialog for deleting one range', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeDeleteRangeConfirmDialog
        range={multiRangeRecipe.ranges[0]}
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(markup).toContain('confirmDialogModal');
    expect(markup).toContain('Eliminar rango');
    expect(markup).toContain('Se eliminará el rango 8 - 13. Esta acción se aplicará al confirmar el editor.');
    expect(markup).toContain('Eliminar');
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

  it('marks the row number column as clickable and sticky headers as sticky', () => {
    const markup = renderSpreadsheet();

    expect(markup).toContain('manualRangeSpreadsheetRowNumberHeader manualRangeSpreadsheetHeaderSticky');
    expect(markup).toContain('manualRangeSpreadsheetRowNumberCell');
    expect(markup).toContain('aria-label="Seleccionar fila 8"');
  });

  it('marks configured range boundaries, including one-row ranges', () => {
    const markup = renderSpreadsheet({
      recipe: { type: 'manualRange', ranges: [{ id: 'single', startRowNumber: 8, endRowNumber: 8, value: 'Uno' }] },
    });
    const row = (markup.match(/<tr[^>]*manualRangeSpreadsheetRow[^>]*>[\s\S]*?<\/tr>/g) ?? [])
      .find((candidate) => candidate.includes('>8</th>')) ?? '';

    expect(row).toContain('manualRangeSpreadsheetRow-rangeStart');
    expect(row).toContain('manualRangeSpreadsheetRow-rangeEnd');
    expect(row).toContain('manualRangeSpreadsheetRowNumberCell');
    expect(markup).toContain('data-manual-range-row-number="8"');
    expect(markup).toContain('data-manual-range-id="single"');
  });
});

describe('ManualRangePreviewPanel', () => {
  function renderPreviewPanel(
    overrides: Partial<Parameters<typeof ManualRangePreviewPanel>[0]> = {},
  ) {
    return renderToStaticMarkup(
      <ManualRangePreviewPanel
        ranges={overrides.ranges ?? multiRangeRecipe.ranges}
        manualRangeRows={overrides.manualRangeRows ?? manualRangeRows}
        selectedRangeId={overrides.selectedRangeId ?? null}
        onSelectRange={overrides.onSelectRange ?? (() => undefined)}
      />,
    );
  }

  it('renders title, copy, summary, and default enabled result-only toggle', () => {
    const markup = renderPreviewPanel();

    expect(markup).toContain('manualRangePreviewPanel');
    expect(markup).toContain('Vista previa');
    expect(markup).toContain('Resultado estimado según los rangos configurados.');
    expect(markup).toContain('Filas visibles: 4');
    expect(markup).toContain('Filas con resultado: 4');
    expect(markup).toContain('Rangos configurados: 2');
    expect(markup).toContain('Mostrar sólo filas con resultado');
    expect(markup).toContain('checked=""');
  });

  it('shows the no-ranges empty state', () => {
    const markup = renderPreviewPanel({ ranges: [] });

    expect(markup).toContain('Todavía no hay rangos configurados para previsualizar.');
    expect(markup).toContain('Rangos configurados: 0');
  });

  it('shows the no visible estimated results state when ranges do not cover visible rows', () => {
    const markup = renderPreviewPanel({
      ranges: [{ id: 'range-30-35', startRowNumber: 30, endRowNumber: 35, value: 'Fuera' }],
    });

    expect(markup).toContain('No hay resultados estimados para las filas visibles.');
    expect(markup).toContain('Filas con resultado: 0');
  });

  it('renders compact preview rows with real row numbers, result, and producing range', () => {
    const markup = renderPreviewPanel();

    expect(markup).toContain('manualRangePreviewList');
    expect(markup).toContain('Fila 8');
    expect(markup).toContain('Fila 12');
    expect(markup).toContain('Resultado: Promo');
    expect(markup).toContain('Rango: 8 - 13');
    expect(markup).not.toContain('>Fila 1</span>');
  });

  it('marks a preview item active when its range is selected', () => {
    const markup = renderPreviewPanel({ selectedRangeId: 'range-8-13' });

    expect(markup).toContain('manualRangePreviewItemActive');
    expect(markup).toContain('aria-pressed="true"');
  });
});

describe('ManualRangeAdvancedRangeModal', () => {
  it('renders the selected range fields and reuses the range value editor with draft modal actions', () => {
    vi.stubGlobal('document', { body: {} });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const markup = renderToStaticMarkup(
      <ManualRangeAdvancedRangeModal
        open
        recipe={multiRangeRecipe}
        range={multiRangeRecipe.ranges[0]}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code', 'input-pack']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );
    consoleError.mockRestore();

    expect(markup).toContain('Configurar rango');
    expect(markup).toContain('Filas 8 - 13');
    expect(markup).not.toContain('Rango seleccionado');
    expect(markup).toContain('manualRangeAdvancedRangeModal');
    expect(markup).toContain('modalDialog manualRangeAdvancedRangeModal');
    expect(markup).toContain('value="8"');
    expect(markup).toContain('value="13"');
    expect(markup).toContain('Filas cubiertas');
    expect(markup).toContain('Vista de las filas incluidas en este rango.');
    expect(markup).toContain('manualRangeCoveredRowsTable');
    expect(markup).toContain('<th scope="row" class="manualRangeCoveredRowsRowNumberCell">8</th>');
    expect(markup).toContain('<th scope="row" class="manualRangeCoveredRowsRowNumberCell">12</th>');
    expect(markup).toContain('Usar mismas columnas que la tabla principal');
    expect(markup).toContain('checkboxField manualRangeCoveredRowsColumnToggle');
    expect(markup).toContain('manualRangeCoveredRowsRow');
    expect(markup).toContain('manualRangeCoveredRowsResultHeader');
    expect(markup).toContain('manualRangeValueFields');
    expect(markup).toContain('Eliminar rango');
    expect(markup).toContain('Cancelar');
    expect(markup).toContain('Aceptar');
    expect(markup).toContain('Tipo de operación');
    expect(markup).toContain('Trabajar con texto');
    expect(markup).not.toContain('Pasos adicionales');
    expect(markup).not.toContain('Sin pasos adicionales.');
  });

  it('renders range concat with the main compose parts model, not the legacy sidebar', () => {
    vi.stubGlobal('document', { body: {} });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const concatRange = {
      id: 'range-concat',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: {
        source: { type: 'fixedText' as const, value: '' },
        steps: [{
          id: 'range-concat-step',
          mode: 'text' as const,
          type: 'concat' as const,
          parts: [
            { id: 'previous', source: { type: 'previousResult' as const } },
            { id: 'pack', source: { type: 'input' as const, inputColumnId: 'input-pack' }, separatorBefore: ' - ' },
          ],
        }],
      },
    };
    const concatRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [concatRange] };
    const markup = renderToStaticMarkup(
      <ManualRangeAdvancedRangeModal
        open
        recipe={concatRecipe}
        range={concatRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code', 'input-pack']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );
    consoleError.mockRestore();

    expect(markup).toContain('Configurar rango');
    expect(markup).toContain('composePartsBuilder');
    expect(markup).toContain('Editor de partes');
    expect(markup).toContain('compositionTokenList');
    expect(markup).toContain('compositionTokenCard');
    expect(markup).toContain('Parte seleccionada');
    expect(markup).not.toContain('concatPartsSidebar');
    expect(markup).not.toContain('rangeValueConcatWorkspaceFlat');
  });

  it('shows the evaluated concat valueRecipe in the covered rows result preview', () => {
    vi.stubGlobal('document', { body: {} });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const concatRange = {
      id: 'range-concat-preview',
      startRowNumber: 8,
      endRowNumber: 8,
      valueRecipe: {
        source: { type: 'fixedText' as const, value: '' },
        steps: [{
          id: 'range-concat-step',
          mode: 'text' as const,
          type: 'concat' as const,
          parts: [
            { id: 'code', source: { type: 'input' as const, inputColumnId: 'input-code' } },
            { id: 'pack', source: { type: 'input' as const, inputColumnId: 'input-pack' }, separatorBefore: ' - ' },
          ],
        }],
      },
    };
    const concatRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [concatRange] };
    const markup = renderToStaticMarkup(
      <ManualRangeAdvancedRangeModal
        open
        recipe={concatRecipe}
        range={concatRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code', 'input-pack']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );
    consoleError.mockRestore();

    expect(markup).toContain('P-1 - 20L');
    expect(markup).not.toContain('Configurado');
  });

  it('shows an empty covered rows state when no visible rows are inside the range', () => {
    vi.stubGlobal('document', { body: {} });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const markup = renderToStaticMarkup(
      <ManualRangeAdvancedRangeModal
        open
        recipe={multiRangeRecipe}
        range={{ ...multiRangeRecipe.ranges[0], startRowNumber: 100, endRowNumber: 110 }}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn={false}
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );
    consoleError.mockRestore();

    expect(markup).toContain('Filas cubiertas');
    expect(markup).toContain('No hay filas visibles dentro de este rango.');
  });
});

describe('ManualRangeColumnsModal', () => {
  it('renders the columns modal copy, active columns, quick actions, result toggle, and buttons', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeColumnsModal
        open
        inputColumns={inputColumns}
        visibleColumnIds={['input-code', 'input-pack']}
        showResultColumn
        onApply={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('Armar columnas');
    expect(markup).toContain('Elegí qué columnas querés ver en la planilla de rangos. Esto no modifica los datos originales.');
    expect(markup).toContain('modalHeaderDetails');
    expect(markup).toContain('A');
    expect(markup).toContain('Producto');
    expect(markup).toContain('Formato');
    expect(markup).toContain('Disponibles');
    expect(markup).toContain('Visibles');
    expect(markup).toContain('Mostrar todas');
    expect(markup).toContain('Ocultar todas');
    expect(markup).toContain('Restaurar recomendadas');
    expect(markup).toContain('Mostrar');
    expect(markup).toContain('Ocultar');
    expect(markup).toContain('manualRangeColumnsModal');
    expect(markup).toContain('manualRangeColumnsToolbar');
    expect(markup).toContain('manualRangeColumnsResultToggleCompact');
    expect(markup).not.toContain('checkboxField manualRangeColumnsResultToggle');
    expect(markup).toContain('Ayuda: mostrar resultado');
    expect(markup).toContain('manualRangeColumnsTransferItem');
    expect(markup).toContain('manualRangeColumnsTransferItemCompact');
    expect(markup).toContain('manualRangeColumnsTransferItemAction');
    expect(markup).toContain('Mostrar resultado');
    expect(markup).toContain('Cancelar');
    expect(markup).toContain('Aceptar');
  });

  it('moves manual range columns between available and visible groups', () => {
    expect(getManualRangeColumnsTransferState(inputColumns, ['input-code']).visibleColumns.map((column) => column.id)).toEqual(['input-code']);
    expect(getManualRangeColumnsTransferState(inputColumns, ['input-code']).availableColumns.map((column) => column.id)).toEqual(['input-name', 'input-pack']);
    expect(addManualRangeVisibleColumn(['input-code'], 'input-name', inputColumns)).toEqual(['input-code', 'input-name']);
    expect(removeManualRangeVisibleColumn(['input-code', 'input-name'], 'input-code')).toEqual(['input-name']);
  });

  it('supports manual range column quick actions', () => {
    expect(showAllManualRangeColumns(inputColumns)).toEqual(['input-code', 'input-name', 'input-pack']);
    expect(hideAllManualRangeColumns()).toEqual([]);
    expect(getDefaultManualRangeVisibleColumnIds(inputColumns)).toEqual(['input-code', 'input-name', 'input-pack']);
  });

  it('shows validation when no input column nor result column is selected', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeColumnsModal
        open
        inputColumns={inputColumns}
        visibleColumnIds={[]}
        showResultColumn={false}
        onApply={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('Seleccioná al menos una columna o activá Resultado.');
    expect(markup).toContain('disabled=""');
  });
});

describe('SortableList drag handle', () => {
  it('uses the centralized reorder icon for drag handles', () => {
    const markup = renderToStaticMarkup(
      <SortableList
        items={[{ id: 'one', label: 'Uno' }]}
        onChange={() => undefined}
        renderItem={(item, handle) => (
          <div>
            {handle}
            <span>{item.label}</span>
          </div>
        )}
      />,
    );

    expect(markup).toContain('dragHandle');
    expect(markup).toContain('lucide-grip-vertical');
  });
});

describe('ManualRangeSuggestedRangesPanel', () => {
  function renderSuggestedPanel(
    overrides: Partial<Parameters<typeof ManualRangeSuggestedRangesPanel>[0]> = {},
  ) {
    return renderToStaticMarkup(
      <ManualRangeSuggestedRangesPanel
        recipe={overrides.recipe ?? recipe}
        inputColumns={overrides.inputColumns ?? inputColumns}
        manualRangeRows={overrides.manualRangeRows ?? manualRangeRows}
        suggestedRanges={overrides.suggestedRanges ?? []}
        selectedSuggestedRangeIds={overrides.selectedSuggestedRangeIds ?? new Set()}
        hasSearchedSuggestions={overrides.hasSearchedSuggestions ?? false}
        onChange={overrides.onChange ?? (() => undefined)}
        onSuggestedRangesChange={overrides.onSuggestedRangesChange ?? (() => undefined)}
        onSelectedSuggestedRangeIdsChange={overrides.onSelectedSuggestedRangeIdsChange ?? (() => undefined)}
        onSuggestionsSearchedChange={overrides.onSuggestionsSearchedChange ?? (() => undefined)}
        onAppliedRangeSelect={overrides.onAppliedRangeSelect ?? (() => undefined)}
      />,
    );
  }

  it('renders suggested ranges controls and the initial empty state', () => {
    const markup = renderSuggestedPanel();

    expect(markup).toContain('manualRangeSuggestedControlsCompact');
    expect(markup).toContain('aria-label="Buscar"');
    expect(markup).not.toContain('title="Buscar sugerencias"');
    expect(markup).not.toContain('infoTooltipCustomTrigger');
    expect(markup).toContain('dropdownTrigger');
    expect(markup).toContain('Guardar como valor');
    expect(markup).toContain('Sin valor');
    expect(markup).toContain('manualRangeSuggestedSummary');
    expect(markup).toContain('Pandora usará cada dato de A como inicio de un rango');
    expect(markup).toContain('Cada rango termina antes del siguiente dato encontrado');
    expect(markup).toContain('Los rangos se crearán sin valor inicial.');
    expect(markup).toContain('Rangos sugeridos');
    expect(markup).toContain('Generá posibles rangos y revisalos antes de aplicarlos.');
    expect(markup).toContain('actionButtonText">Buscar');
    expect(markup).not.toContain('Buscar sugerencias');
    expect(markup).toContain('Todavía no hay sugerencias.');
    expect(markup).toContain('Cada dato inicia un rango');
  });

  it('renders suggested ranges inside its own modal', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeSuggestedRangesModal
        open
        recipe={recipe}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        suggestedRanges={[{ id: 'suggested-20-20', startRowNumber: 20, endRowNumber: 20, value: 'CINTA' }]}
        selectedSuggestedRangeIds={new Set(['suggested-20-20'])}
        hasSearchedSuggestions
        onChange={() => undefined}
        onSuggestedRangesChange={() => undefined}
        onSelectedSuggestedRangeIdsChange={() => undefined}
        onSuggestionsSearchedChange={() => undefined}
        onAppliedRangeSelect={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('manualRangeSuggestedRangesModal');
    expect(markup).toContain('Rangos sugeridos');
    expect(markup).toContain('posibles rangos y revisalos antes de aplicarlos.');
    expect(markup).toContain('Guardar como valor');
    expect(markup).toContain('Borrar sugerencias');
    expect(markup).toContain('Aplicar seleccionadas');
    expect(markup).toContain('Cancelar');
  });

  it('renders no-results state after searching without suggestions', () => {
    const markup = renderSuggestedPanel({ hasSearchedSuggestions: true });

    expect(markup).toContain('No se encontraron sugerencias con esta configuración.');
  });

  it('renders warnings when suggested ranges cannot be configured', () => {
    const markup = renderSuggestedPanel({ inputColumns: [], manualRangeRows: [] });

    expect(markup).toContain('manualRangeSuggestedWarnings');
    expect(markup).toContain('Elegí una columna para buscar sugerencias.');
    expect(markup).toContain('Ingresá un rango de filas válido.');
    expect(markup).toContain('No hay filas visibles para generar sugerencias.');
  });

  it('renders pending suggestions with range, summary, selection, and overlap warning', () => {
    const suggestedRanges = [
      { id: 'suggested-8-13', startRowNumber: 8, endRowNumber: 13, valueRecipe: { source: { type: 'fixedText' as const, value: 'PINCELES SERIE 304' }, steps: [] } },
      { id: 'suggested-20-20', startRowNumber: 20, endRowNumber: 20, value: 'CINTA' },
    ];
    const markup = renderSuggestedPanel({
      suggestedRanges,
      selectedSuggestedRangeIds: new Set(['suggested-20-20']),
      hasSearchedSuggestions: true,
    });

    expect(markup).toContain('Seleccionar todas');
    expect(markup).toContain('Limpiar selección');
    expect(markup).toContain('Aplicar seleccionadas');
    expect(markup).toContain('Se encontraron 2 sugerencias.');
    expect(markup).toContain('1 seleccionada.');
    expect(markup).toContain('8 - 13');
    expect(markup).toContain('20 - 20');
    expect(markup).toContain('Texto fijo: PINCELES SERIE 304');
    expect(markup).toContain('manualRangeSuggestedItemSelected');
    expect(markup).toContain('manualRangeSuggestedItemOverlap');
    expect(markup).toContain('manualRangeSuggestedItemDeleteButton');
    expect(markup).toContain('Eliminar sugerencia 8 - 13');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Advertencia: sugerencia superpuesta');
    expect(markup).toContain('warningTooltipTrigger');
  });

  it('uses empty copy for suggested range text values that were not found', () => {
    const markup = renderSuggestedPanel({
      recipe: { type: 'manualRange', ranges: [] },
      suggestedRanges: [{
        id: 'suggested-empty-text',
        startRowNumber: 20,
        endRowNumber: 25,
        valueRecipe: { source: { type: 'rangeText' as const, inputColumnId: 'input-name', selectedText: '' }, steps: [] },
      }],
      hasSearchedSuggestions: true,
    });

    expect(markup).toContain('Sin texto encontrado');
    expect(markup).not.toContain('Texto encontrado:');
  });

  it('renders the app confirmation dialog before clearing all suggestions', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeClearSuggestionsConfirmDialog
        open
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(markup).toContain('confirmDialogModal');
    expect(markup).toContain('Borrar sugerencias');
    expect(markup).toContain('Se eliminarán las sugerencias generadas. Esta acción no afecta los rangos ya configurados.');
    expect(markup).toContain('Borrar');
    expect(markup).toContain('Cancelar');
    expect(markup).not.toContain('window.confirm');
  });

  it('renders the app confirmation dialog before discarding pending suggestions on close', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeDiscardSuggestionsConfirmDialog
        open
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(markup).toContain('confirmDialogModal');
    expect(markup).toContain('Descartar sugerencias');
    expect(markup).toContain('Se descartarán las sugerencias generadas que todavía no aplicaste.');
    expect(markup).toContain('Descartar');
    expect(markup).toContain('Cancelar');
  });

  it('renders the app confirmation dialog before deleting one suggestion', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeDeleteSuggestedRangeConfirmDialog
        open
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(markup).toContain('confirmDialogModal');
    expect(markup).toContain('Borrar sugerencia');
    expect(markup).toContain('Se eliminará esta sugerencia. Esta acción no afecta los rangos ya configurados.');
    expect(markup).toContain('Borrar');
    expect(markup).toContain('Cancelar');
  });

  it('confirming clear suggestions removes suggestions and keeps configured ranges intact', () => {
    const cleared = clearManualRangeSuggestedRanges();

    expect(cleared.suggestedRanges).toEqual([]);
    expect([...cleared.selectedSuggestedRangeIds]).toEqual([]);
    expect(recipe.ranges).toEqual([{ id: 'range-8-10', startRowNumber: 8, endRowNumber: 10, value: 'Promo' }]);
  });

  it('confirming delete suggestion removes only that suggestion and keeps configured ranges intact', () => {
    const suggestedRanges = [
      { id: 'suggested-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Primero' },
      { id: 'suggested-20-20', startRowNumber: 20, endRowNumber: 20, value: 'Segundo' },
    ];
    const result = removeManualRangeSuggestedRange(
      suggestedRanges,
      new Set(['suggested-8-13', 'suggested-20-20']),
      'suggested-8-13',
    );

    expect(result.suggestedRanges).toEqual([suggestedRanges[1]]);
    expect([...result.selectedSuggestedRangeIds]).toEqual(['suggested-20-20']);
    expect(recipe.ranges).toHaveLength(1);
  });

  it('canceling suggestion deletion does not call suggestion mutators', () => {
    const onSuggestedRangesChange = vi.fn();
    const onSelectedSuggestedRangeIdsChange = vi.fn();
    renderToStaticMarkup(
      <ManualRangeSuggestedRangesPanel
        recipe={recipe}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        suggestedRanges={[{ id: 'suggested-20-20', startRowNumber: 20, endRowNumber: 20, value: 'CINTA' }]}
        selectedSuggestedRangeIds={new Set(['suggested-20-20'])}
        hasSearchedSuggestions
        onChange={() => undefined}
        onSuggestedRangesChange={onSuggestedRangesChange}
        onSelectedSuggestedRangeIdsChange={onSelectedSuggestedRangeIdsChange}
        onSuggestionsSearchedChange={() => undefined}
        onAppliedRangeSelect={() => undefined}
      />,
    );

    expect(onSuggestedRangesChange).not.toHaveBeenCalled();
    expect(onSelectedSuggestedRangeIdsChange).not.toHaveBeenCalled();
  });

  it('disables apply and asks for selection when no suggestion is selected', () => {
    const markup = renderSuggestedPanel({
      suggestedRanges: [{ id: 'suggested-20-20', startRowNumber: 20, endRowNumber: 20, value: 'CINTA' }],
      selectedSuggestedRangeIds: new Set(),
      hasSearchedSuggestions: true,
    });

    expect(markup).toContain('Se encontró 1 sugerencia.');
    expect(markup).toContain('Seleccioná al menos una sugerencia para aplicarla.');
    expect(markup).toContain('disabled="">Aplicar seleccionadas');
  });
});

describe('ManualRangeSpreadsheetEditor helpers', () => {
  it('detects start and end boundaries without changing overlap semantics', () => {
    const ranges = [
      createManualRangeValueFromBounds(8, 12, () => 'first'),
      createManualRangeValueFromBounds(12, 12, () => 'single'),
    ];

    expect(getManualRangeBoundaryStateForRow(8, ranges)).toEqual({ isStart: true, isEnd: false });
    expect(getManualRangeBoundaryStateForRow(12, ranges)).toEqual({ isStart: true, isEnd: true });
    expect(getManualRangeBoundaryStateForRow(10, ranges)).toEqual({ isStart: false, isEnd: false });
  });

  it('uses the compact empty item when a transfer group has no columns', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeColumnsModal
        open
        inputColumns={inputColumns}
        visibleColumnIds={inputColumns.map((column) => column.id)}
        showResultColumn
        onApply={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('columnTransferEmpty manualRangeColumnsTransferEmpty');
    expect(markup).toContain('No hay columnas disponibles.');
  });

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

  it('gets default manual range visible columns deterministically', () => {
    const manyColumns = Array.from({ length: 8 }, (_, index): InputColumn => ({
      id: `input-${index}`,
      columnIndex: index,
      columnLetter: String.fromCharCode(65 + index),
      label: `Columna ${index}`,
      active: true,
      sampleValues: [],
      nonEmptyCount: 0,
    }));

    expect(getDefaultManualRangeVisibleColumnIds(inputColumns)).toEqual(['input-code', 'input-name', 'input-pack']);
    expect(getDefaultManualRangeVisibleColumnIds(manyColumns)).toEqual(['input-0', 'input-1', 'input-2', 'input-3', 'input-4', 'input-5']);
  });

  it('reconciles visible column ids without inventing persisted state', () => {
    expect(reconcileManualRangeVisibleColumnIds(['input-pack', 'missing', 'input-pack', 'input-code'], inputColumns)).toEqual(['input-pack', 'input-code']);
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

  it('allows completing a single-row selection by clicking the same row twice', () => {
    let state = updateManualRangeSpreadsheetClickState({
      selection: { startRowNumber: null, endRowNumber: null },
      selectedRangeId: null,
    }, 8, []);

    state = updateManualRangeSpreadsheetClickState(state, 8, []);

    expect(state).toEqual({
      selection: { startRowNumber: 8, endRowNumber: 8 },
      selectedRangeId: null,
    });
    expect(hasCompleteManualRangeSelection(state.selection)).toBe(true);
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

  it('adds suggested range visual classes without overriding configured range classes', () => {
    const className = getManualRangeSpreadsheetRowClassName(
      8,
      recipe.ranges,
      { startRowNumber: null, endRowNumber: null },
      null,
      null,
      [{ id: 'suggested-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Sugerido' }],
      new Set(['suggested-8-13']),
    );

    expect(className).toContain('manualRangeSpreadsheetRow-suggested');
    expect(className).toContain('manualRangeSpreadsheetRow-suggestedSelected');
    expect(className).toContain('manualRangeSpreadsheetRow-covered');
  });

  it('applies only selected suggestions and preserves existing recipe data', () => {
    const conditionalRecipe = {
      ...recipe,
      condition: { inputColumnId: 'input-code', operator: 'isNotEmpty' as const },
    };
    const suggestedRanges = [
      { id: 'suggested-12-13', startRowNumber: 12, endRowNumber: 13, value: 'Aplicado' },
      { id: 'suggested-20-20', startRowNumber: 20, endRowNumber: 20, value: 'Pendiente' },
    ];

    const result = applyManualRangeSelectedSuggestions(
      conditionalRecipe,
      suggestedRanges,
      new Set(['suggested-12-13']),
    );

    expect(result?.appliedRanges).toEqual([suggestedRanges[0]]);
    expect(result?.recipe.condition).toEqual(conditionalRecipe.condition);
    expect(result?.recipe.ranges).toEqual([...conditionalRecipe.ranges, suggestedRanges[0]]);
  });

  it('does not apply suggestions when none are selected', () => {
    const result = applyManualRangeSelectedSuggestions(
      recipe,
      [{ id: 'suggested-12-13', startRowNumber: 12, endRowNumber: 13, value: 'Aplicado' }],
      new Set(),
    );

    expect(result).toBeNull();
  });

  it('builds suggested ranges with the selected initial value mode before applying', () => {
    const ranges = getManualRangeSuggestedRanges({
      manualRangeRows,
      inputColumnId: 'input-code',
      startRowNumber: 8,
      endRowNumber: 20,
      detectionMode: 'textStarts',
      initialValueMode: 'firstValueInColumn',
      initialValueColumnId: 'input-name',
    });

    expect(ranges[0]).toMatchObject({
      startRowNumber: 8,
      valueRecipe: {
        source: {
          type: 'rangeText',
          inputColumnId: 'input-name',
          selectedText: 'Pincel',
        },
      },
    });
  });

  it('builds text-start suggestions until the row before the next detected text', () => {
    const rows: InputRow[] = Array.from({ length: 20 }, (_, index) => {
      const rowNumber = index + 1;
      return {
        rowNumber,
        values: { 'input-code': [3, 9, 12].includes(rowNumber) ? `Dato ${rowNumber}` : '' },
      };
    });
    const ranges = getManualRangeSuggestedRanges({
      manualRangeRows: rows,
      inputColumnId: 'input-code',
      startRowNumber: 1,
      endRowNumber: 20,
      detectionMode: 'textStarts',
      initialValueMode: 'empty',
    });

    expect(ranges.map(({ startRowNumber, endRowNumber }) => ({ startRowNumber, endRowNumber }))).toEqual([
      { startRowNumber: 3, endRowNumber: 8 },
      { startRowNumber: 9, endRowNumber: 11 },
      { startRowNumber: 12, endRowNumber: 20 },
    ]);
    expect(getOverlappingManualRangeIds(ranges)).toEqual(new Set());
  });

  it('builds dynamic suggested range summary text', () => {
    expect(getManualRangeSuggestedSummary({
      detectionMode: 'textStarts',
      inputColumn: inputColumns[0],
      startRowInput: '3',
      endRowInput: '137',
      initialValueMode: 'empty',
    })).toBe('Pandora usará cada dato de A como inicio de un rango, desde la fila 3 hasta la fila 137. Cada rango termina antes del siguiente dato encontrado. Los rangos se crearán sin valor inicial.');

    expect(getManualRangeSuggestedSummary({
      detectionMode: 'dataBlocks',
      inputColumn: inputColumns[0],
      startRowInput: '3',
      endRowInput: '137',
      initialValueMode: 'lastValueInColumn',
      initialValueColumn: inputColumns[1],
    })).toBe('Pandora creará un rango por cada bloque consecutivo con datos en A, desde la fila 3 hasta la fila 137. Guardará el último valor con datos de Producto.');
  });

  it('builds suggested range warnings for invalid and empty configurations', () => {
    expect(getManualRangeSuggestedWarnings({
      inputColumnId: '',
      manualRangeRows: [],
      startRowNumber: null,
      endRowNumber: null,
      suggestedPreviewRanges: [],
      canSearch: false,
    })).toEqual([
      'Elegí una columna para buscar sugerencias.',
      'Ingresá un rango de filas válido.',
      'No hay filas visibles para generar sugerencias.',
    ]);
  });

  it('confirms before clearing all manual ranges and preserves condition', () => {
    const conditionalRecipe = {
      ...recipe,
      condition: { inputColumnId: 'input-code', operator: 'isNotEmpty' as const },
    };
    const confirmClear = vi.fn(() => true);
    const result = confirmManualRangeClearAll(conditionalRecipe, confirmClear);

    expect(confirmClear).toHaveBeenCalledWith('¿Querés borrar todos los rangos configurados?');
    expect(result).toEqual({
      ...conditionalRecipe,
      ranges: [],
    });
  });

  it('does not clear manual ranges when clear-all confirmation is cancelled', () => {
    const confirmClear = vi.fn(() => false);
    const result = confirmManualRangeClearAll(recipe, confirmClear);

    expect(confirmClear).toHaveBeenCalledOnce();
    expect(result).toBeNull();
  });

  it('does not ask for confirmation when there are no manual ranges to clear', () => {
    const confirmClear = vi.fn(() => true);
    const result = confirmManualRangeClearAll({ type: 'manualRange', ranges: [] }, confirmClear);

    expect(confirmClear).not.toHaveBeenCalled();
    expect(result).toBeNull();
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

  it('creates a single-row manual range from a same-row selection', () => {
    const nextRecipe = createManualRangeFromSelection({ type: 'manualRange', ranges: [] }, { startRowNumber: 8, endRowNumber: 8 }, () => 'single-row');

    expect(nextRecipe.ranges[0]).toMatchObject({
      id: 'single-row',
      startRowNumber: 8,
      endRowNumber: 8,
    });
    expect(getManualRangePreviewRows(manualRangeRows, nextRecipe.ranges).find((row) => row.rowNumber === 8)).toMatchObject({
      rangeId: 'single-row',
      rangeLabel: '8 - 8',
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
      id: 'empty-range-text',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: '' }, steps: [] },
    })).toBe('Sin texto encontrado');
    expect(getManualRangeValueSummary({
      id: 'empty-legacy-range-text',
      startRowNumber: 1,
      endRowNumber: 2,
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: '' },
    })).toBe('Sin texto encontrado');
    expect(getManualRangeValueSummary({
      id: 'suggested',
      startRowNumber: 1,
      endRowNumber: 2,
      suggestedFromText: 'Grupo',
    })).toBe('Sugerido: Grupo');
  });

  it('gets local manual range display values without executing runtime transforms', () => {
    expect(getManualRangeDisplayValue({
      id: 'fixed',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'fixedText', value: 'Promo' }, steps: [] },
    })).toBe('Promo');
    expect(getManualRangeDisplayValue({
      id: 'legacy-fixed',
      startRowNumber: 1,
      endRowNumber: 2,
      valueSource: { type: 'fixedText', value: 'Legacy' },
    })).toBe('Legacy');
    expect(getManualRangeDisplayValue({
      id: 'legacy-range-text',
      startRowNumber: 1,
      endRowNumber: 2,
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Marca' },
    })).toBe('Marca');
    expect(getManualRangeDisplayValue({
      id: 'legacy-value',
      startRowNumber: 1,
      endRowNumber: 2,
      value: 'Viejo',
    })).toBe('Viejo');
    expect(getManualRangeDisplayValue({
      id: 'configured',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [] },
    })).toBe('Configurado');
  });

  it('gets local manual range preview values by row and respects first overlap', () => {
    const ranges = [
      { id: 'first', startRowNumber: 8, endRowNumber: 13, value: 'Primero' },
      { id: 'second', startRowNumber: 10, endRowNumber: 20, value: 'Segundo' },
    ];

    expect(getManualRangePreviewValueForRow(7, ranges)).toBe('');
    expect(getManualRangePreviewValueForRow(12, ranges)).toBe('Primero');
    expect(getManualRangePreviewValueForRow(18, ranges)).toBe('Segundo');
  });

  it('builds manual range preview rows from real row numbers and local estimated values', () => {
    const rows = getManualRangePreviewRows(manualRangeRows, multiRangeRecipe.ranges);

    expect(rows).toEqual([
      { rowNumber: 8, value: 'Promo', rangeId: 'range-8-13', rangeLabel: '8 - 13' },
      { rowNumber: 12, value: 'Promo', rangeId: 'range-8-13', rangeLabel: '8 - 13' },
      { rowNumber: 13, value: 'Promo', rangeId: 'range-8-13', rangeLabel: '8 - 13' },
      { rowNumber: 20, value: 'Marca', rangeId: 'range-15-20', rangeLabel: '15 - 20' },
    ]);
  });

  it('filters manual range preview rows to rows with result when requested', () => {
    const rows = getManualRangePreviewRows(manualRangeRows, recipe.ranges, { onlyRowsWithResult: true });

    expect(rows.map((row) => row.rowNumber)).toEqual([8]);
    expect(rows[0].value).toBe('Promo');
  });

  it('keeps empty preview rows with dash-ready data when result-only filter is disabled', () => {
    const rows = getManualRangePreviewRows(manualRangeRows, recipe.ranges, { onlyRowsWithResult: false });

    expect(rows).toHaveLength(4);
    expect(rows[1]).toEqual({ rowNumber: 12, value: '', rangeId: null, rangeLabel: null });
  });

  it('respects first matching range order when building overlapping preview rows', () => {
    const ranges = [
      { id: 'first', startRowNumber: 8, endRowNumber: 13, value: 'Primero' },
      { id: 'second', startRowNumber: 10, endRowNumber: 20, value: 'Segundo' },
    ];
    const rows = getManualRangePreviewRows(manualRangeRows, ranges);

    expect(rows.find((row) => row.rowNumber === 12)).toMatchObject({
      value: 'Primero',
      rangeId: 'first',
      rangeLabel: '8 - 13',
    });
    expect(rows.find((row) => row.rowNumber === 20)).toMatchObject({
      value: 'Segundo',
      rangeId: 'second',
      rangeLabel: '10 - 20',
    });
  });

  it('does not mutate rows or ranges when building manual range preview rows', () => {
    const originalRows = structuredClone(manualRangeRows);
    const originalRanges = structuredClone(multiRangeRecipe.ranges);

    getManualRangePreviewRows(manualRangeRows, multiRangeRecipe.ranges);

    expect(manualRangeRows).toEqual(originalRows);
    expect(multiRangeRecipe.ranges).toEqual(originalRanges);
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

