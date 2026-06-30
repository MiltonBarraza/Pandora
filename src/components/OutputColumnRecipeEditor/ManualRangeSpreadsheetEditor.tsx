import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  generateManualRangesFromDataBlocks,
  generateManualRangesFromTexts,
  type ManualRangeInitialValueMode,
} from '../../domain/import/manualRangeModel';
import type { InputColumn, InputRow, ManualRangeValue, OutputRecipe } from '../../types/import';
import { Modal } from '../Modal/Modal';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';
import { Dropdown, type DropdownOption } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { ManualRangeAdvancedRangeModal } from './ManualRangeAdvancedRangeModal';
import { ManualRangeColumnsModal } from './ManualRangeColumnsModal';
import './ManualRangeSpreadsheetEditor.css';
import {
  applyManualRangeSelectedSuggestions,
  clearManualRangeRecipeRanges,
  createManualRangeFromSelection,
  getDefaultManualRangeVisibleColumnIds,
  getManualRangeById,
  getManualRangeCompactItemClassName,
  getManualRangePreviewRows,
  getManualRangePreviewValueForRow,
  getManualRangeSpreadsheetCellValue,
  getManualRangeSpreadsheetColumnLabel,
  getManualRangeSpreadsheetRowClassName,
  getManualRangeValueSummary,
  getOverlappingManualRangeIds,
  hasCompleteManualRangeSelection,
  reconcileManualRangeVisibleColumnIds,
  removeManualRangeFromRecipe,
  sortManualRangeRecipeByStart,
  updateManualRangeSpreadsheetClickState,
  type ManualRangeRecipe,
  type RangeSelectionDraft,
} from './ManualRangeSpreadsheetEditor.helpers';

type ManualRangeSpreadsheetEditorProps = {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
};

type ManualRangeSuggestedDetectionMode = 'textStarts' | 'dataBlocks';

const manualRangeSuggestedValueModeOptions: Array<DropdownOption<ManualRangeInitialValueMode>> = [
  { value: 'empty', label: 'Sin valor' },
  { value: 'detectedText', label: 'Valor detectado' },
  { value: 'firstValueInColumn', label: 'Primer valor de columna' },
  { value: 'lastValueInColumn', label: 'Último valor de columna' },
];

const manualRangeSuggestedDetectionModeOptions: Array<DropdownOption<ManualRangeSuggestedDetectionMode>> = [
  { value: 'textStarts', label: 'Cada dato inicia un rango' },
  { value: 'dataBlocks', label: 'Bloques consecutivos con datos' },
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
  const [isSuggestedRangesModalOpen, setIsSuggestedRangesModalOpen] = useState(false);
  const [suggestedRanges, setSuggestedRanges] = useState<ManualRangeValue[]>([]);
  const [selectedSuggestedRangeIds, setSelectedSuggestedRangeIds] = useState<Set<string>>(new Set());
  const [hasSearchedSuggestions, setHasSearchedSuggestions] = useState(false);
  const [isDiscardSuggestionsConfirmOpen, setIsDiscardSuggestionsConfirmOpen] = useState(false);
  const [selectedRangeId, setSelectedRangeId] = useState<string | null>(null);
  const [advancedRangeId, setAdvancedRangeId] = useState<string | null>(null);
  const [lastCreatedRangeId, setLastCreatedRangeId] = useState<string | null>(null);
  const [isClearAllRangesConfirmOpen, setIsClearAllRangesConfirmOpen] = useState(false);
  const [rangeIdPendingDelete, setRangeIdPendingDelete] = useState<string | null>(null);
  const rowRefs = useRef(new Map<number, HTMLTableRowElement>());
  const rangeItemRefs = useRef(new Map<string, HTMLDivElement>());
  const advancedRange = getManualRangeById(recipe.ranges, advancedRangeId);
  const rangePendingDelete = getManualRangeById(recipe.ranges, rangeIdPendingDelete);
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
    if (nextState.selectedRangeId) {
      rangeItemRefs.current.get(nextState.selectedRangeId)?.scrollIntoView({ block: 'nearest' });
    }
  };
  const scrollToSpreadsheetRow = (rowNumber: number) => {
    const row = rowRefs.current.get(rowNumber);
    const scroller = row?.closest<HTMLElement>('.manualRangeSpreadsheetScroller');
    const header = scroller?.querySelector<HTMLElement>('thead');
    if (!row || !scroller) {
      return;
    }

    scroller.scrollTo({
      top: Math.max(0, row.offsetTop - (header?.offsetHeight ?? 0)),
      behavior: 'auto',
    });
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
  const createRangeFromSingleSelectedRow = () => {
    if (selection.startRowNumber === null) {
      return;
    }

    const nextRecipe = createManualRangeFromSelection(recipe, {
      startRowNumber: selection.startRowNumber,
      endRowNumber: selection.startRowNumber,
    });
    if (nextRecipe === recipe) {
      return;
    }

    const createdRangeId = nextRecipe.ranges[nextRecipe.ranges.length - 1]?.id ?? null;
    setLastCreatedRangeId(createdRangeId);
    setSelectedRangeId(createdRangeId);
    onChange(nextRecipe);
    clearSelection();
  };
  const createRangeFromCurrentSelection = () => {
    if (!hasSelection) {
      return;
    }

    if (hasCompleteSelection) {
      createRangeFromSelection();
      return;
    }

    createRangeFromSingleSelectedRow();
  };
  const clearAllRanges = () => {
    const nextRecipe = clearManualRangeRecipeRanges(recipe);
    setIsClearAllRangesConfirmOpen(false);
    if (!nextRecipe) {
      return;
    }

    onChange(nextRecipe);
    setSelectedRangeId(null);
    setAdvancedRangeId(null);
    setLastCreatedRangeId(null);
    clearSelection();
  };
  const deleteRange = () => {
    if (!rangePendingDelete) {
      setRangeIdPendingDelete(null);
      return;
    }

    onChange(removeManualRangeFromRecipe(recipe, rangePendingDelete.id));
    if (selectedRangeId === rangePendingDelete.id) {
      setSelectedRangeId(null);
    }
    if (advancedRangeId === rangePendingDelete.id) {
      setAdvancedRangeId(null);
    }
    if (lastCreatedRangeId === rangePendingDelete.id) {
      setLastCreatedRangeId(null);
    }
    clearSelection();
    setRangeIdPendingDelete(null);
  };
  const closeSuggestedRangesModal = () => {
    const clearedSuggestions = clearManualRangeSuggestedRanges();
    setIsSuggestedRangesModalOpen(false);
    setIsDiscardSuggestionsConfirmOpen(false);
    setSuggestedRanges(clearedSuggestions.suggestedRanges);
    setSelectedSuggestedRangeIds(clearedSuggestions.selectedSuggestedRangeIds);
    setHasSearchedSuggestions(false);
  };
  const requestCloseSuggestedRangesModal = () => {
    if (suggestedRanges.length > 0) {
      setIsDiscardSuggestionsConfirmOpen(true);
      return;
    }

    closeSuggestedRangesModal();
  };

  return (
    <div className="manualRangeSpreadsheet">
      <div className="manualRangeSpreadsheetHeader">
        <strong>Vista de filas para rangos</strong>
        <InfoTooltip
          ariaLabel="Ayuda: vista de filas para rangos"
          content="Muestra las filas visibles disponibles para configurar rangos. Los datos originales no se modifican."
        />
      </div>
      <div className="manualRangeSpreadsheetToolbar">
        <div className="manualRangeSpreadsheetSelectionActions manualRangeSpreadsheetToolbarPrimaryActions manualRangeSpreadsheetToolbarActions">
          <button
            type="button"
            className="secondary sm manualRangeSpreadsheetCreateButton"
            disabled={!hasSelection}
            onClick={createRangeFromCurrentSelection}
          >
            Crear rango
          </button>
          <button
            type="button"
            className="secondary sm manualRangeSpreadsheetClearSelectionButton"
            disabled={!hasSelection}
            onClick={clearSelection}
          >
            Limpiar selección
          </button>
          <button type="button" className="secondary sm manualRangeSuggestedModalButton" onClick={() => setIsSuggestedRangesModalOpen(true)}>
            Rangos sugeridos
          </button>
          <button type="button" className="secondary sm manualRangeColumnsButton" onClick={() => setIsColumnsModalOpen(true)}>
            Armar columnas
          </button>
        </div>
      </div>
      <div className="manualRangeSpreadsheetToolbarDivider" aria-hidden="true" />

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
                      ref={(node) => {
                        if (node) rowRefs.current.set(row.rowNumber, node);
                        else rowRefs.current.delete(row.rowNumber);
                      }}
                      data-manual-range-row-number={row.rowNumber}
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
          onChange={onChange}
          onSelectRange={(rangeId) => {
            setSelectedRangeId(rangeId);
            clearSelection();
            const range = getManualRangeById(recipe.ranges, rangeId);
            if (range) {
              scrollToSpreadsheetRow(range.startRowNumber);
            }
          }}
          onEditRange={(rangeId) => {
            setSelectedRangeId(rangeId);
            setAdvancedRangeId(rangeId);
            clearSelection();
          }}
          onDeleteAllRanges={() => setIsClearAllRangesConfirmOpen(true)}
          onRequestDeleteRange={setRangeIdPendingDelete}
          selectedRangeId={selectedRangeId}
          rangeItemRefs={rangeItemRefs.current}
        />
      </div>

      <ManualRangeAdvancedRangeModal
        open={advancedRange !== null}
        recipe={recipe}
        range={advancedRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={visibleColumnIds}
        showResultColumn={showResultColumn}
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
      <ManualRangeSuggestedRangesModal
        open={isSuggestedRangesModalOpen}
        recipe={recipe}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        suggestedRanges={suggestedRanges}
        selectedSuggestedRangeIds={selectedSuggestedRangeIds}
        hasSearchedSuggestions={hasSearchedSuggestions}
        onChange={onChange}
        onSuggestedRangesChange={setSuggestedRanges}
        onSelectedSuggestedRangeIdsChange={setSelectedSuggestedRangeIds}
        onSuggestionsSearchedChange={setHasSearchedSuggestions}
        onAppliedRangeSelect={(rangeId) => {
          setSelectedRangeId(rangeId);
          clearSelection();
        }}
        onClose={requestCloseSuggestedRangesModal}
        onApplied={closeSuggestedRangesModal}
      />
      <ManualRangeDiscardSuggestionsConfirmDialog
        open={isDiscardSuggestionsConfirmOpen}
        onCancel={() => setIsDiscardSuggestionsConfirmOpen(false)}
        onConfirm={closeSuggestedRangesModal}
      />
      <ManualRangeClearAllRangesConfirmDialog
        open={isClearAllRangesConfirmOpen}
        onCancel={() => setIsClearAllRangesConfirmOpen(false)}
        onConfirm={clearAllRanges}
      />
      <ManualRangeDeleteRangeConfirmDialog
        range={rangePendingDelete}
        onCancel={() => setRangeIdPendingDelete(null)}
        onConfirm={deleteRange}
      />
    </div>
  );
}

export function ManualRangeClearAllRangesConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <ConfirmDialog
      open
      title="Borrar todos los rangos"
      message="Se eliminarán todos los rangos configurados. Esta acción se aplicará al confirmar el editor."
      cancelLabel="Cancelar"
      confirmLabel="Borrar rangos"
      variant="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function ManualRangeDeleteRangeConfirmDialog({
  range,
  onCancel,
  onConfirm,
}: {
  range: ManualRangeValue | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!range) {
    return null;
  }

  return (
    <ConfirmDialog
      open
      title="Eliminar rango"
      message={`Se eliminará el rango ${range.startRowNumber} - ${range.endRowNumber}. Esta acción se aplicará al confirmar el editor.`}
      cancelLabel="Cancelar"
      confirmLabel="Eliminar"
      variant="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

function ManualRangeSpreadsheetInspector({
  recipe,
  inputColumns,
  onChange,
  onSelectRange,
  onEditRange,
  onDeleteAllRanges,
  onRequestDeleteRange,
  selectedRangeId,
  rangeItemRefs,
}: {
  recipe: ManualRangeRecipe;
  inputColumns: InputColumn[];
  onChange: (recipe: ManualRangeRecipe) => void;
  onSelectRange: (rangeId: string) => void;
  onEditRange: (rangeId: string) => void;
  onDeleteAllRanges: () => void;
  onRequestDeleteRange: (rangeId: string) => void;
  selectedRangeId: string | null;
  rangeItemRefs: Map<string, HTMLDivElement>;
}) {
  const [isOverlapSortConfirmOpen, setIsOverlapSortConfirmOpen] = useState(false);
  const overlappingRangeIds = getOverlappingManualRangeIds(recipe.ranges);
  const sortRanges = () => {
    if (overlappingRangeIds.size > 0) {
      setIsOverlapSortConfirmOpen(true);
      return;
    }

    onChange(sortManualRangeRecipeByStart(recipe));
  };
  const confirmOverlapSort = () => {
    setIsOverlapSortConfirmOpen(false);
    onChange(sortManualRangeRecipeByStart(recipe));
  };

  return (
    <aside className="manualRangeSpreadsheetSidePanel">
      <div className="manualRangeSpreadsheetSideContent">
        <ManualRangeSpreadsheetRangesList
          ranges={recipe.ranges}
          inputColumns={inputColumns}
          selectedRangeId={selectedRangeId}
          overlappingRangeIds={overlappingRangeIds}
          onSelectRange={onSelectRange}
          onEditRange={onEditRange}
          onSortRanges={sortRanges}
          onDeleteAllRanges={onDeleteAllRanges}
          onRequestDeleteRange={onRequestDeleteRange}
          rangeItemRefs={rangeItemRefs}
        />
      </div>
      <ConfirmDialog
        open={isOverlapSortConfirmOpen}
        title="Ordenar rangos solapados"
        message="Hay rangos superpuestos. Como el primer rango coincidente tiene prioridad, ordenar por inicio puede cambiar el valor aplicado en algunas filas. ¿Querés ordenar de todos modos?"
        cancelLabel="Cancelar"
        confirmLabel="Ordenar"
        onCancel={() => setIsOverlapSortConfirmOpen(false)}
        onConfirm={confirmOverlapSort}
      />
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

export function ManualRangeSuggestedRangesModal({
  open,
  recipe,
  inputColumns,
  manualRangeRows,
  suggestedRanges,
  selectedSuggestedRangeIds,
  hasSearchedSuggestions,
  onChange,
  onSuggestedRangesChange,
  onSelectedSuggestedRangeIdsChange,
  onSuggestionsSearchedChange,
  onAppliedRangeSelect,
  onClose,
  onApplied,
}: {
  open: boolean;
  recipe: ManualRangeRecipe;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  suggestedRanges: ManualRangeValue[];
  selectedSuggestedRangeIds: Set<string>;
  hasSearchedSuggestions: boolean;
  onChange: (recipe: ManualRangeRecipe) => void;
  onSuggestedRangesChange: (ranges: ManualRangeValue[]) => void;
  onSelectedSuggestedRangeIdsChange: (rangeIds: Set<string>) => void;
  onSuggestionsSearchedChange: (hasSearched: boolean) => void;
  onAppliedRangeSelect: (rangeId: string) => void;
  onClose: () => void;
  onApplied?: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <Modal
      open
      title="Rangos sugeridos"
      className="manualRangeSuggestedRangesModal"
      headerDetails={<span>Generá posibles rangos y revisalos antes de aplicarlos.</span>}
      onClose={onClose}
      footer={(
        <div className="manualRangeSuggestedModalFooter">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      )}
    >
      <ManualRangeSuggestedRangesPanel
        recipe={recipe}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        suggestedRanges={suggestedRanges}
        selectedSuggestedRangeIds={selectedSuggestedRangeIds}
        hasSearchedSuggestions={hasSearchedSuggestions}
        onChange={onChange}
        onSuggestedRangesChange={onSuggestedRangesChange}
        onSelectedSuggestedRangeIdsChange={onSelectedSuggestedRangeIdsChange}
        onSuggestionsSearchedChange={onSuggestionsSearchedChange}
        onAppliedRangeSelect={onAppliedRangeSelect}
        onApplied={onApplied ?? onClose}
        showHeader={false}
      />
    </Modal>
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
  onSuggestedRangesChange,
  onSelectedSuggestedRangeIdsChange,
  onSuggestionsSearchedChange,
  onAppliedRangeSelect,
  onApplied,
  showHeader = true,
}: {
  recipe: ManualRangeRecipe;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  suggestedRanges: ManualRangeValue[];
  selectedSuggestedRangeIds: Set<string>;
  hasSearchedSuggestions: boolean;
  onChange: (recipe: ManualRangeRecipe) => void;
  onSuggestedRangesChange: (ranges: ManualRangeValue[]) => void;
  onSelectedSuggestedRangeIdsChange: (rangeIds: Set<string>) => void;
  onSuggestionsSearchedChange: (hasSearched: boolean) => void;
  onAppliedRangeSelect: (rangeId: string) => void;
  onApplied?: () => void;
  showHeader?: boolean;
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
  const [isClearSuggestionsConfirmOpen, setIsClearSuggestionsConfirmOpen] = useState(false);
  const [suggestedRangeIdPendingDelete, setSuggestedRangeIdPendingDelete] = useState<string | null>(null);
  const inputColumnOptions = useMemo<DropdownOption[]>(() => inputColumns.map((inputColumn) => ({
    value: inputColumn.id,
    label: getManualRangeSpreadsheetColumnLabel(inputColumn),
  })), [inputColumns]);
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
  const clearSuggestions = () => {
    const clearedSuggestions = clearManualRangeSuggestedRanges();
    onSuggestedRangesChange(clearedSuggestions.suggestedRanges);
    onSelectedSuggestedRangeIdsChange(clearedSuggestions.selectedSuggestedRangeIds);
    setIsClearSuggestionsConfirmOpen(false);
  };
  const removeSuggestedRange = (rangeId: string) => {
    const nextSuggestions = removeManualRangeSuggestedRange(suggestedRanges, selectedSuggestedRangeIds, rangeId);
    onSuggestedRangesChange(nextSuggestions.suggestedRanges);
    onSelectedSuggestedRangeIdsChange(nextSuggestions.selectedSuggestedRangeIds);
    setSuggestedRangeIdPendingDelete(null);
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
    onApplied?.();
  };

  return (
    <section className="manualRangeSuggestedPanel">
      {showHeader ? (
      <div className="manualRangeSuggestedHeader">
        <strong>Rangos sugeridos</strong>
        <p>Generá posibles rangos y revisalos antes de aplicarlos.</p>
      </div>
      ) : null}
      <div className="manualRangeSuggestedControls manualRangeSuggestedControlsCompact">
        <Dropdown
          label={detectionMode === 'dataBlocks' ? 'Columna que marca el bloque' : 'Buscar inicios en'}
          value={inputColumnId}
          options={inputColumnOptions}
          placeholder="Sin columnas activas"
          className="manualRangeSuggestedControl"
          onChange={setInputColumnId}
        />
        <label className="field compact">
          <span>Desde fila</span>
          <input type="number" min="1" value={startRowInput} onChange={(event) => setStartRowInput(event.target.value)} />
        </label>
        <label className="field compact">
          <span>Hasta fila</span>
          <input type="number" min="1" value={endRowInput} onChange={(event) => setEndRowInput(event.target.value)} />
        </label>
        <Dropdown
          label="Criterio"
          value={detectionMode}
          options={manualRangeSuggestedDetectionModeOptions}
          className="manualRangeSuggestedControl"
          onChange={setDetectionMode}
        />
        <Dropdown
          label="Guardar como valor"
          value={initialValueMode}
          options={manualRangeSuggestedValueModeOptions}
          className="manualRangeSuggestedControl manualRangeSuggestedValueControl"
          onChange={setInitialValueMode}
        />
        {shouldShowInitialValueColumn ? (
          <Dropdown
            label="Columna para valor"
            value={initialValueColumnId}
            options={inputColumnOptions}
            placeholder="Sin columnas activas"
            className="manualRangeSuggestedControl manualRangeSuggestedInitialValueColumnControl"
            onChange={setInitialValueColumnId}
          />
        ) : null}
        <InfoTooltip content="Buscar sugerencias">
          <ActionButton
            icon={(props) => <Search {...props} />}
            variant="icon"
            size="sm"
            className="manualRangeSuggestedSearchButton"
            aria-label="Buscar sugerencias"
            disabled={!canSearch}
            onClick={searchSuggestions}
          />
        </InfoTooltip>
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
            <button type="button" className="secondary danger sm" onClick={() => setIsClearSuggestionsConfirmOpen(true)}>Borrar sugerencias</button>
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
                <div
                  key={range.id}
                  className={[
                    'manualRangeSuggestedItem',
                    isSelected ? 'manualRangeSuggestedItemSelected' : '',
                    overlapsConfiguredRange ? 'manualRangeSuggestedItemOverlap' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <label className="manualRangeSuggestedItemSelect">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSuggestedRange(range.id)} />
                    <span className="manualRangeSuggestedItemTitle">{range.startRowNumber} - {range.endRowNumber}</span>
                    <span className="manualRangeSuggestedItemSummary">{getManualRangeValueSummary(range, inputColumns)}</span>
                  </label>
                  {overlapsConfiguredRange ? <span className="manualRangeSuggestedItemWarning">Se superpone con un rango configurado</span> : null}
                  <InfoTooltip content="Eliminar sugerencia">
                    <ActionButton
                      action="delete"
                      variant="icon"
                      size="sm"
                      className="manualRangeSuggestedItemDeleteButton"
                      aria-label={`Eliminar sugerencia ${range.startRowNumber} - ${range.endRowNumber}`}
                      onClick={() => setSuggestedRangeIdPendingDelete(range.id)}
                    />
                  </InfoTooltip>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
      <ManualRangeClearSuggestionsConfirmDialog
        open={isClearSuggestionsConfirmOpen}
        onCancel={() => setIsClearSuggestionsConfirmOpen(false)}
        onConfirm={clearSuggestions}
      />
      <ManualRangeDeleteSuggestedRangeConfirmDialog
        open={suggestedRangeIdPendingDelete !== null}
        onCancel={() => setSuggestedRangeIdPendingDelete(null)}
        onConfirm={() => {
          if (suggestedRangeIdPendingDelete) {
            removeSuggestedRange(suggestedRangeIdPendingDelete);
          }
        }}
      />
    </section>
  );
}

export function ManualRangeClearSuggestionsConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <ConfirmDialog
      open
      title="Borrar sugerencias"
      message="Se eliminarán las sugerencias generadas. Esta acción no afecta los rangos ya configurados."
      cancelLabel="Cancelar"
      confirmLabel="Borrar"
      variant="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function ManualRangeDiscardSuggestionsConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <ConfirmDialog
      open
      title="Descartar sugerencias"
      message="Se descartarán las sugerencias generadas que todavía no aplicaste. Esta acción no afecta los rangos ya configurados."
      cancelLabel="Cancelar"
      confirmLabel="Descartar"
      variant="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function ManualRangeDeleteSuggestedRangeConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <ConfirmDialog
      open
      title="Borrar sugerencia"
      message="Se eliminará esta sugerencia. Esta acción no afecta los rangos ya configurados."
      cancelLabel="Cancelar"
      confirmLabel="Borrar"
      variant="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function clearManualRangeSuggestedRanges() {
  return {
    suggestedRanges: [] as ManualRangeValue[],
    selectedSuggestedRangeIds: new Set<string>(),
  };
}

export function removeManualRangeSuggestedRange(
  suggestedRanges: ManualRangeValue[],
  selectedSuggestedRangeIds: Set<string>,
  rangeId: string,
) {
  const nextSelectedIds = new Set(selectedSuggestedRangeIds);
  nextSelectedIds.delete(rangeId);

  return {
    suggestedRanges: suggestedRanges.filter((range) => range.id !== rangeId),
    selectedSuggestedRangeIds: nextSelectedIds,
  };
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
  onRequestDeleteRange,
  rangeItemRefs,
}: {
  ranges: ManualRangeValue[];
  inputColumns: InputColumn[];
  selectedRangeId: string | null;
  overlappingRangeIds: Set<string>;
  onSelectRange: (rangeId: string) => void;
  onEditRange: (rangeId: string) => void;
  onSortRanges: () => void;
  onDeleteAllRanges: () => void;
  onRequestDeleteRange: (rangeId: string) => void;
  rangeItemRefs: Map<string, HTMLDivElement>;
}) {
  return (
    <section className="manualRangeSpreadsheetRangesList">
      <div className="manualRangeSpreadsheetRangesListHeader">
        <div className="manualRangeSpreadsheetRangesListTitle">
          <strong>Rangos configurados</strong>
          <InfoTooltip
            ariaLabel="Ayuda: rangos configurados"
            content="Acá se listan los rangos creados. Cada rango define qué valor se aplicará a las filas comprendidas entre su inicio y fin."
          />
        </div>
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
            <div
              key={range.id}
              ref={(node) => {
                if (node) rangeItemRefs.set(range.id, node);
                else rangeItemRefs.delete(range.id);
              }}
              data-manual-range-id={range.id}
              className={getManualRangeCompactItemClassName(range.id, selectedRangeId, overlappingRangeIds)}
            >
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
              <div className="manualRangeSpreadsheetRangeItemActions manualRangeSpreadsheetRangeItemActionsSeparated">
                <InfoTooltip content="Editar rango">
                  <ActionButton
                    action="edit"
                    variant="icon"
                    size="sm"
                    className="manualRangeSpreadsheetRangeEditButton"
                    aria-label="Editar rango"
                    onClick={() => onEditRange(range.id)}
                  />
                </InfoTooltip>
                <InfoTooltip content="Eliminar rango">
                  <ActionButton
                    action="delete"
                    variant="danger"
                    size="sm"
                    className="manualRangeSpreadsheetRangeDeleteButton"
                    aria-label="Eliminar rango"
                    onClick={() => onRequestDeleteRange(range.id)}
                  />
                </InfoTooltip>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


