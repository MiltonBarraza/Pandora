import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { describeManualRangeCondition, duplicateManualRangeValue, generateManualRangesFromDataBlocks, generateManualRangesFromTexts, getManualRangeFixedTextValue, getManualRangeInputSource, getManualRangeRangeTextSource, getManualRangeReferenceText, getManualRangeRowCountFromInputs, getManualRangeTextOptions, getManualRangeValueSourceType, manualRangeRecipeToStepPatch, manualRangeStepToRecipe, manualRangeValueSourceOptions, parseManualRangeRowInput, reconcileManualRangeTextSelections, removeManualRangeValue, updateManualRangeCondition, updateManualRangeFixedTextValue, updateManualRangeInputValue, updateManualRangeRangeTextValue, updateManualRangeValue, updateManualRangeValueRecipeSteps, updateManualRangeValueSourceType, type ManualRangeInitialValueMode, type ManualRangeStartFilter, type ManualRangeValueSourceType } from '../../domain/import/manualRangeModel';
import { buildProcessedRows } from '../../domain/import/outputModel';
import type { DateInputFormat, InputColumn, InputRow, ManualRangeValue, OutputColumn, OutputRecipe, RecipePart, StepSource, TransformStep, TransformStepMode } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { Modal } from '../Modal/Modal';
import { SortableList } from '../SortableList/SortableList';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { AppIcon } from '../ui/AppIcon/AppIcon';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { noActiveColumnsLabel } from './OutputColumnRecipeEditor.constants';
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
  canPreviewNumericValue,
  clearManualRangeValues,
  createNoopStep,
  getCustomValueMode,
  getDefaultStepModeForRecipe,
  getFirstStepSource,
  getInputColumnSummary,
  getRecipeEditorModalRecipe,
  getSimpleInputPart,
  getStepMode,
  getVisibleConcatPartPrimaryStep,
  getVisibleRecipeSteps,
  hasRecipeEditorDraftChanges,
  isCustomValueConfigured,
  replaceWholeStep,
  replaceWholeStepForAction,
  replaceWholeStepForMode,
  type CustomValueMode,
  type EditableCustomRecipe,
} from './OutputColumnRecipeEditor.recipeHelpers';
import { StepConditionFields, StepModeSelect, StepTypeSelect, type PreviousResultDisplay } from './OutputColumnRecipeEditor.StepFields';
import { RangeValueEditor } from './RangeValueEditor';
import { ManualRangeSpreadsheetEditor } from './ManualRangeSpreadsheetEditor';
import { RecipeStudioShell, type ComposePartEditorRenderProps, type ComposeStepHeaderRenderProps } from './RecipeStudio';
import { StepEditorBlock, type StepEditorBlockFieldRenderer } from './StepEditorBlock';
import { getVisibleStepAction, normalizeStepForContext, type StepEditorContext, type StepSourceAction } from './OutputColumnRecipeEditor.stepPolicy';
import { createPreviousResultDisplay, isDeterministicPreviousResultRecipe } from './OutputColumnRecipeEditor.previousResultHelpers';
export { addComposeRecipePart, createRecipeForStudioMode, getComposeColumnTextOptions, getComposeValidColumnTextSelection, reorderComposeRecipeParts, updateComposeColumnTextSelection } from './RecipeStudio';
import {
  buildCombinePreview,
  buildCustomValuePreview,
  buildManualRangeRecipePreview,
  getConstructorAdjustmentLabels,
  getCustomValuePartsDisplayLabel,
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
  replaceWholeStep,
  replaceWholeStepForAction,
  replaceWholeStepForMode,
  shouldShowTextSourceFields,
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

export type ManualRangeDetectionMode = 'textStarts' | 'dataBlocks';
export const manualRangeUsageHelpText = 'Los rangos sirven cuando un valor debe repetirse en varias filas. Si el valor ya está en cada fila, usá una columna de entrada.';

export const recipeEditorModalCancelLabel = 'Cancelar';
export const recipeEditorModalApplyLabel = 'Aplicar';
export const recipeEditorDiscardChangesTitle = 'Descartar';
export const recipeEditorDiscardChangesMessage = 'Hay cambios sin aplicar en esta receta. Si cerrás el editor, se perderán.';
export const recipeEditorDiscardChangesCancelLabel = 'Seguir editando';
export const recipeEditorDiscardChangesConfirmLabel = 'Descartar cambios';
export const recipeEditorAdditionalStepLabel = 'Agregar paso';

const manualRangeInitialValueModeOptions: Array<{ value: ManualRangeInitialValueMode; label: string }> = [
  { value: 'empty', label: 'Sin valor' },
  { value: 'detectedText', label: 'Usar valor detectado en la columna guía' },
  { value: 'firstValueInColumn', label: 'Usar primer valor con datos de columna' },
  { value: 'lastValueInColumn', label: 'Usar último valor con datos de columna' },
];

export const manualRangeDetectionModeOptions: Array<{ value: ManualRangeDetectionMode; label: string }> = [
  { value: 'textStarts', label: 'Cada dato inicia un rango' },
  { value: 'dataBlocks', label: 'Bloques consecutivos con datos' },
];

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
                renderManualRangeTextGenerator={(props) => <ManualRangeTextGenerator {...props} />}
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
                renderManualRangeTextGenerator={(props) => <ManualRangeTextGenerator {...props} />}
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
  inputColumns,
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
          <span>Trabajar con rangos</span>
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

export function ManualRangeTextGenerator({
  recipe,
  inputColumns,
  manualRangeRows,
  initialDetectionMode = 'textStarts',
  initialStartRowInput = '',
  initialEndRowInput = '',
  initialValueMode: initialGeneratorValueMode = 'empty',
  initialValueColumnId: initialGeneratorValueColumnId,
  initialTrailingRowCount: _initialTrailingRowCount = 0,
  onClose,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  initialDetectionMode?: ManualRangeDetectionMode;
  initialStartRowInput?: string;
  initialEndRowInput?: string;
  initialValueMode?: ManualRangeInitialValueMode;
  initialValueColumnId?: string;
  initialTrailingRowCount?: number;
  onClose?: () => void;
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
}) {
  const defaultInputColumnId = inputColumns[0]?.id ?? '';
  const defaultInitialValueColumnId = initialGeneratorValueColumnId ?? defaultInputColumnId;
  const [inputColumnId, setInputColumnId] = useState(defaultInputColumnId);
  const [startRowInput, setStartRowInput] = useState(initialStartRowInput);
  const [endRowInput, setEndRowInput] = useState(initialEndRowInput);
  const [detectionMode, setDetectionMode] = useState<ManualRangeDetectionMode>(initialDetectionMode);
  const [initialValueMode, setInitialValueMode] = useState<ManualRangeInitialValueMode>(initialGeneratorValueMode);
  const [initialValueColumnId, setInitialValueColumnId] = useState(defaultInitialValueColumnId);
  const [validRowsColumnId, setValidRowsColumnId] = useState('none');
  const [startFilterColumnId, setStartFilterColumnId] = useState('none');
  const [startFilterOperator, setStartFilterOperator] = useState<ManualRangeStartFilter['operator']>('isEmpty');
  const [isClearGeneratorConfirmationOpen, setIsClearGeneratorConfirmationOpen] = useState(false);
  const shouldShowInitialValueColumn = initialValueMode === 'firstValueInColumn' || initialValueMode === 'lastValueInColumn';
  const effectiveValidRowsColumnId = validRowsColumnId === 'none' ? undefined : validRowsColumnId;
  const trailingRowCount = 0;
  const startFilter = startFilterColumnId === 'none'
    ? undefined
    : { inputColumnId: startFilterColumnId, operator: startFilterOperator };
  const isGeneratorDirty = inputColumnId !== defaultInputColumnId
    || startRowInput !== initialStartRowInput
    || endRowInput !== initialEndRowInput
    || detectionMode !== initialDetectionMode
    || initialValueMode !== initialGeneratorValueMode
    || initialValueColumnId !== defaultInitialValueColumnId
    || validRowsColumnId !== 'none'
    || startFilterColumnId !== 'none'
    || startFilterOperator !== 'isEmpty';
  const { startRowNumber, endRowNumber } = resolveManualRangeGeneratorRowBounds(
    manualRangeRows,
    startRowInput,
    endRowInput,
  );
  const canPreview = Boolean(
    inputColumnId
    && startRowNumber !== undefined
    && endRowNumber !== undefined
    && endRowNumber >= startRowNumber,
  );
  const generateRanges = (preview: boolean) => {
    if (!canPreview) {
      return [];
    }

    const effectiveInitialValueColumnId = shouldShowInitialValueColumn ? initialValueColumnId : undefined;
    const previewValueMode = preview && detectionMode === 'textStarts' && initialValueMode === 'empty'
      ? 'detectedText'
      : initialValueMode;

    if (detectionMode === 'dataBlocks') {
      return generateManualRangesFromDataBlocks(manualRangeRows, {
        dataColumnId: inputColumnId,
        startRowNumber: startRowNumber!,
        endRowNumber: endRowNumber!,
        initialValueMode: previewValueMode,
        initialValueColumnId: effectiveInitialValueColumnId,
        trailingRowCount,
      });
    }

    return generateManualRangesFromTexts(manualRangeRows, {
      inputColumnId,
      startRowNumber: startRowNumber!,
      endRowNumber: endRowNumber!,
      mode: 'singleRow',
      initialValueMode: previewValueMode,
      initialValueColumnId: effectiveInitialValueColumnId,
      validRowsColumnId: effectiveValidRowsColumnId,
      trailingRowCount,
      startFilter,
    });
  };
  const generatedPreviewRanges = generateRanges(true);
  const generatedPreviewRangesWithoutStartFilter = detectionMode === 'textStarts' && canPreview && startFilter
    ? generateManualRangesFromTexts(manualRangeRows, {
      inputColumnId,
      startRowNumber: startRowNumber!,
      endRowNumber: endRowNumber!,
      mode: 'singleRow',
      initialValueMode,
      initialValueColumnId: shouldShowInitialValueColumn ? initialValueColumnId : undefined,
      validRowsColumnId: effectiveValidRowsColumnId,
      trailingRowCount,
    })
    : [];
  const selectedInputColumn = inputColumns.find((inputColumn) => inputColumn.id === inputColumnId);
  const selectedStartFilterColumn = inputColumns.find((inputColumn) => inputColumn.id === startFilterColumnId);
  const selectedValidRowsColumn = inputColumns.find((inputColumn) => inputColumn.id === validRowsColumnId);
  const selectedInitialValueColumn = inputColumns.find((inputColumn) => inputColumn.id === initialValueColumnId);
  const generatorSummary = buildManualRangeGeneratorSummary({
    detectionMode,
    inputColumn: selectedInputColumn,
    startRowInput,
    endRowInput,
    startFilterColumn: startFilter ? selectedStartFilterColumn : undefined,
    startFilterOperator,
    validRowsColumn: effectiveValidRowsColumnId ? selectedValidRowsColumn : undefined,
    trailingRowCount,
    initialValueMode,
    initialValueColumn: shouldShowInitialValueColumn ? selectedInitialValueColumn : undefined,
    conditionSummary: recipe.condition ? describeManualRangeCondition(recipe, inputColumns) : undefined,
  });
  const generatorWarnings = getManualRangeGeneratorWarnings({
    canPreview,
    generatedRanges: generatedPreviewRanges,
    rangesBeforeStartFilter: generatedPreviewRangesWithoutStartFilter,
    isColumnLookupValueMode: shouldShowInitialValueColumn,
    trailingRowCount,
    appliesToAllRows: !recipe.condition,
  });
  const visiblePreviewRanges = generatedPreviewRanges.slice(0, 6);
  const hiddenPreviewRangeLabels = generatedPreviewRanges.slice(6).map((range) => getManualRangeGeneratedExampleLabel(range));
  const previewMessage = !inputColumnId
    ? (detectionMode === 'dataBlocks' ? 'Elegí una columna con datos.' : 'Elegí una columna para buscar textos.')
    : !canPreview
      ? ''
      : generatedPreviewRanges.length === 0
        ? 'No se encontraron rangos con esta configuración. Revisá la columna elegida, el intervalo de filas o los filtros aplicados.'
        : '';
  const confirmGeneratedRanges = () => {
    if (!canPreview) {
      return;
    }

    const nextRanges = generateRanges(false);

    if (nextRanges.length === 0) {
      return;
    }

    onChange({
      ...recipe,
      ranges: [...recipe.ranges, ...nextRanges],
    });
  };
  const clearGenerator = () => {
    setInputColumnId(defaultInputColumnId);
    setStartRowInput(initialStartRowInput);
    setEndRowInput(initialEndRowInput);
    setDetectionMode(initialDetectionMode);
    setInitialValueMode(initialGeneratorValueMode);
    setInitialValueColumnId(defaultInitialValueColumnId);
    setValidRowsColumnId('none');
    setStartFilterColumnId('none');
    setStartFilterOperator('isEmpty');
    setIsClearGeneratorConfirmationOpen(false);
  };
  const requestClearGenerator = () => {
    if (!isGeneratorDirty) {
      return;
    }

    setIsClearGeneratorConfirmationOpen(true);
  };

  return (
    <div className="manualRangeGenerator">
      <div className="manualRangeGeneratorHeader">
        <div>
          <strong className="labelWithInfo">
            <span>Generar rangos sugeridos</span>
            <InfoTooltip
              ariaLabel="Ayuda: generar rangos sugeridos"
              content="Usá este bloque para que Pandora arme una primera propuesta de rangos. Después podés revisar cada rango, borrarlo o cambiar su valor."
            />
          </strong>
        </div>
        <div className="manualRangeGeneratorHeaderActions">
          <ActionButton
            action="add"
            variant="secondary"
            disabled={generatedPreviewRanges.length === 0}
            onClick={confirmGeneratedRanges}
          >
            Agregar rangos sugeridos
          </ActionButton>
          <ActionButton action="clear" variant="secondary" disabled={!isGeneratorDirty} onClick={requestClearGenerator}>
            Limpiar
          </ActionButton>
          {onClose ? (
            <ActionButton action="close" variant="secondary" onClick={onClose}>
              Cerrar
            </ActionButton>
          ) : null}
        </div>
      </div>
      <div className="manualRangeGeneratorControls">
        <div className="manualRangeGeneratorRow manualRangeGeneratorRow-detection">
          <Dropdown
            className="compact"
            label={detectionMode === 'dataBlocks' ? 'Columna que marca el bloque' : 'Buscar inicios de rango en'}
            labelInfo={(
              <InfoTooltip
                content={detectionMode === 'dataBlocks'
                  ? 'Elegí una columna que tenga datos en las filas que forman cada bloque. Una fila vacía corta el bloque.'
                  : 'Elegí la columna donde cada celda con dato marca el inicio de un rango.'}
              />
            )}
            value={inputColumnId}
            options={inputColumns.length === 0
              ? [{ value: '', label: noActiveColumnsLabel }]
              : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))}
            scrollStrategy="close"
            onChange={setInputColumnId}
          />
          <label className="field compact">
            <span>Desde fila</span>
            <input
              type="number"
              min="1"
              placeholder="Inicio"
              value={startRowInput}
              onChange={(event) => setStartRowInput(event.target.value)}
            />
          </label>
          <label className="field compact">
            <span>Hasta fila</span>
            <input
              type="number"
              min="1"
              placeholder="Fin"
              value={endRowInput}
              onChange={(event) => setEndRowInput(event.target.value)}
            />
          </label>
          <Dropdown
            className="compact"
            label="Criterio para sugerir rangos"
            labelInfo={(
              <InfoTooltip
                ariaLabel="Ayuda: detectar rangos"
                content="Elegí si cada rango empieza cuando aparece un dato en la columna base, o si Pandora debe separar bloques cuando encuentra filas vacías."
              />
            )}
            value={detectionMode}
            options={manualRangeDetectionModeOptions}
            scrollStrategy="close"
            onChange={setDetectionMode}
          />
        </div>
        <p className="manualRangeValueHelp manualRangeDetectionHelp">
          {detectionMode === 'dataBlocks'
            ? 'Las filas consecutivas con datos forman un bloque. Una fila vacía corta el bloque.'
            : 'Cada celda con dato en la columna elegida crea un rango de una fila.'}
        </p>
        <div className="manualRangeGeneratorRow manualRangeGeneratorRow-value">
          <Dropdown<ManualRangeInitialValueMode>
            className="compact"
            label="Guardar como valor"
            labelInfo={(
              <InfoTooltip
                ariaLabel="Ayuda: guardar como valor"
                content="Elegí si los rangos arrancan sin valor, usan el valor detectado en la columna guía o toman un valor dentro de cada rango."
              />
            )}
            value={initialValueMode}
            options={manualRangeInitialValueModeOptions}
            scrollStrategy="close"
            onChange={setInitialValueMode}
          />
          {shouldShowInitialValueColumn ? (
            <Dropdown
              className="compact"
              label="Columna para tomar el valor"
              labelInfo={(
                <InfoTooltip
                  ariaLabel="Ayuda: columna para tomar el valor"
                  content="Pandora buscará dentro de cada rango el primer o último valor con datos en esta columna."
                />
              )}
              value={initialValueColumnId}
              options={inputColumns.length === 0
                ? [{ value: '', label: noActiveColumnsLabel }]
                : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))}
              scrollStrategy="close"
              onChange={setInitialValueColumnId}
            />
          ) : null}
        </div>
      </div>
      <p className="manualRangeGeneratorSummary">{generatorSummary}</p>
      {generatorWarnings.length > 0 ? (
        <div className="manualRangeGeneratorWarnings" role="status">
          {generatorWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
      {previewMessage ? (
        <div className="manualRangeGeneratorWarnings" role="status">
          <p>{previewMessage}</p>
        </div>
      ) : generatedPreviewRanges.length > 0 ? (
        <div className="manualRangeGeneratorExamples">
          <span className="manualRangeGeneratorExamplesLabel">Ejemplos</span>
          <div className="manualRangeGeneratorPreview" aria-label="Ejemplos de rangos sugeridos">
            {visiblePreviewRanges.map((range, index) => (
              <span key={`${range.startRowNumber}-${range.endRowNumber}-${index}`}>
                {getManualRangeGeneratedExampleLabel(range)}
              </span>
            ))}
            {hiddenPreviewRangeLabels.length > 0 ? (
              <span className="manualRangeGeneratorMoreExamples" tabIndex={0}>
                <span aria-label="Ver ejemplos restantes">{hiddenPreviewRangeLabels.length} ejemplos más…</span>
                <span className="manualRangeMoreExamplesTooltip" role="tooltip">
                  {hiddenPreviewRangeLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={isClearGeneratorConfirmationOpen}
        title="Limpiar generador"
        message="¿Querés limpiar los valores del generador de rangos sugeridos?"
        cancelLabel="Cancelar"
        confirmLabel="Limpiar"
        variant="danger"
        onCancel={() => setIsClearGeneratorConfirmationOpen(false)}
        onConfirm={clearGenerator}
      />
    </div>
  );
}

function getManualRangeGeneratedExampleLabel(range: ManualRangeValue) {
  const rangeLabel = `${range.startRowNumber}-${range.endRowNumber}`;
  const fixedTextValue = getManualRangeFixedTextValue(range).trim();
  if (fixedTextValue) {
    return `${rangeLabel}: ${fixedTextValue}`;
  }

  const rangeTextValue = getManualRangeRangeTextSource(range).selectedText.trim();
  if (rangeTextValue) {
    return `${rangeLabel}: ${rangeTextValue}`;
  }

  return rangeLabel;
}

export function buildManualRangeGeneratorSummary({
  detectionMode,
  inputColumn,
  startRowInput,
  endRowInput,
  startFilterColumn,
  startFilterOperator,
  validRowsColumn,
  trailingRowCount = 0,
  initialValueMode,
  initialValueColumn,
  conditionSummary,
}: {
  detectionMode: ManualRangeDetectionMode;
  inputColumn?: InputColumn;
  startRowInput: string;
  endRowInput: string;
  startFilterColumn?: InputColumn;
  startFilterOperator: ManualRangeStartFilter['operator'];
  validRowsColumn?: InputColumn;
  trailingRowCount?: number;
  initialValueMode: ManualRangeInitialValueMode;
  initialValueColumn?: InputColumn;
  conditionSummary?: string;
}) {
  const columnLabel = getManualRangeSummaryColumnLabel(inputColumn);
  const intervalSummary = getManualRangeGeneratorIntervalSummary(startRowInput, endRowInput);
  const parts = detectionMode === 'dataBlocks'
    ? [`Pandora creará un rango por cada bloque consecutivo con datos en ${columnLabel}, ${intervalSummary}.`]
    : [`Pandora usará cada dato de ${columnLabel} como inicio de un rango, ${intervalSummary}. Cada rango termina antes del siguiente dato encontrado.`];

  if (detectionMode === 'textStarts' && startFilterColumn) {
    parts.push(`Aceptará sólo grupos donde ${getManualRangeSummaryColumnLabel(startFilterColumn)} ${startFilterOperator === 'isEmpty' ? 'está vacía' : 'no está vacía'}.`);
  }

  if (detectionMode === 'textStarts' && validRowsColumn) {
    parts.push(`Cada grupo llegará hasta la última fila con dato en ${getManualRangeSummaryColumnLabel(validRowsColumn)}.`);
  }

  if (trailingRowCount > 0) {
    parts.push(`Incluira ${trailingRowCount} ${trailingRowCount === 1 ? 'fila posterior' : 'filas posteriores'} al bloque.`);
  }

  parts.push(getManualRangeGeneratorValueSummary(initialValueMode, initialValueColumn));

  if (conditionSummary) {
    parts.push(`El valor se aplicará sólo a filas donde ${conditionSummary}.`);
  }

  return parts.join(' ');
}

export function resolveManualRangeGeneratorRowBounds(
  rows: InputRow[],
  startRowInput: string,
  endRowInput: string,
) {
  const availableRowNumbers = rows
    .map((row) => row.rowNumber)
    .filter((rowNumber) => Number.isInteger(rowNumber) && rowNumber > 0);
  const firstAvailableRowNumber = availableRowNumbers.length > 0 ? Math.min(...availableRowNumbers) : undefined;
  const lastAvailableRowNumber = availableRowNumbers.length > 0 ? Math.max(...availableRowNumbers) : undefined;

  return {
    startRowNumber: startRowInput.trim() === '' ? firstAvailableRowNumber : parseManualRangeRowInput(startRowInput),
    endRowNumber: endRowInput.trim() === '' ? lastAvailableRowNumber : parseManualRangeRowInput(endRowInput),
  };
}

export function getManualRangeGeneratorIntervalSummary(startRowInput: string, endRowInput: string) {
  const startSummary = startRowInput.trim() === '' ? 'desde el inicio' : `desde la fila ${startRowInput.trim()}`;
  const endSummary = endRowInput.trim() === '' ? 'hasta el final' : `hasta la fila ${endRowInput.trim()}`;
  return `${startSummary} ${endSummary}`;
}

export function getManualRangeGeneratorWarnings({
  canPreview,
  generatedRanges,
  rangesBeforeStartFilter = [],
  isColumnLookupValueMode,
  trailingRowCount = 0,
  appliesToAllRows = false,
}: {
  canPreview: boolean;
  generatedRanges: ManualRangeValue[];
  rangesBeforeStartFilter?: ManualRangeValue[];
  isColumnLookupValueMode: boolean;
  trailingRowCount?: number;
  appliesToAllRows?: boolean;
}) {
  const warnings: string[] = [];

  if (!canPreview) {
    return warnings;
  }

  if (generatedRanges.length === 0 && rangesBeforeStartFilter.length > 0) {
    warnings.push('El filtro de grupo descartó todos los posibles grupos. Revisá la columna o la condición elegida.');
  }

  const singleRowRanges = generatedRanges.filter((range) => range.startRowNumber === range.endRowNumber).length;
  if (generatedRanges.length >= 3 && singleRowRanges / generatedRanges.length > 0.6) {
    warnings.push('Muchos rangos sugeridos tienen una sola fila. Si el Excel usa celdas combinadas, probá usar una columna con códigos, precios o cantidades para detectar los bloques.');
  }

  if (isColumnLookupValueMode && generatedRanges.some((range) => getManualRangeGeneratedValueText(range).trim() === '')) {
    warnings.push('Algunos rangos no encontraron valor en la columna elegida. Se crearán con valor vacío.');
  }

  if (trailingRowCount > 0 && appliesToAllRows) {
    warnings.push('El rango incluira filas posteriores. Si esas filas no deben recibir valor, configura "Aplicar el valor solo a filas donde...".');
  }

  return warnings;
}

function getManualRangeGeneratedValueText(range: ManualRangeValue) {
  const fixedTextValue = getManualRangeFixedTextValue(range).trim();
  if (fixedTextValue) {
    return fixedTextValue;
  }

  return getManualRangeRangeTextSource(range).selectedText;
}

function getManualRangeGeneratorValueSummary(initialValueMode: ManualRangeInitialValueMode, initialValueColumn?: InputColumn) {
  const columnLabel = getManualRangeSummaryColumnLabel(initialValueColumn);
  if (initialValueMode === 'detectedText') {
    return 'Guardará el valor detectado en la columna guía.';
  }

  if (initialValueMode === 'firstValueInColumn') {
    return `Guardará el primer valor con datos de ${columnLabel}.`;
  }

  if (initialValueMode === 'lastValueInColumn') {
    return `Guardará el último valor con datos de ${columnLabel}.`;
  }

  return 'Creará los rangos sin valor inicial.';
}

function getManualRangeSummaryColumnLabel(inputColumn?: InputColumn) {
  return inputColumn?.columnLetter || 'la columna elegida';
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
  const updateRangeSource = (source: StepSource) => {
    if (source.type === 'input') {
      return updateManualRangeInputValue(recipe, range.id, source.inputColumnId);
    }

    if (source.type === 'rangeText') {
      return reconcileManualRangeTextSelections(
        updateManualRangeRangeTextValue(recipe, range.id, {
          inputColumnId: source.inputColumnId,
          selectedText: source.selectedText,
        }),
        range.id,
        manualRangeRows,
      );
    }

    if (source.type === 'fixedText') {
      return updateManualRangeFixedTextValue(recipe, range.id, source.value);
    }

    return recipe;
  };
  const updateRangeSourceAndSteps = (source: StepSource, steps: TransformStep[]) => {
    const nextRecipe = updateRangeSource(source);
    return updateManualRangeValueRecipeSteps(nextRecipe, range.id, steps);
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
      label: 'Resultado anterior',
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
  defaultStepMode,
  baseInputColumnId,
  canDelete,
  previousResultPreviewValue,
  previousResultDisplay,
  studioLayout = false,
  studioActionContent,
  onBaseInputColumnChange,
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
  const context: StepEditorContext = {
    kind: 'normal',
    stepIndex: index,
    defaultInputColumnId: baseInputColumnId,
  };
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
    onChange({ ...part, source, ...(nextSteps ? { steps: nextSteps } : {}) });
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
  allowPreviousResultSource = true,
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
  return {
    kind: 'concat',
    stepIndex,
    defaultInputColumnId: '',
    ...(sourceActionOverride ? { sourceActionOverride } : {}),
  };
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
