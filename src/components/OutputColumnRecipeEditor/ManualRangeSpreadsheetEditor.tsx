import { useState } from 'react';
import {
  parseManualRangeRowInput,
  reconcileManualRangeTextSelections,
  updateManualRangeFixedTextValue,
  updateManualRangeInputValue,
  updateManualRangeRangeTextValue,
  updateManualRangeValueRecipeSteps,
  updateManualRangeValueSourceType,
} from '../../domain/import/manualRangeModel';
import type { ManualRangeValue, TransformStep } from '../../types/import';
import type { InputColumn, InputRow, OutputRecipe } from '../../types/import';
import {
  createManualRangeFromSelection,
  getManualRangeById,
  getManualRangeCompactItemClassName,
  getManualRangeSpreadsheetCellValue,
  getManualRangeSpreadsheetColumnLabel,
  getManualRangeSpreadsheetRowClassName,
  getManualRangeSelectionSummary,
  getManualRangeValueSummary,
  getOverlappingManualRangeIds,
  hasCompleteManualRangeSelection,
  patchManualRangeInRecipe,
  removeManualRangeFromRecipe,
  sortManualRangeRecipeByStart,
  updateManualRangeSpreadsheetClickState,
  updateManualRangeSelection,
  type ManualRangeRecipe,
  type RangeSelectionDraft,
} from './ManualRangeSpreadsheetEditor.helpers';
import { RangeValueEditor } from './RangeValueEditor';

type ManualRangeSpreadsheetEditorProps = {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
};

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
  const [selectedRangeId, setSelectedRangeId] = useState<string | null>(null);
  const [lastCreatedRangeId, setLastCreatedRangeId] = useState<string | null>(null);
  const selectedRange = getManualRangeById(recipe.ranges, selectedRangeId);
  const hasSelection = selection.startRowNumber !== null;
  const hasCompleteSelection = hasCompleteManualRangeSelection(selection);
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

      <div className="manualRangeSpreadsheetLayout">
        <div className="manualRangeSpreadsheetTablePane">
          {manualRangeRows.length === 0 ? (
            <p className="manualRangeSpreadsheetEmpty">No hay filas visibles disponibles para configurar rangos.</p>
          ) : inputColumns.length === 0 ? (
            <p className="manualRangeSpreadsheetEmpty">No hay columnas activas disponibles para mostrar.</p>
          ) : (
            <div className="manualRangeSpreadsheetScroller">
              <table className="manualRangeSpreadsheetTable">
                <thead>
                  <tr>
                    <th className="manualRangeSpreadsheetRowNumberHeader">Fila</th>
                    {inputColumns.map((inputColumn) => (
                      <th key={inputColumn.id}>{getManualRangeSpreadsheetColumnLabel(inputColumn)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {manualRangeRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={getManualRangeSpreadsheetRowClassName(row.rowNumber, recipe.ranges, selection, lastCreatedRangeId, selectedRangeId)}
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
                      <th scope="row" className="manualRangeSpreadsheetRowNumber">{row.rowNumber}</th>
                      {inputColumns.map((inputColumn) => {
                        const value = getManualRangeSpreadsheetCellValue(row, inputColumn.id);
                        return <td key={inputColumn.id} title={value}>{value}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <ManualRangeSpreadsheetInspector
          recipe={recipe}
          range={selectedRange}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          onChange={onChange}
          onClearSelection={() => setSelectedRangeId(null)}
          onSelectRange={(rangeId) => {
            setSelectedRangeId(rangeId);
            clearSelection();
          }}
          selectedRangeId={selectedRangeId}
        />
      </div>
    </div>
  );
}

function ManualRangeSpreadsheetInspector({
  recipe,
  range,
  inputColumns,
  manualRangeRows,
  onChange,
  onClearSelection,
  onSelectRange,
  selectedRangeId,
}: {
  recipe: ManualRangeRecipe;
  range: ManualRangeValue | null;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onChange: (recipe: ManualRangeRecipe) => void;
  onClearSelection: () => void;
  onSelectRange: (rangeId: string) => void;
  selectedRangeId: string | null;
}) {
  const overlappingRangeIds = getOverlappingManualRangeIds(recipe.ranges);
  const updateRowNumber = (field: 'startRowNumber' | 'endRowNumber', value: string) => {
    const rowNumber = parseManualRangeRowInput(value);
    if (!range || rowNumber === undefined) {
      return;
    }

    onChange(patchManualRangeInRecipe(recipe, range.id, { [field]: rowNumber }));
  };
  const removeRange = () => {
    if (!range) {
      return;
    }

    onChange(removeManualRangeFromRecipe(recipe, range.id));
    onClearSelection();
  };
  const updateRangeRecipe = (nextRecipe: ManualRangeRecipe) => onChange(nextRecipe);
  const sortRanges = () => onChange(sortManualRangeRecipeByStart(recipe));

  return (
    <aside className="manualRangeSpreadsheetInspector">
      <ManualRangeSpreadsheetRangesList
        ranges={recipe.ranges}
        inputColumns={inputColumns}
        selectedRangeId={selectedRangeId}
        overlappingRangeIds={overlappingRangeIds}
        onSelectRange={onSelectRange}
        onSortRanges={sortRanges}
      />
      {!range ? (
        <div className="manualRangeSpreadsheetInspectorEmpty">
          Seleccioná un rango configurado o creá uno desde la planilla.
        </div>
      ) : (
        <>
          <div className="manualRangeSpreadsheetInspectorTitle">
            <strong>Rango seleccionado</strong>
            <span>Filas {range.startRowNumber} - {range.endRowNumber}</span>
          </div>
          <div className="manualRangeSpreadsheetInspectorSummary">
            <label className="field compact">
              <span>Inicio</span>
              <input
                type="number"
                min="1"
                value={range.startRowNumber}
                onChange={(event) => updateRowNumber('startRowNumber', event.target.value)}
              />
            </label>
            <label className="field compact">
              <span>Fin</span>
              <input
                type="number"
                min="1"
                value={range.endRowNumber}
                onChange={(event) => updateRowNumber('endRowNumber', event.target.value)}
              />
            </label>
          </div>
          <RangeValueEditor
            range={range}
            inputColumns={inputColumns}
            manualRangeRows={manualRangeRows}
            onValueSourceTypeChange={(type) => updateRangeRecipe(updateManualRangeValueSourceType(recipe, range.id, type, inputColumns))}
            onFixedTextChange={(value) => updateRangeRecipe(updateManualRangeFixedTextValue(recipe, range.id, value))}
            onInputColumnChange={(inputColumnId) => updateRangeRecipe(updateManualRangeInputValue(recipe, range.id, inputColumnId))}
            onRangeTextChange={(patch) => {
              const nextPatch = patch.inputColumnId !== undefined && patch.selectedText === undefined
                ? { ...patch, selectedText: '' }
                : patch;
              const nextRecipe = updateManualRangeRangeTextValue(recipe, range.id, nextPatch);
              updateRangeRecipe(reconcileManualRangeTextSelections(nextRecipe, range.id, manualRangeRows));
            }}
            onStepsChange={(steps: TransformStep[]) => updateRangeRecipe(updateManualRangeValueRecipeSteps(recipe, range.id, steps))}
          />
          <div className="manualRangeSpreadsheetInspectorActions">
            <button type="button" className="secondary" onClick={removeRange}>
              Eliminar rango
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

function ManualRangeSpreadsheetRangesList({
  ranges,
  inputColumns,
  selectedRangeId,
  overlappingRangeIds,
  onSelectRange,
  onSortRanges,
}: {
  ranges: ManualRangeValue[];
  inputColumns: InputColumn[];
  selectedRangeId: string | null;
  overlappingRangeIds: Set<string>;
  onSelectRange: (rangeId: string) => void;
  onSortRanges: () => void;
}) {
  return (
    <section className="manualRangeSpreadsheetRangesList">
      <div className="manualRangeSpreadsheetRangesListHeader">
        <strong>Rangos configurados</strong>
        <div className="manualRangeSpreadsheetRangeListActions">
          <button type="button" className="secondary sm manualRangeSpreadsheetSortButton" disabled={ranges.length < 2} onClick={onSortRanges}>
            Ordenar por inicio
          </button>
        </div>
      </div>
      {ranges.length === 0 ? (
        <p className="manualRangeSpreadsheetInspectorEmpty">Todavía no hay rangos configurados. Seleccioná filas en la planilla para crear uno.</p>
      ) : (
        <div className="manualRangeSpreadsheetRangesListItems">
          {ranges.map((range) => (
            <button
              key={range.id}
              type="button"
              className={getManualRangeCompactItemClassName(range.id, selectedRangeId, overlappingRangeIds)}
              onClick={() => onSelectRange(range.id)}
            >
              <span className="manualRangeSpreadsheetRangeItemTitle">{range.startRowNumber} - {range.endRowNumber}</span>
              <span className="manualRangeSpreadsheetRangeItemSummary">{getManualRangeValueSummary(range, inputColumns)}</span>
              {overlappingRangeIds.has(range.id) ? (
                <span className="manualRangeSpreadsheetRangeItemSummary">Se superpone con otro rango</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
