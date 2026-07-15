import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { describeManualRangeCondition, duplicateManualRangeValue, getManualRangeReferenceText, getManualRangeRowCountFromInputs, manualRangeRecipeToStepPatch, manualRangeStepToRecipe, parseManualRangeRowInput, reconcileManualRangeTextSelections, removeManualRangeValue, updateManualRangePrimarySourceAndSteps, updateManualRangeValue, updateManualRangeValueRecipeSteps } from '../../domain/import/manualRangeModel';
import { buildProcessedRows } from '../../domain/import/outputModel';
import type { DateInputFormat, InputColumn, InputRow, ManualRangeValue, OutputColumn, OutputRecipe, RecipePart, StepSource, TransformStep, TransformStepMode } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { Modal } from '../Modal/Modal';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { AppIcon } from '../ui/AppIcon/AppIcon';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { noActiveColumnsLabel } from './OutputColumnRecipeEditor.constants';
import { previousResultFieldLabel, recipeStepModeLabels } from './OutputColumnRecipeEditor.actionDefinitions';
import { CustomValueSummary, RecipeMainFields } from './OutputColumnRecipeEditor.components';
import {
  getDatePickerValue,
  getStepSourceForTextAction,
  getStepTextSourceAction,
  updateStep,
  type StepTextSourceAction,
} from './OutputColumnRecipeEditor.optionHelpers';
import {
  appendConcatPartAdditionalStep,
  applyRecipeEditorDraft,
  buildRecipeForSelectedType,
  buildSimpleCustomValueRecipeWithSteps,
  buildStepBasedCustomValueRecipe,
  createNoopStep,
  getCustomValueMode,
  getDefaultStepModeForRecipe,
  getFirstStepSource,
  getRecipeEditorModalRecipe,
  getSimpleInputPart,
  getStepMode,
  getVisibleConcatPartPrimaryStep,
  getVisibleRecipeSteps,
  hasRecipeEditorDraftChanges,
  replaceWholeStep,
  replaceWholeStepForAction,
  replaceWholeStepForMode,
  updateConcatPartPrimarySource,
  type CustomValueMode,
  type EditableCustomRecipe,
} from './OutputColumnRecipeEditor.recipeHelpers';
import { StepConditionFields, StepModeSelect, StepTypeSelect, type PreviousResultDisplay } from './OutputColumnRecipeEditor.StepFields';
import { RangeValueEditor } from './RangeValueEditor';
import { ManualRangeSpreadsheetEditor } from './ManualRangeSpreadsheetEditor';
import { RecipeStudioShell, type ComposePartEditorRenderProps, type ComposeStepHeaderRenderProps } from './RecipeStudio';
import { StepEditorBlock, type StepEditorBlockFieldRenderer } from './StepEditorBlock';
import { createStepEditorContext, getVisibleStepAction, normalizeStepForContext, type StepEditorContext, type StepSourceAction } from './OutputColumnRecipeEditor.stepPolicy';
import { createPreviousResultDisplay, isDeterministicPreviousResultRecipe } from './OutputColumnRecipeEditor.previousResultHelpers';
export { addComposeRecipePart, createRecipeForStudioMode, getComposeColumnTextOptions, getComposeValidColumnTextSelection, reorderComposeRecipeParts, updateComposeColumnTextSelection } from './RecipeStudio';
import {
  buildCombinePreview,
  buildCustomValuePreview,
  buildManualRangeRecipePreview,
  getConstructorAdjustmentLabels,
  getCustomValuePartsDisplaySummary,
  getConfiguredConcatStep,
  getRecipeStepTitle,
  getStepSummary,
} from './OutputColumnRecipeEditor.displayHelpers';

export {
  dateInputFormatOptions,
  dateOutputFormatOptions,
  getDatePickerValue,
  getSimpleStepValue,
  getStepModeOptions,
  getStepSourceDropdownOptions,
  getStepSourceDropdownValue,
  getStepSourceForTextAction,
  getStepSourceFromDropdownValue,
  getStepTextSourceActionOptions,
  getStepTypesForMode,
  numericOperationOptions,
  setSimpleStep,
  shouldShowPreviousResultSourceHelp,
  stepModeOptions,
  updateStep,
} from './OutputColumnRecipeEditor.optionHelpers';
export type { StepTextSourceAction } from './OutputColumnRecipeEditor.optionHelpers';
export { recipeEditorPreviousResultHelpText } from './OutputColumnRecipeEditor.constants';
export { isDeterministicPreviousResultRecipe } from './OutputColumnRecipeEditor.previousResultHelpers';
export { StepConditionFields, shouldShowStepTypeSelectForStep } from './OutputColumnRecipeEditor.StepFields';
export {
  buildCombinePreview,
  buildCustomValuePreview,
  buildManualRangeAwarePreview,
  buildManualRangeRecipePreview,
  describeCombineParts,
  getConstructorAdjustmentLabels,
  getConstructorAdjustmentsSummary,
  getConstructorPartsSummary,
  getCustomValuePartsDisplayLabel,
  getCustomValuePartsDisplaySummary,
} from './OutputColumnRecipeEditor.displayHelpers';
export {
  addConcatPartToList,
  appendConcatPartAdditionalStep,
  applyRecipeEditorDraft,
  buildRecipeForSelectedType,
  buildSimpleCustomValueRecipe,
  changeStepMode,
  clearManualRangeValues,
  createCustomValueRecipeForMode,
  createDefaultConcatPart,
  createRecipeForConstructionMode,
  describeConcatPartSource,
  getNextSelectedConcatPartIdAfterRemove,
  getOutputRecipeTypeOptions,
  getOutputRecipeTypeSelectorValue,
  getRecipeEditorModalRecipe,
  getRecipeStudioMode,
  getSafeSelectedConcatPartId,
  getStepMode,
  getTextStepSourceLabel,
  getVisibleConcatPartPrimaryStep,
  getVisibleLeftOperand,
  getVisibleRecipeSteps,
  getVisibleRightOperand,
  hasRecipeEditorDraftChanges,
  inferStepModeFromType,
  normalizeConcatPartsAfterReorder,
  normalizeStepsForMode,
  outputRecipeTypeOptions,
  removeConcatPartFromList,
  reorderConcatParts,
  replaceWholeStep,
  replaceWholeStepForAction,
  replaceWholeStepForMode,
  shouldShowTextSourceFields,
  updateConcatPartInList,
  updateConcatPartPrimarySource,
  updateConcatPartPrimaryStep,
  updateConcatPartSteps,
  valueConstructionOptions,
} from './OutputColumnRecipeEditor.recipeHelpers';

type OutputColumnRecipeEditorProps = {
  column: OutputColumn;
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  sampleInputValues?: Record<string, string>;
  onChange: (column: OutputColumn) => void;
};

export const manualRangeUsageHelpText = 'Los rangos sirven cuando un valor debe repetirse en varias filas. Si el valor ya está en cada fila, usá una columna de entrada.';

export const recipeEditorModalCancelLabel = 'Cancelar';
export const recipeEditorModalApplyLabel = 'Aplicar';
export const recipeEditorDiscardChangesTitle = 'Descartar';
export const recipeEditorDiscardChangesMessage = 'Hay cambios sin aplicar en esta receta. Si cerrás el editor, se perderán.';
export const recipeEditorDiscardChangesCancelLabel = 'Seguir editando';
export const recipeEditorDiscardChangesConfirmLabel = 'Descartar cambios';
export const recipeEditorAdditionalStepLabel = 'Agregar paso';

export function OutputColumnRecipeEditor({ column, inputColumns, manualRangeRows = [], sampleInputValues, onChange }: OutputColumnRecipeEditorProps) {
  const activeInputColumns = inputColumns.filter((inputColumn) => inputColumn.active);
  const [isConstructorOpen, setIsConstructorOpen] = useState(false);
  const [isDiscardConfirmationOpen, setIsDiscardConfirmationOpen] = useState(false);
  const [draftRecipe, setDraftRecipe] = useState<EditableCustomRecipe | null>(null);
  const [customValueMode, setCustomValueMode] = useState<CustomValueMode>('');
  const isApplyingConstructorRef = useRef(false);
  const modalRecipe = getRecipeEditorModalRecipe(column.recipe, draftRecipe);
  const modalCombineRecipe = modalRecipe?.type === 'combine' ? modalRecipe : null;
  const modalManualRangeRecipe = modalRecipe?.type === 'manualRange' ? modalRecipe : null;
  const hasDraftChanges = column.recipe.type === 'combine' || column.recipe.type === 'manualRange'
    ? hasRecipeEditorDraftChanges(column.recipe, draftRecipe)
    : false;
  const effectiveCustomValueMode = column.recipe.type === 'combine'
    ? getCustomValueMode(column.recipe) || customValueMode
    : '';
  const effectiveModalCustomValueMode = modalCombineRecipe
    ? getCustomValueMode(modalCombineRecipe) || customValueMode
    : '';
  const customValuePreview = column.recipe.type === 'combine'
    ? buildCustomValuePreview(column.recipe, sampleInputValues, false, effectiveCustomValueMode, manualRangeRows)
    : '';
  const customValuePartsSummary = column.recipe.type === 'combine'
    ? getCustomValuePartsDisplaySummary(column.recipe, activeInputColumns)
    : '';
  const customValueAdjustments = column.recipe.type === 'combine'
    ? getConstructorAdjustmentLabels(column.recipe, activeInputColumns)
    : [];
  const updateRecipe = (recipe: OutputRecipe) => {
    onChange({ ...column, recipe });
  };
  const openConstructor = (recipe: EditableCustomRecipe) => {
    isApplyingConstructorRef.current = false;
    setDraftRecipe(recipe);
    setIsConstructorOpen(true);
  };
  const updateDraftRecipe = (nextRecipe: EditableCustomRecipe | ((current: EditableCustomRecipe) => EditableCustomRecipe)) => {
    setDraftRecipe((currentDraftRecipe) => {
      const currentRecipe = currentDraftRecipe ?? modalRecipe;
      if (!currentRecipe) {
        return currentDraftRecipe;
      }

      return typeof nextRecipe === 'function' ? nextRecipe(currentRecipe) : nextRecipe;
    });
  };
  const closeConstructor = () => {
    isApplyingConstructorRef.current = false;
    setIsDiscardConfirmationOpen(false);
    setDraftRecipe(null);
    setIsConstructorOpen(false);
  };
  const requestCancelConstructor = () => {
    if (isApplyingConstructorRef.current) {
      closeConstructor();
      return;
    }

    if (!hasDraftChanges) {
      closeConstructor();
      return;
    }

    setIsDiscardConfirmationOpen(true);
  };
  const cancelDiscardConstructor = () => {
    setIsDiscardConfirmationOpen(false);
  };
  const confirmDiscardConstructor = () => {
    setIsDiscardConfirmationOpen(false);
    closeConstructor();
  };
  const applyConstructor = () => {
    if (draftRecipe) {
      isApplyingConstructorRef.current = true;
      onChange(applyRecipeEditorDraft(column, draftRecipe));
    }

    setIsDiscardConfirmationOpen(false);
    setDraftRecipe(null);
    setIsConstructorOpen(false);
  };

  return (
    <div className="recipeEditor">
      <RecipeMainFields
        column={column}
        activeInputColumns={activeInputColumns}
        onTypeChange={(nextType) => {
          if (nextType === 'combine') {
            setCustomValueMode('');
          }
          updateRecipe(buildRecipeForSelectedType(nextType, column, activeInputColumns));
        }}
        onDirectInputColumnChange={(inputColumnId) => updateRecipe({ type: 'direct', inputColumnId })}
        onFixedTextChange={(value) => updateRecipe({ type: 'fixedText', value })}
      />

      {column.recipe.type === 'combine' ? (
        <>
          <CustomValueSummary
            preview={customValuePreview}
            partsSummary={customValuePartsSummary}
            adjustments={customValueAdjustments}
            onEdit={() => {
              if (column.recipe.type === 'combine') {
                openConstructor(column.recipe);
              }
            }}
          />
          <Modal
            open={isConstructorOpen}
            title={`Columna: "${column.label || 'Sin nombre'}"`}
            titleInfo="Configurá cómo se arma este valor antes de aplicarlo."
            size="xl"
            onClose={requestCancelConstructor}
            headerDetails={(
              <div className="constructorModalHeaderDetails">
                <div className="constructorModalHeaderPreview">
                  <strong>Vista previa</strong>
                  <span>{modalCombineRecipe ? buildCustomValuePreview(modalCombineRecipe, sampleInputValues, true, effectiveModalCustomValueMode, manualRangeRows) : customValuePreview}</span>
                </div>
              </div>
            )}
            footer={(
              <div className="constructorModalFooterContent">
                <div className="constructorModalFooterActions">
                  <ActionButton action="close" variant="secondary" onClick={requestCancelConstructor}>
                    {recipeEditorModalCancelLabel}
                  </ActionButton>
                  <ActionButton action="done" onClick={applyConstructor}>
                    {recipeEditorModalApplyLabel}
                  </ActionButton>
                </div>
              </div>
            )}
          >
            {isConstructorOpen && modalCombineRecipe ? (
              <RecipeStudioShell
                recipe={modalCombineRecipe}
                inputColumns={activeInputColumns}
                manualRangeRows={manualRangeRows}
                sampleInputValues={sampleInputValues}
                preview={buildCustomValuePreview(modalCombineRecipe, sampleInputValues, true, effectiveModalCustomValueMode, manualRangeRows)}
                customValueMode={effectiveModalCustomValueMode}
                renderCustomValueEditor={(props) => <CustomValueEditor {...props} />}
                renderComposePartEditor={(props) => <ComposePartEditor {...props} />}
                renderComposeStepHeader={(props) => <ComposeStepHeader {...props} />}
                renderManualRangeRecipeEditor={(props) => <ManualRangeRecipeEditor {...props} />}
                onChange={updateDraftRecipe}
              />
            ) : null}
          </Modal>
          <ConfirmDialog
            open={isDiscardConfirmationOpen}
            title={recipeEditorDiscardChangesTitle}
            message={recipeEditorDiscardChangesMessage}
            cancelLabel={recipeEditorDiscardChangesCancelLabel}
            confirmLabel={recipeEditorDiscardChangesConfirmLabel}
            variant="danger"
            onCancel={cancelDiscardConstructor}
            onConfirm={confirmDiscardConstructor}
          />
        </>
      ) : null}

      {column.recipe.type === 'manualRange' ? (
        <>
          <ManualRangeSummary
            recipe={column.recipe}
            inputColumns={activeInputColumns}
            onEdit={() => {
              if (column.recipe.type === 'manualRange') {
                openConstructor(column.recipe);
              }
            }}
          />
          <Modal
            open={isConstructorOpen}
            title={`Columna: "${column.label || 'Sin nombre'}"`}
            titleInfo="Configurá cómo se arma este valor antes de aplicarlo."
            size="xl"
            onClose={requestCancelConstructor}
            headerDetails={(
              <div className="constructorModalHeaderDetails">
                <div className="constructorModalHeaderPreview">
                  <strong>Vista previa</strong>
                  <span>{modalManualRangeRecipe ? buildManualRangeRecipePreview(modalManualRangeRecipe, manualRangeRows, sampleInputValues) ?? 'Sin vista previa para los rangos configurados' : 'Sin vista previa para los rangos configurados'}</span>
                </div>
              </div>
            )}
            footer={(
              <div className="constructorModalFooterContent">
                <div className="constructorModalFooterActions">
                  <ActionButton action="close" variant="secondary" onClick={requestCancelConstructor}>
                    {recipeEditorModalCancelLabel}
                  </ActionButton>
                  <ActionButton action="done" onClick={applyConstructor}>
                    {recipeEditorModalApplyLabel}
                  </ActionButton>
                </div>
              </div>
            )}
          >
            {isConstructorOpen && modalManualRangeRecipe ? (
              <RecipeStudioShell
                recipe={modalManualRangeRecipe}
                inputColumns={activeInputColumns}
                manualRangeRows={manualRangeRows}
                sampleInputValues={sampleInputValues}
                preview={buildManualRangeRecipePreview(modalManualRangeRecipe, manualRangeRows, sampleInputValues) ?? 'Sin vista previa para los rangos configurados'}
                customValueMode=""
                renderCustomValueEditor={(props) => <CustomValueEditor {...props} />}
                renderComposePartEditor={(props) => <ComposePartEditor {...props} />}
                renderComposeStepHeader={(props) => <ComposeStepHeader {...props} />}
                renderManualRangeRecipeEditor={(props) => <ManualRangeRecipeEditor {...props} />}
                onChange={updateDraftRecipe}
              />
            ) : null}
          </Modal>
          <ConfirmDialog
            open={isDiscardConfirmationOpen}
            title={recipeEditorDiscardChangesTitle}
            message={recipeEditorDiscardChangesMessage}
            cancelLabel="Cancelar"
            confirmLabel="Descartar"
            variant="danger"
            onCancel={cancelDiscardConstructor}
            onConfirm={confirmDiscardConstructor}
          />
        </>
      ) : null}
    </div>
  );
}

function ManualRangeSummary({
  recipe,
  onEdit,
}: {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  onEdit: () => void;
}) {
  return (
    <div className="recipeSubBlock constructorSummary manualRangeSummary">
      <div>
        <strong className="headingWithInfo">
          <span>{recipeStepModeLabels.manualRange}</span>
          <InfoTooltip content="Asigna valores segun rangos de filas reales del Excel." />
        </strong>
        <dl className="customValueSummaryList">
          <div>
            <dt>Tipo de operación</dt>
            <dd>Valores por rangos</dd>
          </div>
          <div>
            <dt>Qué hace</dt>
            <dd>Asigna valores según rangos de filas configurados.</dd>
          </div>
          <div>
            <dt>Referencia</dt>
            <dd>{recipe.ranges.length} {recipe.ranges.length === 1 ? 'rango creado' : 'rangos creados'}</dd>
          </div>
        </dl>
      </div>
      <ActionButton action="edit" variant="secondary" onClick={onEdit}>
        Editar
      </ActionButton>
    </div>
  );
}

export function ManualRangeRecipeEditor({
  recipe,
  inputColumns,
  manualRangeRows,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
}) {
  return (
    <div className="manualRangeEditor">
      {recipe.condition ? (
        <p className="manualRangeWarning">
          Esta configuración conserva una condición interna heredada: {describeManualRangeCondition(recipe, inputColumns)}. Para nuevas condiciones usá la condición general del paso.
        </p>
      ) : null}
      <ManualRangeSpreadsheetEditor
        recipe={recipe}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        onChange={onChange}
      />
    </div>
  );
}

export function ManualRangeTableRow({
  recipe,
  range,
  inputColumns,
  manualRangeRows,
  initiallyShowRowsPreview = false,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  range: ManualRangeValue;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  initiallyShowRowsPreview?: boolean;
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
}) {
  const [startRowInput, setStartRowInput] = useState(formatManualRangeRowInput(range.startRowNumber));
  const [endRowInput, setEndRowInput] = useState(formatManualRangeRowInput(range.endRowNumber));
  const [showRowsPreview, setShowRowsPreview] = useState(initiallyShowRowsPreview);
  const rowCount = getManualRangeRowCountFromInputs(startRowInput, endRowInput);
  const referenceText = getManualRangeReferenceText(range);
  const rowsPreviewActionLabel = showRowsPreview ? 'Ocultar filas' : 'Ver filas';

  useEffect(() => {
    setStartRowInput(formatManualRangeRowInput(range.startRowNumber));
  }, [range.id, range.startRowNumber]);

  useEffect(() => {
    setEndRowInput(formatManualRangeRowInput(range.endRowNumber));
  }, [range.id, range.endRowNumber]);

  useEffect(() => {
    const reconciledRecipe = reconcileManualRangeTextSelections(recipe, range.id, manualRangeRows);
    if (reconciledRecipe !== recipe) {
      onChange(reconciledRecipe);
    }
  }, [manualRangeRows, onChange, range.id, recipe]);

  const updateStartRowInput = (value: string) => {
    setStartRowInput(value);
    const startRowNumber = parseManualRangeRowInput(value);
    const nextRecipe = updateManualRangeValue(recipe, range.id, { startRowNumber: startRowNumber ?? 0 });
    onChange(reconcileManualRangeTextSelections(nextRecipe, range.id, manualRangeRows));
  };

  const updateEndRowInput = (value: string) => {
    setEndRowInput(value);
    const endRowNumber = parseManualRangeRowInput(value);
    const nextRecipe = updateManualRangeValue(recipe, range.id, { endRowNumber: endRowNumber ?? 0 });
    onChange(reconcileManualRangeTextSelections(nextRecipe, range.id, manualRangeRows));
  };
  const updateRangeSourceAndSteps = (source: StepSource, steps: TransformStep[]) => {
    return updateManualRangePrimarySourceAndSteps(recipe, range.id, source, steps, manualRangeRows);
  };

  return (
    <div className="manualRangeRangeItem">
      <div className="manualRangeMetadataRow">
        <label className="field compact manualRangeCellField">
          <span>Inicio</span>
          <input
            aria-label="Inicio"
            type="number"
            min="1"
            value={startRowInput}
            onChange={(event) => updateStartRowInput(event.target.value)}
          />
        </label>
        <label className="field compact manualRangeCellField">
          <span>Fin</span>
          <input
            aria-label="Fin"
            type="number"
            min="1"
            value={endRowInput}
            onChange={(event) => updateEndRowInput(event.target.value)}
          />
        </label>
        <div className="field compact manualRangeCellField manualRangeRowCountField">
          <span>Filas</span>
          <strong>{rowCount || '-'}</strong>
        </div>
        <div className="field compact manualRangeReferenceField">
          <span>Referencia</span>
          <strong>{referenceText || '-'}</strong>
        </div>
        <div className="manualRangeActionsField">
          <span>Acciones</span>
          <div className="manualRangeRowActions">
            <InfoTooltip content={rowsPreviewActionLabel}>
              <button
                type="button"
                className="secondary sm manualRangeIconAction"
                aria-label={rowsPreviewActionLabel}
                title={rowsPreviewActionLabel}
                onClick={() => setShowRowsPreview((isOpen) => !isOpen)}
              >
                <AppIcon name="eye" size={18} aria-hidden="true" focusable="false" />
                <span className="manualRangeIconActionLabel">{rowsPreviewActionLabel}</span>
              </button>
            </InfoTooltip>
            <InfoTooltip content="Duplicar rango">
              <ActionButton
                action="duplicate"
                variant="secondary"
                size="sm"
                title="Duplicar rango"
                aria-label="Duplicar rango"
                onClick={() => onChange(duplicateManualRangeValue(recipe, range.id))}
              />
            </InfoTooltip>
            <InfoTooltip content="Eliminar rango">
              <DeleteButton title="Eliminar rango" onClick={() => onChange(removeManualRangeValue(recipe, range.id))} />
            </InfoTooltip>
          </div>
        </div>
      </div>
      <div className="manualRangeEditorRow">
        <RangeValueEditor
          range={range}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          onSourceAndStepsChange={(source, steps) => onChange(updateRangeSourceAndSteps(source, steps))}
          onStepsChange={(steps) => onChange(updateManualRangeValueRecipeSteps(recipe, range.id, steps))}
        />
      </div>
      {showRowsPreview ? (
        <ManualRangeRowsPreview
          range={range}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
        />
      ) : null}
    </div>
  );
}

export function formatManualRangeRowInput(rowNumber: number) {
  return Number.isInteger(rowNumber) && rowNumber > 0 ? String(rowNumber) : '';
}

export function getManualRangePreviewRowsForRange(range: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>, rows: InputRow[], limit = 30) {
  const rowsInRange = rows
    .filter((row) => row.rowNumber >= range.startRowNumber && row.rowNumber <= range.endRowNumber)
    .sort((left, right) => left.rowNumber - right.rowNumber);

  return {
    rows: rowsInRange.slice(0, limit),
    total: rowsInRange.length,
  };
}

export function getManualRangePreviewColumnsForRows(rows: InputRow[], inputColumns: InputColumn[], maxColumns = 8) {
  return inputColumns
    .filter((inputColumn) => rows.some((row) => String(row.values[inputColumn.id] ?? '').trim()))
    .slice(0, maxColumns);
}

function ManualRangeRowsPreview({
  range,
  inputColumns,
  manualRangeRows,
}: {
  range: ManualRangeValue;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
}) {
  const { rows, total } = getManualRangePreviewRowsForRange(range, manualRangeRows);
  const previewColumns = getManualRangePreviewColumnsForRows(rows, inputColumns);

  return (
    <div className="manualRangeRowsPreview">
      <div className="manualRangeRowsPreviewHeader">
        <strong>Filas del rango</strong>
        <span>Filas reales del Excel incluidas en este rango.</span>
      </div>
      {manualRangeRows.length === 0 ? (
        <p className="manualRangeValueHelp">No hay filas disponibles para previsualizar este rango.</p>
      ) : total === 0 ? (
        <p className="manualRangeValueHelp">No se encontraron filas dentro de este rango.</p>
      ) : (
        <>
          {total > rows.length ? (
            <p className="manualRangeValueHelp">Mostrando {rows.length} de {total} filas del rango.</p>
          ) : null}
          {previewColumns.length === 0 ? (
            <p className="manualRangeValueHelp">No hay columnas con datos en este rango.</p>
          ) : null}
          <div className="manualRangeRowsPreviewScroller">
            <table className="manualRangeRowsPreviewTable">
              <thead>
                <tr>
                  <th>Fila</th>
                  {previewColumns.map((inputColumn) => (
                    <th key={inputColumn.id}>{getInputColumnLabel(inputColumn)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <th scope="row">{row.rowNumber}</th>
                    {previewColumns.map((inputColumn) => {
                      const value = String(row.values[inputColumn.id] ?? '');
                      return <td key={inputColumn.id} title={value}>{value}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export function getPreviousStepPreviewValue(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  sampleInputValues: Record<string, string> | undefined,
  stepIndex: number,
) {
  if (stepIndex <= 0 || !sampleInputValues) {
    return null;
  }

  const previousSteps = getVisibleRecipeSteps(recipe).slice(0, stepIndex);
  return buildCombinePreview({ ...recipe, steps: previousSteps }, sampleInputValues);
}

export function getPreviousResultDisplay(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  sampleInputValues: Record<string, string> | undefined,
  rows: InputRow[],
  stepIndex: number,
): PreviousResultDisplay | null {
  if (stepIndex <= 0) {
    return null;
  }

  const previousSteps = getVisibleRecipeSteps(recipe).slice(0, stepIndex);
  const previousRecipe = { ...recipe, steps: previousSteps };
  const examples = getPreviousResultExamples(previousRecipe, sampleInputValues, rows);
  return createPreviousResultDisplay(
    isDeterministicPreviousResultRecipe(previousRecipe),
    buildCombinePreview(previousRecipe, sampleInputValues ?? {}) ?? '',
    examples,
  );
}

function getPreviousResultExamples(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  sampleInputValues: Record<string, string> | undefined,
  rows: InputRow[],
) {
  const values: string[] = [];
  const seen = new Set<string>();
  const addValue = (value: string | null | undefined) => {
    const normalizedValue = String(value ?? '').trim();
    if (!normalizedValue || seen.has(normalizedValue)) {
      return;
    }

    seen.add(normalizedValue);
    values.push(normalizedValue);
  };

  if (rows.length > 0) {
    const previewColumn: OutputColumn = {
      id: 'previous-result-examples',
      label: previousResultFieldLabel,
      order: 0,
      enabled: true,
      recipe,
    };
    for (const row of buildProcessedRows(rows, [previewColumn])) {
      addValue(row.outputValues[previewColumn.id]);
      if (values.length >= 3) {
        return values;
      }
    }
  }

  if (sampleInputValues) {
    addValue(buildCombinePreview(recipe, sampleInputValues));
  }

  return values.slice(0, 3);
}

export function CustomValueEditor({
  recipe,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  mode,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  mode: CustomValueMode;
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }> | ((current: Extract<OutputRecipe, { type: 'combine' }>) => Extract<OutputRecipe, { type: 'combine' }>)) => void;
}) {
  const baseInputPart = getSimpleInputPart(recipe);
  const visibleSteps = getVisibleRecipeSteps(recipe, mode);
  const defaultStepMode = getDefaultStepModeForRecipe(recipe, mode);
  const updateBaseInputColumn = (inputColumnId: string) => {
    const nextMode = defaultStepMode === 'number' ? 'number' : 'text';
    onChange(buildSimpleCustomValueRecipeWithSteps(nextMode, inputColumnId, visibleSteps, recipe));
  };
  const updateSteps = (steps: TransformStep[] | ((currentSteps: TransformStep[]) => TransformStep[])) => {
    onChange((currentRecipe) => {
      const currentMode = getCustomValueMode(currentRecipe) || mode;
      const currentSteps = getVisibleRecipeSteps(currentRecipe, currentMode);
      const nextSteps = typeof steps === 'function' ? steps(currentSteps) : steps;
      return buildStepBasedCustomValueRecipe(currentRecipe, nextSteps, getDefaultStepModeForRecipe(currentRecipe, currentMode));
    });
  };

  return (
    <div className="customValueEditor nonConcatStudio">
      <StepBlocksEditor
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        defaultStepMode={defaultStepMode}
        baseInputColumnId={baseInputPart.inputColumnId}
        steps={visibleSteps}
        requireAtLeastOne
        studioLayout
        getPreviousStepPreviewValue={(stepIndex) => getPreviousStepPreviewValue(recipe, sampleInputValues, stepIndex)}
        getPreviousResultDisplay={(stepIndex) => getPreviousResultDisplay(recipe, sampleInputValues, manualRangeRows, stepIndex)}
        onBaseInputColumnChange={updateBaseInputColumn}
        onStepsChange={updateSteps}
      />
    </div>
  );
}

function StepBlocksEditor({
  inputColumns,
  manualRangeRows = [],
  defaultStepMode,
  baseInputColumnId,
  steps,
  requireAtLeastOne = false,
  studioLayout = false,
  getPreviousStepPreviewValue,
  getPreviousResultDisplay,
  onBaseInputColumnChange,
  onStepsChange,
}: {
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  defaultStepMode: TransformStepMode;
  baseInputColumnId: string;
  steps: TransformStep[];
  requireAtLeastOne?: boolean;
  studioLayout?: boolean;
  getPreviousStepPreviewValue?: (stepIndex: number) => string | null;
  getPreviousResultDisplay?: (stepIndex: number) => PreviousResultDisplay | null;
  onBaseInputColumnChange: (inputColumnId: string) => void;
  onStepsChange: (steps: TransformStep[] | ((currentSteps: TransformStep[]) => TransformStep[])) => void;
}) {
  const addStep = () => {
    onStepsChange((currentSteps) => [...currentSteps, createFollowUpStep(defaultStepMode)]);
  };

  const deleteStep = (indexToDelete: number) => {
    if (requireAtLeastOne && steps.length <= 1) {
      return;
    }

    onStepsChange((currentSteps) => currentSteps.filter((_, index) => index !== indexToDelete));
  };

  if (studioLayout && steps.length > 0) {
    const [primaryStep, ...additionalSteps] = steps;

    return (
      <div className="simpleStepsEditor nonConcatStepsEditor">
        <SimpleStepBlock
          step={primaryStep}
          index={0}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          defaultStepMode={defaultStepMode}
          baseInputColumnId={baseInputColumnId}
          canDelete={false}
          previousResultPreviewValue={getPreviousStepPreviewValue?.(0) ?? null}
          previousResultDisplay={getPreviousResultDisplay?.(0) ?? null}
          studioLayout
          studioActionContent={(
            <>
              {additionalSteps.length > 0 ? (
                <div className="stepsBlock nonConcatAdditionalSteps">
                  {additionalSteps.map((step, additionalIndex) => {
                    const index = additionalIndex + 1;
                    return (
                      <div key={step.id} className="concatPartStepDivider">
                        <SimpleStepBlock
                          step={step}
                          index={index}
                          inputColumns={inputColumns}
                          manualRangeRows={manualRangeRows}
                          defaultStepMode={defaultStepMode}
                          baseInputColumnId={baseInputColumnId}
                          canDelete
                          previousResultPreviewValue={getPreviousStepPreviewValue?.(index) ?? null}
                          previousResultDisplay={getPreviousResultDisplay?.(index) ?? null}
                          onBaseInputColumnChange={onBaseInputColumnChange}
                          onChange={(patch) => onStepsChange((currentSteps) => updateStepWithIndexFallback(currentSteps, step.id, patch, index))}
                          onReplace={(nextStep) => onStepsChange((currentSteps) => replaceWholeStepWithIndexFallback(currentSteps, step.id, nextStep, index))}
                          onDelete={() => deleteStep(index)}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <div className="stepsBlockActions">
                <InfoTooltip content="Agrega una transformacion nueva al valor.">
                  <ActionButton action="add" variant="secondary" className="constructorAddStepButton" onClick={addStep}>Agregar paso</ActionButton>
                </InfoTooltip>
              </div>
            </>
          )}
          onBaseInputColumnChange={onBaseInputColumnChange}
          onChange={(patch) => onStepsChange((currentSteps) => updateStepWithIndexFallback(currentSteps, primaryStep.id, patch, 0))}
          onReplace={(nextStep) => onStepsChange((currentSteps) => replaceWholeStepWithIndexFallback(currentSteps, primaryStep.id, nextStep, 0))}
          onDelete={() => undefined}
        />
      </div>
    );
  }

  return (
    <div className="simpleStepsEditor">
      {steps.length === 0 ? (
        <p className="muted">Sin pasos configurados.</p>
      ) : (
        <div className="stepsBlock">
          {steps.map((step, index) => (
            <SimpleStepBlock
              key={step.id}
              step={step}
              index={index}
              inputColumns={inputColumns}
              manualRangeRows={manualRangeRows}
              defaultStepMode={defaultStepMode}
              baseInputColumnId={baseInputColumnId}
              canDelete={!requireAtLeastOne || steps.length > 1}
              previousResultPreviewValue={getPreviousStepPreviewValue?.(index) ?? null}
              previousResultDisplay={getPreviousResultDisplay?.(index) ?? null}
              onBaseInputColumnChange={onBaseInputColumnChange}
              onChange={(patch) => onStepsChange((currentSteps) => updateStepWithIndexFallback(currentSteps, step.id, patch, index))}
              onReplace={(nextStep) => onStepsChange((currentSteps) => replaceWholeStepWithIndexFallback(currentSteps, step.id, nextStep, index))}
              onDelete={() => deleteStep(index)}
            />
          ))}
        </div>
      )}
      <div className="stepsBlockActions">
        <InfoTooltip content="Agrega una transformacion nueva al valor.">
          <ActionButton action="add" variant="secondary" className="constructorAddStepButton" onClick={addStep}>Agregar paso</ActionButton>
        </InfoTooltip>
      </div>
    </div>
  );
}

function createFollowUpStep(mode: TransformStepMode): TransformStep {
  return {
    ...createNoopStep(mode),
    source: { type: 'previousResult' },
  };
}

function updateStepWithIndexFallback(steps: TransformStep[], id: string, patch: Partial<TransformStep>, fallbackIndex: number) {
  if (steps.some((step) => step.id === id)) {
    return updateStep(steps, id, patch);
  }

  return steps.map((step, index) => (index === fallbackIndex ? { ...step, ...patch } : step));
}

function replaceWholeStepWithIndexFallback(steps: TransformStep[], id: string, nextStep: TransformStep, fallbackIndex: number) {
  if (steps.some((step) => step.id === id)) {
    return replaceWholeStep(steps, id, nextStep);
  }

  return steps.map((step, index) => (index === fallbackIndex ? nextStep : step));
}

function SimpleStepBlock({
  step,
  index,
  inputColumns,
  manualRangeRows,
  baseInputColumnId,
  canDelete,
  previousResultPreviewValue,
  previousResultDisplay,
  studioLayout = false,
  studioActionContent,
  onChange,
  onReplace,
  onDelete,
}: {
  step: TransformStep;
  index: number;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  defaultStepMode: TransformStepMode;
  baseInputColumnId: string;
  canDelete: boolean;
  previousResultPreviewValue?: string | null;
  previousResultDisplay?: PreviousResultDisplay | null;
  studioLayout?: boolean;
  studioActionContent?: ReactNode;
  onBaseInputColumnChange: (inputColumnId: string) => void;
  onChange: (patch: Partial<TransformStep>) => void;
  onReplace: (step: TransformStep) => void;
  onDelete: () => void;
}) {
  const context = createStepEditorContext({
    kind: 'normal',
    stepIndex: index,
    defaultInputColumnId: baseInputColumnId,
  });
  const isManualRangeStep = step.type === 'manualRange';
  const summarySource = step.source;
  const summary = isManualRangeStep ? getStepSummary(step, inputColumns) : getSimpleStepBlockTitle(step, index, inputColumns, summarySource);
  const title = `Paso ${index + 1}${summary ? ` · ${summary}` : ''}`;
  const handleChange = (patch: Partial<TransformStep>) => {
    onChange(patch);
  };
  const handleReplace = (nextStep: TransformStep) => {
    onReplace(nextStep);
  };
  const renderManualRangeFields: StepEditorBlockFieldRenderer = ({ step: currentStep, onChange: onStepChange }) => {
    if (currentStep.type !== 'manualRange') {
      return undefined;
    }

    return (
      <div className="manualRangeStepFields">
        <ManualRangeRecipeEditor
          recipe={manualRangeStepToRecipe(currentStep)}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          onChange={(recipe) => onStepChange(manualRangeRecipeToStepPatch(recipe))}
        />
      </div>
    );
  };
  const renderStepCondition = (currentStep: TransformStep, onStepChange: (patch: Partial<TransformStep>) => void) => currentStep.type === 'manualRange' ? (
    <div className="manualRangeStepCondition">
      <StepConditionFields step={currentStep} inputColumns={inputColumns} variant="manualRange" onChange={onStepChange} />
    </div>
  ) : (
    <StepConditionFields step={currentStep} inputColumns={inputColumns} onChange={onStepChange} />
  );

  if (studioLayout) {
    return (
      <>
        <section className="recipeStudioSection recipeStudioGeneralSection" aria-label="Configuración general">
          <div className="composeStudioHeaderTitle">
            <span>Configuración general</span>
            <strong>{title}</strong>
          </div>
          <StepEditorBlock
            step={step}
            context={context}
            inputColumns={inputColumns}
            manualRangeRows={manualRangeRows}
            showHeader={false}
            showCondition={false}
            previousResultPreviewValue={previousResultPreviewValue}
            previousResultDisplay={previousResultDisplay}
            renderFields={renderManualRangeFields}
            onChange={handleChange}
            onReplace={handleReplace}
          />
          {renderStepCondition(step, handleChange)}
          {studioActionContent}
        </section>
      </>
    );
  }

  return (
    <StepEditorBlock
      step={step}
      context={context}
      inputColumns={inputColumns}
      manualRangeRows={manualRangeRows}
      title={title}
      canDelete={canDelete}
      gridClassName={`simpleCustomValueGrid${isManualRangeStep ? ' manualRangeStepGrid' : ''}`}
      previousResultPreviewValue={previousResultPreviewValue}
      previousResultDisplay={previousResultDisplay}
      renderFields={renderManualRangeFields}
      renderCondition={renderStepCondition}
      onChange={handleChange}
      onReplace={handleReplace}
      onDelete={onDelete}
    />
  );
}

function getSimpleStepBlockTitle(step: TransformStep, index: number, inputColumns: InputColumn[], source?: StepSource) {
  if (step.type === 'noop' && source?.type === 'input' && (source.inputColumnId || index > 0)) {
    return 'Usar columna de entrada';
  }

  return getRecipeStepTitle(step, inputColumns, source);
}

export function ComposePartEditor({
  part,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  allowPreviousResultSource,
  onChange,
}: ComposePartEditorRenderProps) {
  const updateBaseSource = (source: StepSource, nextSteps?: TransformStep[]) => {
    onChange(updateConcatPartPrimarySource(part, source, nextSteps));
  };

  return (
    <ConcatPartStepsEditor
      partId={part.id}
      inputColumns={inputColumns}
      manualRangeRows={manualRangeRows}
      sampleInputValues={sampleInputValues}
      steps={part.steps ?? []}
      baseSource={part.source}
      allowPreviousResultSource={allowPreviousResultSource}
      onBaseSourceChange={updateBaseSource}
      onChange={(steps) => onChange({ ...part, steps })}
    />
  );
}

export function ComposeStepHeader({ recipe, inputColumns, onChange }: ComposeStepHeaderRenderProps) {
  const configuredConcatStep = getConfiguredConcatStep(recipe);
  const step: TransformStep = configuredConcatStep ?? {
    id: 'compose-step',
    mode: 'text',
    type: 'concat',
    parts: recipe.parts.map((part) => ({
      id: part.id,
      source: part.type === 'input'
        ? { type: 'input', inputColumnId: part.inputColumnId }
        : { type: 'fixedText', value: part.value },
      ...(part.steps ? { steps: part.steps } : {}),
    })),
  };
  const mode = getStepMode(step, 'text');
  const currentSource = getFirstStepSource(recipe) ?? { type: 'input' as const, inputColumnId: inputColumns[0]?.id ?? '' };
  const updateStep = (nextStep: TransformStep, nextMode: TransformStepMode) => {
    onChange(buildStepBasedCustomValueRecipe(recipe, [nextStep], nextMode));
  };
  const updateTextSourceAction = (action: StepTextSourceAction) => {
    updateStep({
      ...replaceWholeStepForAction(step, 'noop', 'text', undefined, 0),
      source: getStepSourceForTextAction(action, currentSource, inputColumns),
    }, 'text');
  };

  return (
    <>
      <StepModeSelect
        mode={mode}
        onChange={(nextMode) => updateStep(replaceWholeStepForMode(step, nextMode, 0), nextMode)}
      />
      <StepTypeSelect
        step={step}
        mode={mode}
        allowConcat
        textSourceAction={getStepTextSourceAction(currentSource)}
        onTextSourceAction={updateTextSourceAction}
        onChange={(type, operation) => updateStep(replaceWholeStepForAction(step, type, mode, operation, 0), mode)}
      />
    </>
  );
}

function ConcatPartStepsEditor({
  partId,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  steps,
  baseSource,
  separatorFields,
  previousResultPreviewValue,
  showPrimarySourceFields = true,
  onBaseSourceChange,
  onChange,
}: {
  partId?: string;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  steps: TransformStep[];
  baseSource: StepSource;
  separatorFields?: ReactNode;
  previousResultPreviewValue?: string | null;
  allowPreviousResultSource?: boolean;
  showPrimarySourceFields?: boolean;
  onBaseSourceChange: (source: StepSource, nextSteps?: TransformStep[]) => void;
  onChange: (steps: TransformStep[]) => void;
}) {
  const primaryStep = getVisibleConcatPartPrimaryStep(steps);
  const additionalSteps = steps.slice(1);
  const primaryContext = getConcatPartStepContext(0, getConcatPrimarySourceActionOverride(primaryStep, baseSource, steps.length > 0));
  const primaryEditorStep = getStepWithConcatPartSource(primaryStep, baseSource, primaryContext, steps.length > 0);
  const uiKeyPrefix = `concat:${partId ?? primaryStep.id}`;
  const updatePrimaryStep = (nextStep: TransformStep) => {
    const nextSource = nextStep.source ?? baseSource;
    const normalizedStep = {
      ...nextStep,
      applyToEmptyValues: nextStep.applyToEmptyValues ?? false,
    };
    const visibleAction = getVisibleStepAction(nextStep, primaryContext);
    const shouldKeepImplicitStep = steps.length === 0
      && normalizedStep.type === 'noop'
      && normalizedStep.mode === 'text'
      && !nextStep.source
      && visibleAction === 'unconfigured';
    const nextSteps = shouldKeepImplicitStep ? [] : [normalizedStep, ...additionalSteps];

    onBaseSourceChange(nextSource, nextSteps);
  };
  const addAdditionalStep = () => {
    onChange(appendConcatPartAdditionalStep(steps));
  };
  const updateAdditionalStep = (stepId: string, patch: Partial<TransformStep>) => {
    onChange([
      primaryStep,
      ...additionalSteps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
    ]);
  };
  const replaceAdditionalStep = (stepId: string, nextStep: TransformStep) => {
    onChange([
      primaryStep,
      ...additionalSteps.map((step) => (step.id === stepId ? nextStep : step)),
    ]);
  };
  const deleteAdditionalStep = (stepId: string) => {
    onChange([primaryStep, ...additionalSteps.filter((step) => step.id !== stepId)]);
  };

  return (
    <div className="concatPartStepsEditor">
      {separatorFields ? (
        <div className="concatPartSeparatorBlock">
          {separatorFields}
        </div>
      ) : null}

      <StepEditorBlock
        step={primaryEditorStep}
        context={primaryContext}
        uiStateKey={`${uiKeyPrefix}:0`}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        title={`Paso 1 · ${getConcatPartStepTitle(primaryEditorStep, primaryContext, inputColumns)}`}
        canDelete={false}
        previousResultPreviewValue={baseSource.type === 'previousResult' ? previousResultPreviewValue : null}
        hideTransformSourceFields={!showPrimarySourceFields}
        onChange={(patch) => updatePrimaryStep({ ...primaryEditorStep, ...patch })}
        onReplace={updatePrimaryStep}
        onDelete={() => undefined}
      />

      <div className="concatPartStepsBlock">
        {additionalSteps.length > 0 ? (
          <div className="concatPartTransformList">
            {additionalSteps.map((step, index) => {
              const transformIndex = index + 1;
              const context = getConcatPartStepContext(transformIndex);
              const previousStepPreviewValue = getConcatPartPreviousStepPreviewValue(
                baseSource,
                steps,
                sampleInputValues,
                transformIndex,
                previousResultPreviewValue,
              );

              return (
                <div key={step.id} className="concatPartStepDivider">
                  <StepEditorBlock
                    step={step}
                    context={context}
                    uiStateKey={`${uiKeyPrefix}:${transformIndex}`}
                    inputColumns={inputColumns}
                    manualRangeRows={manualRangeRows}
                    title={`Paso ${transformIndex + 1} · ${getConcatPartStepTitle(step, context, inputColumns)}`}
                    canDelete
                    previousResultPreviewValue={previousStepPreviewValue}
                    onChange={(patch) => updateAdditionalStep(step.id, patch)}
                    onReplace={(nextStep) => replaceAdditionalStep(step.id, normalizeStepForContext(nextStep, context))}
                    onDelete={() => deleteAdditionalStep(step.id)}
                  />
                </div>
              );
            })}
          </div>
        ) : null}
        <div className="concatPartStepsActions">
          <ActionButton action="add" variant="secondary" className="constructorAddStepButton" onClick={addAdditionalStep}>
            {recipeEditorAdditionalStepLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function getConcatPartPreviousStepPreviewValue(
  baseSource: StepSource,
  steps: TransformStep[],
  sampleInputValues: Record<string, string> | undefined,
  stepIndex: number,
  previousResultPreviewValue?: string | null,
) {
  if (stepIndex <= 0) {
    return baseSource.type === 'previousResult' ? previousResultPreviewValue ?? null : null;
  }

  const previewInputs = sampleInputValues ?? (baseSource.type === 'input' ? undefined : {});
  if (!previewInputs) {
    return null;
  }

  return buildCombinePreview({
    type: 'combine',
    parts: [createPreviewPartFromSource(baseSource, previousResultPreviewValue)],
    separator: '',
    steps: steps.slice(0, stepIndex),
  }, previewInputs);
}

function createPreviewPartFromSource(source: StepSource, previousResultPreviewValue?: string | null): RecipePart {
  if (source.type === 'input') {
    return { id: 'previous-result-preview-part', type: 'input', inputColumnId: source.inputColumnId };
  }

  if (source.type === 'rangeText') {
    return { id: 'previous-result-preview-part', type: 'text', value: source.selectedText };
  }

  if (source.type === 'previousResult') {
    return { id: 'previous-result-preview-part', type: 'text', value: previousResultPreviewValue ?? '' };
  }

  return { id: 'previous-result-preview-part', type: 'text', value: source.value };
}

function getConcatPartStepContext(stepIndex: number, sourceActionOverride?: StepSourceAction): StepEditorContext {
  return createStepEditorContext({
    kind: 'concat',
    stepIndex,
    defaultInputColumnId: '',
    sourceActionOverride,
  });
}
function getConcatPrimarySourceActionOverride(step: TransformStep, source: StepSource, hasStoredPrimaryStep: boolean): StepSourceAction | undefined {
  if (!hasStoredPrimaryStep || step.type !== 'noop') {
    return undefined;
  }

  const visibleSource = step.source ?? source;
  if (visibleSource.type === 'input') {
    return 'useInputColumn';
  }

  if (visibleSource.type === 'fixedText') {
    return 'useFixedText';
  }

  return undefined;
}

function getStepWithConcatPartSource(step: TransformStep, source: StepSource, context: StepEditorContext, forceConfiguredSource = false) {
  if (step.source || step.type !== 'noop') {
    return step;
  }

  if (!forceConfiguredSource && !isConfiguredConcatPartSource(source)) {
    return step;
  }

  return normalizeStepForContext({ ...step, source }, context);
}

function isConfiguredConcatPartSource(source: StepSource) {
  if (source.type === 'input') {
    return source.inputColumnId.trim().length > 0;
  }

  if (source.type === 'fixedText') {
    return source.value.trim().length > 0;
  }

  return true;
}

function getConcatPartStepTitle(step: TransformStep, context: StepEditorContext, inputColumns: InputColumn[]) {
  if (getVisibleStepAction(step, context) === 'unconfigured') {
    return 'Sin configurar';
  }

  return getRecipeStepTitle(step, inputColumns, step.source) || 'Sin configurar';
}

export function getFormatDateSourceSelection(value: string, inputFormat: DateInputFormat, preserveOriginalValue = false) {
  const normalizedValue = getDatePickerValue(value, inputFormat);
  if (value.trim() && !normalizedValue) {
    return { accepted: false as const, warning: 'Ese valor no parece una fecha válida.' };
  }

  return {
    accepted: true as const,
    sourceValue: preserveOriginalValue ? value : normalizedValue,
    dateInputFormat: preserveOriginalValue ? inputFormat : 'YYYY-MM-DD' as const,
  };
}
