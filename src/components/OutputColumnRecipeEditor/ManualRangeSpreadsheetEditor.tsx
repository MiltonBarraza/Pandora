import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Search } from 'lucide-react';
import {
  generateManualRangesFromDataBlocks,
  generateManualRangesFromTexts,
  type ManualRangeInitialValueMode,
} from '../../domain/import/manualRangeModel';
import type { ManualRangeValue } from '../../types/import';
import type { InputColumn, InputRow, OutputRecipe } from '../../types/import';
import {
  createManualRangeFromSelection,
  applyManualRangeSelectedSuggestions,
  confirmManualRangeClearAll,
  getDefaultManualRangeVisibleColumnIds,
  getManualRangeById,
  getManualRangeCompactItemClassName,
  getManualRangePreviewRows,
  getManualRangePreviewValueForRow,
  getManualRangeSpreadsheetCellValue,
  getManualRangeSpreadsheetColumnLabel,
  getManualRangeSpreadsheetRowClassName,
  getManualRangeSelectionSummary,
  getManualRangeValueSummary,
  getOverlappingManualRangeIds,
  hasCompleteManualRangeSelection,
  reconcileManualRangeVisibleColumnIds,
  sortManualRangeRecipeByStart,
  updateManualRangeSpreadsheetClickState,
  type ManualRangeRecipe,
  type RangeSelectionDraft,
} from './ManualRangeSpreadsheetEditor.helpers';
import { ManualRangeAdvancedRangeModal } from './ManualRangeAdvancedRangeModal';
import { ManualRangeColumnsModal } from './ManualRangeColumnsModal';

type ManualRangeSpreadsheetEditorProps = {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
};

type ManualRangeSideView = 'ranges' | 'suggested' | 'preview';
type ManualRangeSuggestedDetectionMode = 'textStarts' | 'dataBlocks';

const manualRangeSuggestedValueModeOptions: Array<{ value: ManualRangeInitialValueMode; label: string }> = [
  { value: 'empty', label: 'Sin valor' },
  { value: 'detectedText', label: 'Valor detectado' },
  { value: 'firstValueInColumn', label: 'Primer valor de columna' },
  { value: 'lastValueInColumn', label: 'Último valor de columna' },
];

export function ManualRangeSpreadsheetEditor({
  recipe,
  inputColumns,
  manualRangeRows,
  onChange,
}: ManualRangeSpreadsheetEditorProps) {
  const [selection, setSelection] = useState<RangeSelectionDraft>({
    startRowNumber: null,
    endRowNumber: null,
  });
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(() => getDefaultManualRangeVisibleColumnIds(inputColumns));
  const [showResultColumn, setShowResultColumn] = useState(true);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [sideView, setSideView] = useState<ManualRangeSideView>('ranges');
  const [suggestedRanges, setSuggestedRanges] = useState<ManualRangeValue[]>([]);
  const [selectedSuggestedRangeIds, setSelectedSuggestedRangeIds] = useState<Set<string>>(new Set());
  const [hasSearchedSuggestions, setHasSearchedSuggestions] = useState(false);
  const [selectedRangeId, setSelectedRangeId] = useState<string | null>(null);
  const [advancedRangeId, setAdvancedRangeId] = useState<string | null>(null);
  const [lastCreatedRangeId, setLastCreatedRangeId] = useState<string | null>(null);
  const advancedRange = getManualRangeById(recipe.ranges, advancedRangeId);
  const visibleInputColumns = useMemo(() => {
    const visibleColumnIdSet = new Set(visibleColumnIds);
    return inputColumns.filter((inputColumn) => visibleColumnIdSet.has(inputColumn.id));
  }, [inputColumns, visibleColumnIds]);
  const spreadsheetTableStyle = {
    '--manual-range-spreadsheet-visible-column-count': visibleInputColumns.length + (showResultColumn ? 1 : 0),
  } as CSSProperties;
  const hasSelection = selection.startRowNumber !== null;
  const hasCompleteSelection = hasCompleteManualRangeSelection(selection);

  useEffect(() => {
    setVisibleColumnIds((current) => reconcileManualRangeVisibleColumnIds(current, inputColumns));
  }, [inputColumns]);

  useEffect(() => {
    setSelectedSuggestedRangeIds((current) => new Set(suggestedRanges.filter((range) => current.has(range.id)).map((range) => range.id)));
  }, [suggestedRanges]);

  const clearSelection = () => {
    setSelection({ startRowNumber: null, endRowNumber: null });
  };
  const selectRow = (rowNumber: number) => {
    const nextState = updateManualRangeSpreadsheetClickState({
      selection,
      selectedRangeId,
    }, rowNumber, recipe.ranges);
    setSelection(nextState.selection);
    setSelectedRangeId(nextState.selectedRangeId);
  };
  const createRangeFromSelection = () => {
    const nextRecipe = createManualRangeFromSelection(recipe, selection);
    if (nextRecipe === recipe) {
      return;
    }

    const createdRangeId = nextRecipe.ranges[nextRecipe.ranges.length - 1]?.id ?? null;
    setLastCreatedRangeId(createdRangeId);
    setSelectedRangeId(createdRangeId);
    onChange(nextRecipe);
    clearSelection();
  };

  return (
    <div className="manualRangeSpreadsheet">
      <div className="manualRangeSpreadsheetHeader">
        <strong>Vista de filas para rangos</strong>
        <p>Muestra las filas visibles disponibles para configurar rangos. Los datos originales no se modifican.</p>
      </div>
      <div className="manualRangeSpreadsheetToolbar">
        <div className="manualRangeSpreadsheetSelectionBar" aria-live="polite">
          <span>{getManualRangeSelectionSummary(selection)}</span>
          {hasSelection ? (
            <div className="manualRangeSpreadsheetSelectionActions">
              {hasCompleteSelection ? (
                <button type="button" className="secondary sm manualRangeSpreadsheetCreateButton" onClick={createRangeFromSelection}>
                  Crear rango
                </button>
              ) : null}
              <button type="button" className="secondary sm manualRangeSpreadsheetClearSelectionButton" onClick={clearSelection}>
                Limpiar selección
              </button>
            </div>
          ) : null}
        </div>
        <button type="button" className="secondary sm manualRangeColumnsButton" onClick={() => setIsColumnsModalOpen(true)}>
          Armar columnas
        </button>
      </div>

      <div className="manualRangeSpreadsheetLayout">
        <div className="manualRangeSpreadsheetTablePane">
          {manualRangeRows.length === 0 ? (
            <p className="manualRangeSpreadsheetEmpty">No hay filas visibles disponibles para configurar rangos.</p>
          ) : visibleInputColumns.length === 0 && !showResultColumn ? (
            <p className="manualRangeSpreadsheetEmpty">Seleccioná al menos una columna o activá Resultado.</p>
          ) : (
            <div className="manualRangeSpreadsheetScroller">
              <table className="manualRangeSpreadsheetTable" style={spreadsheetTableStyle}>
                <thead>
                  <tr>
                    <th className="manualRangeSpreadsheetRowNumberHeader manualRangeSpreadsheetHeaderSticky">Fila</th>
                    {visibleInputColumns.map((inputColumn) => (
                      <th key={inputColumn.id} className="manualRangeSpreadsheetHeaderSticky">{getManualRangeSpreadsheetColumnLabel(inputColumn)}</th>
                    ))}
                    {showResultColumn ? (
                      <th className="manualRangeSpreadsheetHeaderSticky manualRangeSpreadsheetResultHeader" title="Resultado estimado según los rangos configurados.">
                        Resultado
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {manualRangeRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={getManualRangeSpreadsheetRowClassName(
                        row.rowNumber,
                        recipe.ranges,
                        selection,
                        lastCreatedRangeId,
                        selectedRangeId,
                        suggestedRanges,
                        selectedSuggestedRangeIds,
                      )}
                      role="button"
                      tabIndex={0}
                      aria-label={`Seleccionar fila ${row.rowNumber}`}
                      onClick={() => selectRow(row.rowNumber)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') {
                          return;
                        }

                        event.preventDefault();
                        selectRow(row.rowNumber);
                      }}
                    >
                      <th scope="row" className="manualRangeSpreadsheetRowNumber manualRangeSpreadsheetRowNumberCell">{row.rowNumber}</th>
                      {visibleInputColumns.map((inputColumn) => {
                        const value = getManualRangeSpreadsheetCellValue(row, inputColumn.id);
                        return <td key={inputColumn.id} title={value}>{value}</td>;
                      })}
                      {showResultColumn ? (
                        <td
                          className="manualRangeSpreadsheetResultCell"
                          title="Resultado estimado según los rangos configurados."
                        >
                          {getManualRangePreviewValueForRow(row.rowNumber, recipe.ranges)}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <ManualRangeSpreadsheetInspector
          recipe={recipe}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          sideView={sideView}
          suggestedRanges={suggestedRanges}
          selectedSuggestedRangeIds={selectedSuggestedRangeIds}
          hasSearchedSuggestions={hasSearchedSuggestions}
          onChange={onChange}
          onSideViewChange={setSideView}
          onSuggestedRangesChange={setSuggestedRanges}
          onSelectedSuggestedRangeIdsChange={setSelectedSuggestedRangeIds}
          onSuggestionsSearchedChange={setHasSearchedSuggestions}
          onSelectRange={(rangeId) => {
            setSelectedRangeId(rangeId);
            clearSelection();
          }}
          onEditRange={(rangeId) => {
            setSelectedRangeId(rangeId);
            setAdvancedRangeId(rangeId);
            clearSelection();
          }}
          onDeleteAllRanges={() => {
            const nextRecipe = confirmManualRangeClearAll(recipe, (message) => window.confirm(message));
            if (!nextRecipe) {
              return;
            }

            onChange(nextRecipe);
            setSelectedRangeId(null);
            setAdvancedRangeId(null);
            setLastCreatedRangeId(null);
            clearSelection();
          }}
          selectedRangeId={selectedRangeId}
        />
      </div>

      <ManualRangeAdvancedRangeModal
        open={advancedRange !== null}
        recipe={recipe}
        range={advancedRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        onChange={onChange}
        onClose={() => setAdvancedRangeId(null)}
        onRemove={() => {
          setAdvancedRangeId(null);
          setSelectedRangeId(null);
        }}
      />
      <ManualRangeColumnsModal
        open={isColumnsModalOpen}
        inputColumns={inputColumns}
        visibleColumnIds={visibleColumnIds}
        showResultColumn={showResultColumn}
        onApply={({ visibleColumnIds: nextVisibleColumnIds, showResultColumn: nextShowResultColumn }) => {
          setVisibleColumnIds(nextVisibleColumnIds);
          setShowResultColumn(nextShowResultColumn);
        }}
        onClose={() => setIsColumnsModalOpen(false)}
      />
    </div>
  );
}

function ManualRangeSpreadsheetInspector({
  recipe,
  inputColumns,
  manualRangeRows,
  sideView,
  suggestedRanges,
  selectedSuggestedRangeIds,
  hasSearchedSuggestions,
  onChange,
  onSideViewChange,
  onSuggestedRangesChange,
  onSelectedSuggestedRangeIdsChange,
  onSuggestionsSearchedChange,
  onSelectRange,
  onEditRange,
  onDeleteAllRanges,
  selectedRangeId,
}: {
  recipe: ManualRangeRecipe;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sideView: ManualRangeSideView;
  suggestedRanges: ManualRangeValue[];
  selectedSuggestedRangeIds: Set<string>;
  hasSearchedSuggestions: boolean;
  onChange: (recipe: ManualRangeRecipe) => void;
  onSideViewChange: (view: ManualRangeSideView) => void;
  onSuggestedRangesChange: (ranges: ManualRangeValue[]) => void;
  onSelectedSuggestedRangeIdsChange: (rangeIds: Set<string>) => void;
  onSuggestionsSearchedChange: (hasSearched: boolean) => void;
  onSelectRange: (rangeId: string) => void;
  onEditRange: (rangeId: string) => void;
  onDeleteAllRanges: () => void;
  selectedRangeId: string | null;
}) {
  const overlappingRangeIds = getOverlappingManualRangeIds(recipe.ranges);
  const sortRanges = () => onChange(sortManualRangeRecipeByStart(recipe));

  return (
    <aside className="manualRangeSpreadsheetSidePanel">
      <div className="manualRangeSpreadsheetSideTabs" aria-label="Vistas de rangos manuales">
        <button
          type="button"
          className={`manualRangeSpreadsheetSideTab${sideView === 'ranges' ? ' manualRangeSpreadsheetSideTabActive' : ''}`}
          onClick={() => onSideViewChange('ranges')}
        >
          Rangos
        </button>
        <button
          type="button"
          className={`manualRangeSpreadsheetSideTab${sideView === 'suggested' ? ' manualRangeSpreadsheetSideTabActive' : ''}`}
          onClick={() => onSideViewChange('suggested')}
        >
          Sugeridos
        </button>
        <button
          type="button"
          className={`manualRangeSpreadsheetSideTab${sideView === 'preview' ? ' manualRangeSpreadsheetSideTabActive' : ''}`}
          onClick={() => onSideViewChange('preview')}
        >
          Vista previa
        </button>
      </div>
      <div className="manualRangeSpreadsheetSideContent">
        {sideView === 'preview' ? (
          <ManualRangePreviewPanel
            ranges={recipe.ranges}
            manualRangeRows={manualRangeRows}
            selectedRangeId={selectedRangeId}
            onSelectRange={onSelectRange}
          />
        ) : sideView === 'suggested' ? (
          <ManualRangeSuggestedRangesPanel
            recipe={recipe}
            inputColumns={inputColumns}
            manualRangeRows={manualRangeRows}
            suggestedRanges={suggestedRanges}
            selectedSuggestedRangeIds={selectedSuggestedRangeIds}
            hasSearchedSuggestions={hasSearchedSuggestions}
            onChange={onChange}
            onSideViewChange={onSideViewChange}
            onSuggestedRangesChange={onSuggestedRangesChange}
            onSelectedSuggestedRangeIdsChange={onSelectedSuggestedRangeIdsChange}
            onSuggestionsSearchedChange={onSuggestionsSearchedChange}
            onAppliedRangeSelect={onSelectRange}
          />
        ) : (
          <ManualRangeSpreadsheetRangesList
            ranges={recipe.ranges}
            inputColumns={inputColumns}
            selectedRangeId={selectedRangeId}
            overlappingRangeIds={overlappingRangeIds}
            onSelectRange={onSelectRange}
            onEditRange={onEditRange}
            onSortRanges={sortRanges}
            onDeleteAllRanges={onDeleteAllRanges}
          />
        )}
      </div>
    </aside>
  );
}

export function ManualRangePreviewPanel({
  ranges,
  manualRangeRows,
  selectedRangeId,
  onSelectRange,
}: {
  ranges: ManualRangeValue[];
  manualRangeRows: InputRow[];
  selectedRangeId: string | null;
  onSelectRange: (rangeId: string) => void;
}) {
  const [onlyRowsWithResult, setOnlyRowsWithResult] = useState(true);
  const allPreviewRows = useMemo(
    () => getManualRangePreviewRows(manualRangeRows, ranges),
    [manualRangeRows, ranges],
  );
  const previewRows = useMemo(
    () => getManualRangePreviewRows(manualRangeRows, ranges, { onlyRowsWithResult }),
    [manualRangeRows, onlyRowsWithResult, ranges],
  );
  const rowsWithResultCount = allPreviewRows.filter((row) => row.value.trim() !== '').length;

  return (
    <section className="manualRangePreviewPanel">
      <div className="manualRangeSuggestedHeader">
        <strong>Vista previa</strong>
        <p>Resultado estimado según los rangos configurados.</p>
      </div>
      <div className="manualRangePreviewSummary" aria-live="polite">
        <span>Filas visibles: {manualRangeRows.length}</span>
        <span>Filas con resultado: {rowsWithResultCount}</span>
        <span>Rangos configurados: {ranges.length}</span>
      </div>
      <label className="manualRangePreviewToggle">
        <input
          type="checkbox"
          checked={onlyRowsWithResult}
          onChange={(event) => setOnlyRowsWithResult(event.target.checked)}
        />
        <span>Mostrar sólo filas con resultado</span>
      </label>
      {ranges.length === 0 ? (
        <p className="manualRangePreviewEmpty">Todavía no hay rangos configurados para previsualizar.</p>
      ) : previewRows.length === 0 ? (
        <p className="manualRangePreviewEmpty">No hay resultados estimados para las filas visibles.</p>
      ) : (
        <div className="manualRangePreviewList">
          {previewRows.map((row) => {
            const isActive = row.rangeId !== null && row.rangeId === selectedRangeId;
            return (
              <button
                key={row.rowNumber}
                type="button"
                className={[
                  'manualRangePreviewItem',
                  isActive ? 'manualRangePreviewItemActive' : '',
                ].filter(Boolean).join(' ')}
                disabled={row.rangeId === null}
                aria-pressed={isActive}
                onClick={() => {
                  if (row.rangeId) {
                    onSelectRange(row.rangeId);
                  }
                }}
              >
                <span className="manualRangeSpreadsheetRangeItemTitle">Fila {row.rowNumber}</span>
                <span className="manualRangePreviewValue">Resultado: {row.value || '—'}</span>
                <span className="manualRangeSpreadsheetRangeItemSummary">Rango: {row.rangeLabel ?? '—'}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ManualRangeSuggestedRangesPanel({
  recipe,
  inputColumns,
  manualRangeRows,
  suggestedRanges,
  selectedSuggestedRangeIds,
  hasSearchedSuggestions,
  onChange,
  onSideViewChange,
  onSuggestedRangesChange,
  onSelectedSuggestedRangeIdsChange,
  onSuggestionsSearchedChange,
  onAppliedRangeSelect,
}: {
  recipe: ManualRangeRecipe;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  suggestedRanges: ManualRangeValue[];
  selectedSuggestedRangeIds: Set<string>;
  hasSearchedSuggestions: boolean;
  onChange: (recipe: ManualRangeRecipe) => void;
  onSideViewChange: (view: ManualRangeSideView) => void;
  onSuggestedRangesChange: (ranges: ManualRangeValue[]) => void;
  onSelectedSuggestedRangeIdsChange: (rangeIds: Set<string>) => void;
  onSuggestionsSearchedChange: (hasSearched: boolean) => void;
  onAppliedRangeSelect: (rangeId: string) => void;
}) {
  const defaultInputColumnId = inputColumns[0]?.id ?? '';
  const defaultStartRowInput = manualRangeRows[0]?.rowNumber ? String(manualRangeRows[0].rowNumber) : '';
  const defaultEndRowInput = manualRangeRows[manualRangeRows.length - 1]?.rowNumber ? String(manualRangeRows[manualRangeRows.length - 1].rowNumber) : '';
  const [inputColumnId, setInputColumnId] = useState(defaultInputColumnId);
  const [startRowInput, setStartRowInput] = useState(defaultStartRowInput);
  const [endRowInput, setEndRowInput] = useState(defaultEndRowInput);
  const [detectionMode, setDetectionMode] = useState<ManualRangeSuggestedDetectionMode>('textStarts');
  const [initialValueMode, setInitialValueMode] = useState<ManualRangeInitialValueMode>('empty');
  const [initialValueColumnId, setInitialValueColumnId] = useState(defaultInputColumnId);
  const startRowNumber = parseManualRangeSuggestedRowInput(startRowInput);
  const endRowNumber = parseManualRangeSuggestedRowInput(endRowInput);
  const shouldShowInitialValueColumn = initialValueMode === 'firstValueInColumn' || initialValueMode === 'lastValueInColumn';
  const selectedInputColumn = inputColumns.find((inputColumn) => inputColumn.id === inputColumnId);
  const selectedInitialValueColumn = inputColumns.find((inputColumn) => inputColumn.id === initialValueColumnId);
  const selectedCount = suggestedRanges.filter((range) => selectedSuggestedRangeIds.has(range.id)).length;
  const suggestionCount = suggestedRanges.length;
  const suggestionCountLabel = suggestionCount === 1
    ? 'Se encontró 1 sugerencia.'
    : `Se encontraron ${suggestionCount} sugerencias.`;
  const selectedCountLabel = selectedCount === 1
    ? '1 seleccionada.'
    : `${selectedCount} seleccionadas.`;
  const canSearch = Boolean(inputColumnId && startRowNumber !== null && endRowNumber !== null && endRowNumber >= startRowNumber);
  const suggestedPreviewRanges = useMemo(() => {
    if (!canSearch || startRowNumber === null || endRowNumber === null) {
      return [];
    }

    return getManualRangeSuggestedRanges({
      manualRangeRows,
      inputColumnId,
      startRowNumber,
      endRowNumber,
      detectionMode,
      initialValueMode,
      initialValueColumnId: shouldShowInitialValueColumn ? initialValueColumnId : undefined,
    });
  }, [
    canSearch,
    detectionMode,
    endRowNumber,
    initialValueColumnId,
    initialValueMode,
    inputColumnId,
    manualRangeRows,
    shouldShowInitialValueColumn,
    startRowNumber,
  ]);
  const suggestedSummary = getManualRangeSuggestedSummary({
    detectionMode,
    inputColumn: selectedInputColumn,
    startRowInput,
    endRowInput,
    initialValueMode,
    initialValueColumn: shouldShowInitialValueColumn ? selectedInitialValueColumn : undefined,
  });
  const suggestedWarnings = getManualRangeSuggestedWarnings({
    inputColumnId,
    manualRangeRows,
    startRowNumber,
    endRowNumber,
    suggestedPreviewRanges,
    canSearch,
  });
  const hasSuggestions = suggestedRanges.length > 0;
  const hasNoResults = hasSearchedSuggestions && !hasSuggestions;
  const getSuggestedRanges = () => {
    if (!canSearch || startRowNumber === null || endRowNumber === null) {
      return [];
    }

    return getManualRangeSuggestedRanges({
      manualRangeRows,
      inputColumnId,
      startRowNumber,
      endRowNumber,
      detectionMode,
      initialValueMode,
      initialValueColumnId: shouldShowInitialValueColumn ? initialValueColumnId : undefined,
    });
  };
  const searchSuggestions = () => {
    const nextSuggestions = getSuggestedRanges();
    onSuggestedRangesChange(nextSuggestions);
    onSelectedSuggestedRangeIdsChange(new Set(nextSuggestions.map((range) => range.id)));
    onSuggestionsSearchedChange(true);
  };
  const setAllSelected = () => {
    onSelectedSuggestedRangeIdsChange(new Set(suggestedRanges.map((range) => range.id)));
  };
  const clearSelected = () => {
    onSelectedSuggestedRangeIdsChange(new Set());
  };
  const toggleSuggestedRange = (rangeId: string) => {
    const nextSelectedIds = new Set(selectedSuggestedRangeIds);
    if (nextSelectedIds.has(rangeId)) {
      nextSelectedIds.delete(rangeId);
    } else {
      nextSelectedIds.add(rangeId);
    }
    onSelectedSuggestedRangeIdsChange(nextSelectedIds);
  };
  const applySelected = () => {
    const applyResult = applyManualRangeSelectedSuggestions(recipe, suggestedRanges, selectedSuggestedRangeIds);
    if (!applyResult) {
      return;
    }

    onChange(applyResult.recipe);
    onSuggestedRangesChange([]);
    onSelectedSuggestedRangeIdsChange(new Set());
    onAppliedRangeSelect(applyResult.appliedRanges[0].id);
    onSideViewChange('ranges');
  };

  return (
    <section className="manualRangeSuggestedPanel">
      <div className="manualRangeSuggestedHeader">
        <strong>Rangos sugeridos</strong>
        <p>Generá posibles rangos y revisalos antes de aplicarlos.</p>
      </div>
      <div className="manualRangeSuggestedControls manualRangeSuggestedControlsCompact">
        <label className="field compact">
          <span>{detectionMode === 'dataBlocks' ? 'Columna que marca el bloque' : 'Buscar inicios en'}</span>
          <select value={inputColumnId} onChange={(event) => setInputColumnId(event.target.value)}>
            {inputColumns.length === 0 ? (
              <option value="">Sin columnas activas</option>
            ) : inputColumns.map((inputColumn) => (
              <option key={inputColumn.id} value={inputColumn.id}>{getManualRangeSpreadsheetColumnLabel(inputColumn)}</option>
            ))}
          </select>
        </label>
        <label className="field compact">
          <span>Desde fila</span>
          <input type="number" min="1" value={startRowInput} onChange={(event) => setStartRowInput(event.target.value)} />
        </label>
        <label className="field compact">
          <span>Hasta fila</span>
          <input type="number" min="1" value={endRowInput} onChange={(event) => setEndRowInput(event.target.value)} />
        </label>
        <label className="field compact">
          <span>Criterio</span>
          <select value={detectionMode} onChange={(event) => setDetectionMode(event.target.value as ManualRangeSuggestedDetectionMode)}>
            <option value="textStarts">Cada dato inicia un rango</option>
            <option value="dataBlocks">Bloques consecutivos con datos</option>
          </select>
        </label>
        <label className="field compact">
          <span>Guardar como valor</span>
          <select value={initialValueMode} onChange={(event) => setInitialValueMode(event.target.value as ManualRangeInitialValueMode)}>
            {manualRangeSuggestedValueModeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        {shouldShowInitialValueColumn ? (
          <label className="field compact">
            <span>Columna para valor</span>
            <select value={initialValueColumnId} onChange={(event) => setInitialValueColumnId(event.target.value)}>
              {inputColumns.length === 0 ? (
                <option value="">Sin columnas activas</option>
              ) : inputColumns.map((inputColumn) => (
                <option key={inputColumn.id} value={inputColumn.id}>{getManualRangeSpreadsheetColumnLabel(inputColumn)}</option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          className="iconButton manualRangeSuggestedSearchButton"
          title="Buscar sugerencias"
          aria-label="Buscar sugerencias"
          disabled={!canSearch}
          onClick={searchSuggestions}
        >
          <Search aria-hidden="true" focusable="false" size={18} />
        </button>
      </div>
      <p className="manualRangeSuggestedSummary">{suggestedSummary}</p>
      {suggestedWarnings.length > 0 ? (
        <div className="manualRangeSuggestedWarnings" role="status">
          {suggestedWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
      {!hasSearchedSuggestions ? (
        <p className="manualRangeSpreadsheetInspectorEmpty">Todavía no hay sugerencias.</p>
      ) : hasNoResults ? (
        <p className="manualRangeSpreadsheetInspectorEmpty">No se encontraron sugerencias con esta configuración.</p>
      ) : null}
      {hasSuggestions ? (
        <>
          <div className="manualRangeSuggestedStatus" aria-live="polite">
            <span>{suggestionCountLabel}</span>
            {selectedCount > 0 ? (
              <span>{selectedCountLabel}</span>
            ) : (
              <span>Seleccioná al menos una sugerencia para aplicarla.</span>
            )}
          </div>
          <div className="manualRangeSuggestedActions">
            <button type="button" className="secondary sm" onClick={setAllSelected}>Seleccionar todas</button>
            <button type="button" className="secondary sm" onClick={clearSelected}>Limpiar selección</button>
            <button type="button" className="primary sm" disabled={selectedCount === 0} onClick={applySelected}>
              Aplicar seleccionadas
            </button>
          </div>
          <div className="manualRangeSuggestedList">
            {suggestedRanges.map((range) => {
              const isSelected = selectedSuggestedRangeIds.has(range.id);
              const overlapsConfiguredRange = recipe.ranges.some((configuredRange) => (
                range.startRowNumber <= configuredRange.endRowNumber
                && configuredRange.startRowNumber <= range.endRowNumber
              ));
              return (
                <label
                  key={range.id}
                  className={[
                    'manualRangeSuggestedItem',
                    isSelected ? 'manualRangeSuggestedItemSelected' : '',
                    overlapsConfiguredRange ? 'manualRangeSuggestedItemOverlap' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSuggestedRange(range.id)} />
                  <span className="manualRangeSuggestedItemTitle">{range.startRowNumber} - {range.endRowNumber}</span>
                  <span className="manualRangeSuggestedItemSummary">{getManualRangeValueSummary(range, inputColumns)}</span>
                  {overlapsConfiguredRange ? <span className="manualRangeSuggestedItemWarning">Se superpone con un rango configurado</span> : null}
                </label>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

export function parseManualRangeSuggestedRowInput(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getManualRangeSuggestedRanges({
  manualRangeRows,
  inputColumnId,
  startRowNumber,
  endRowNumber,
  detectionMode,
  initialValueMode,
  initialValueColumnId,
}: {
  manualRangeRows: InputRow[];
  inputColumnId: string;
  startRowNumber: number;
  endRowNumber: number;
  detectionMode: ManualRangeSuggestedDetectionMode;
  initialValueMode: ManualRangeInitialValueMode;
  initialValueColumnId?: string;
}) {
  if (detectionMode === 'dataBlocks') {
    return generateManualRangesFromDataBlocks(manualRangeRows, {
      dataColumnId: inputColumnId,
      startRowNumber,
      endRowNumber,
      initialValueMode,
      initialValueColumnId,
    });
  }

  return generateManualRangesFromTexts(manualRangeRows, {
    inputColumnId,
    startRowNumber,
    endRowNumber,
    mode: 'singleRow',
    initialValueMode,
    initialValueColumnId,
  });
}

export function getManualRangeSuggestedSummary({
  detectionMode,
  inputColumn,
  startRowInput,
  endRowInput,
  initialValueMode,
  initialValueColumn,
}: {
  detectionMode: ManualRangeSuggestedDetectionMode;
  inputColumn?: InputColumn;
  startRowInput: string;
  endRowInput: string;
  initialValueMode: ManualRangeInitialValueMode;
  initialValueColumn?: InputColumn;
}) {
  const columnLabel = inputColumn ? getManualRangeSpreadsheetColumnLabel(inputColumn) : 'la columna elegida';
  const intervalLabel = `desde la fila ${startRowInput || 'inicio'} hasta la fila ${endRowInput || 'fin'}`;
  const detectionText = detectionMode === 'dataBlocks'
    ? `Pandora creará un rango por cada bloque consecutivo con datos en ${columnLabel}, ${intervalLabel}.`
    : `Pandora usará cada dato de ${columnLabel} como inicio de un rango, ${intervalLabel}.`;

  return `${detectionText} ${getManualRangeSuggestedValueSummary(initialValueMode, initialValueColumn)}`;
}

export function getManualRangeSuggestedValueSummary(initialValueMode: ManualRangeInitialValueMode, inputColumn?: InputColumn) {
  const columnLabel = inputColumn ? getManualRangeSpreadsheetColumnLabel(inputColumn) : 'la columna elegida';
  if (initialValueMode === 'detectedText') {
    return 'Guardará el valor detectado en la columna guía.';
  }

  if (initialValueMode === 'firstValueInColumn') {
    return `Guardará el primer valor con datos de ${columnLabel}.`;
  }

  if (initialValueMode === 'lastValueInColumn') {
    return `Guardará el último valor con datos de ${columnLabel}.`;
  }

  return 'Los rangos se crearán sin valor inicial.';
}

export function getManualRangeSuggestedWarnings({
  inputColumnId,
  manualRangeRows,
  startRowNumber,
  endRowNumber,
  suggestedPreviewRanges,
  canSearch,
}: {
  inputColumnId: string;
  manualRangeRows: InputRow[];
  startRowNumber: number | null;
  endRowNumber: number | null;
  suggestedPreviewRanges: ManualRangeValue[];
  canSearch: boolean;
}) {
  const warnings: string[] = [];

  if (!inputColumnId) {
    warnings.push('Elegí una columna para buscar sugerencias.');
  }

  if (startRowNumber === null || endRowNumber === null) {
    warnings.push('Ingresá un rango de filas válido.');
  } else if (endRowNumber < startRowNumber) {
    warnings.push('La fila inicial no puede ser mayor que la fila final.');
  }

  if (manualRangeRows.length === 0) {
    warnings.push('No hay filas visibles para generar sugerencias.');
  }

  if (canSearch && suggestedPreviewRanges.length === 0) {
    warnings.push('No hay datos para generar sugerencias con esta configuración.');
  }

  if (suggestedPreviewRanges.length > 50) {
    warnings.push('Esta configuración puede generar muchos rangos. Revisá el intervalo antes de aplicar.');
  }

  return warnings;
}

function ManualRangeSpreadsheetRangesList({
  ranges,
  inputColumns,
  selectedRangeId,
  overlappingRangeIds,
  onSelectRange,
  onEditRange,
  onSortRanges,
  onDeleteAllRanges,
}: {
  ranges: ManualRangeValue[];
  inputColumns: InputColumn[];
  selectedRangeId: string | null;
  overlappingRangeIds: Set<string>;
  onSelectRange: (rangeId: string) => void;
  onEditRange: (rangeId: string) => void;
  onSortRanges: () => void;
  onDeleteAllRanges: () => void;
}) {
  return (
    <section className="manualRangeSpreadsheetRangesList">
      <div className="manualRangeSpreadsheetRangesListHeader">
        <strong>Rangos configurados</strong>
        <div className="manualRangeSpreadsheetRangeListActions">
          <button type="button" className="secondary sm manualRangeSpreadsheetSortButton" disabled={ranges.length < 2} onClick={onSortRanges}>
            Ordenar por inicio
          </button>
          <button
            type="button"
            className="secondary danger sm manualRangeSpreadsheetDeleteAllButton"
            disabled={ranges.length === 0}
            onClick={onDeleteAllRanges}
          >
            Borrar todos
          </button>
        </div>
      </div>
      {ranges.length === 0 ? (
        <p className="manualRangeSpreadsheetInspectorEmpty">Todavía no hay rangos configurados. Seleccioná filas en la planilla para crear uno.</p>
      ) : (
        <div className="manualRangeSpreadsheetRangesListItems">
          {ranges.map((range) => (
            <div key={range.id} className={getManualRangeCompactItemClassName(range.id, selectedRangeId, overlappingRangeIds)}>
              <button
                type="button"
                className="manualRangeSpreadsheetRangeItemMain"
                aria-pressed={selectedRangeId === range.id}
                onClick={() => onSelectRange(range.id)}
              >
                <span className="manualRangeSpreadsheetRangeItemTitle">{range.startRowNumber} - {range.endRowNumber}</span>
                <span className="manualRangeSpreadsheetRangeItemSummary">{getManualRangeValueSummary(range, inputColumns)}</span>
                {overlappingRangeIds.has(range.id) ? (
                  <span className="manualRangeSpreadsheetRangeItemWarning">Se superpone con otro rango</span>
                ) : null}
              </button>
              <div className="manualRangeSpreadsheetRangeItemActions">
                <button
                  type="button"
                  className="secondary sm manualRangeSpreadsheetRangeEditButton"
                  onClick={() => onEditRange(range.id)}
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
