import { useEffect, useRef, useState, type ReactNode } from 'react';
import { defaultDateInputFormat, defaultDateInvalidFallback, defaultDateOutputFormat } from '../../domain/import/dateOperations';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { addManualRangeValue, describeManualRangeCondition, describeManualRangeStepSummary, duplicateManualRangeValue, generateManualRangesFromDataBlocks, generateManualRangesFromTexts, getManualRangeCountLabel, getManualRangeFixedTextValue, getManualRangeRangeTextSource, getManualRangeReferenceText, getManualRangeRowCountFromInputs, hasOverlappingManualRanges, manualRangeRecipeToStepPatch, manualRangeStepToRecipe, parseManualRangeRowInput, reconcileManualRangeTextSelections, removeManualRangeValue, sortManualRangesByStart, updateManualRangeFixedTextValue, updateManualRangeInputValue, updateManualRangeRangeTextValue, updateManualRangeValue, updateManualRangeValueRecipeSteps, updateManualRangeValueSourceType, type ManualRangeInitialValueMode, type ManualRangeStartFilter } from '../../domain/import/manualRangeModel';
import { parseOptionalNumberInput } from '../../domain/import/numberInput';
import { buildProcessedRows } from '../../domain/import/outputModel';
import type { ConcatPart, DateInputFormat, DateInvalidFallback, DateOutputFormat, InputColumn, InputRow, ManualRangeValue, OutputColumn, OutputRecipe, RecipePart, StepSource, TransformStep, TransformStepMode } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { Modal } from '../Modal/Modal';
import { SortableList } from '../SortableList/SortableList';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { AppIcon } from '../ui/AppIcon/AppIcon';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { addPartLabel, noActiveColumnsLabel, valueSourceLabel } from './OutputColumnRecipeEditor.constants';
import { CustomValueSummary, RecipeMainFields } from './OutputColumnRecipeEditor.components';
import { appendManualRangeSuggestion, appendManualRangeSuggestions, buildManualRangeSuggestions } from './OutputColumnRecipeEditor.manualRangeSuggestions';
import type { ManualRangeOmittedSuggestionReason } from './OutputColumnRecipeEditor.manualRangeSuggestions';
import {
  dateInputFormatOptions,
  dateInvalidFallbackOptions,
  dateOutputFormatOptions,
  getDatePickerValue,
  getStepSourceForTextAction,
  getStepTextSourceAction,
  parseRounding,
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
  changeStepMode,
  clearManualRangeValues,
  createDefaultConcatPart,
  createNoopStep,
  describeConcatPartSource,
  getCustomValueMode,
  getDefaultStepModeForRecipe,
  getFirstStepSource,
  getInputColumnSummary,
  getNextSelectedConcatPartIdAfterRemove,
  getRecipeEditorModalRecipe,
  getSafeSelectedConcatPartId,
  getSimpleInputPart,
  getStepMode,
  getVisibleConcatPartPrimaryStep,
  getVisibleLeftOperand,
  getVisibleRecipeSteps,
  getVisibleRightOperand,
  getVisibleStepSource,
  hasConfiguredConcatStep,
  hasConfiguredManualRangeStep,
  hasConfiguredNumericStepOperands,
  hasRecipeEditorDraftChanges,
  isCustomValueConfigured,
  normalizeConcatPartsAfterReorder,
  replaceStepType,
  shouldShowTextSourceFields,
  updateConcatPartPrimaryStep,
  updateConcatPartSteps,
  type CustomValueMode,
  type EditableCustomRecipe,
} from './OutputColumnRecipeEditor.recipeHelpers';
import { StepConditionFields, StepModeSelect, StepOperandFields, StepSourceFields, StepTypeSelect, shouldShowStepTypeSelectForStep } from './OutputColumnRecipeEditor.StepFields';
import { RangeValueEditor } from './RangeValueEditor';

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
export { appendManualRangeSuggestion, appendManualRangeSuggestions, buildManualRangeSuggestions } from './OutputColumnRecipeEditor.manualRangeSuggestions';
export type { ManualRangeOmittedSuggestion, ManualRangeOmittedSuggestionReason, ManualRangeSuggestionsResult } from './OutputColumnRecipeEditor.manualRangeSuggestions';
export {
  getSourceForValueSourceAction,
  getSourceFromVariableDropdownValue,
  getValueSourceAction,
  getValueSourceActionOptions,
  getVariableSourceDropdownOptions,
  getVariableSourceDropdownValue,
  previousResultShortSourceLabel,
  previousResultSourceLabel,
  rangeTextSourceLabel,
  shouldShowValueSourceSelector,
  valueSourceActionLabels,
} from './OutputColumnRecipeEditor.valueActionHelpers';
export type { ValueSourceAction, VariableSourceDropdownValue } from './OutputColumnRecipeEditor.valueActionHelpers';
export { StepConditionFields, shouldShowStepTypeSelectForStep } from './OutputColumnRecipeEditor.StepFields';
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

export const recipeEditorModalPendingApplyText = 'Los cambios se aplican al confirmar.';
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

type RecipeEditorVisualMode = 'take' | 'combine' | 'range' | 'advanced';

const recipeEditorVisualModes: Array<{ value: RecipeEditorVisualMode; label: string }> = [
  { value: 'take', label: 'Tomar valor' },
  { value: 'combine', label: 'Combinar valores' },
  { value: 'range', label: 'Asignar por rangos' },
  { value: 'advanced', label: 'Transformar valor / Avanzado' },
];

export function getRecipeEditorVisualMode(recipe: EditableCustomRecipe, modeOverride?: CustomValueMode): RecipeEditorVisualMode {
  if (recipe.type === 'manualRange') {
    return 'range';
  }

  const mode = modeOverride ?? getCustomValueMode(recipe);
  const visibleSteps = getVisibleRecipeSteps(recipe, mode);
  if (hasConfiguredManualRangeStep(recipe) || visibleSteps.some((step) => step.type === 'manualRange')) {
    return 'range';
  }

  if (mode === 'concat' || hasConfiguredConcatStep(recipe) || recipe.parts.length > 1) {
    return 'combine';
  }

  if (visibleSteps.some((step) => step.type !== 'noop')) {
    return 'advanced';
  }

  return 'take';
}

function RecipePreviewBar({ preview }: { preview: string }) {
  return (
    <div className="recipePreviewBar">
      <strong>Vista previa:</strong>
      <span title={preview}>{preview}</span>
    </div>
  );
}

function RecipeModeTabs({ activeMode }: { activeMode: RecipeEditorVisualMode }) {
  return (
    <div className="recipeModeTabs" aria-label="Modo de construcción de valor">
      {recipeEditorVisualModes.map((mode) => (
        <span
          key={mode.value}
          className={`recipeModeTab${mode.value === activeMode ? ' isActive' : ''}`}
          aria-current={mode.value === activeMode ? 'step' : undefined}
        >
          {mode.label}
        </span>
      ))}
    </div>
  );
}

function RecipeEditorShell({ mode, children }: { mode: RecipeEditorVisualMode; children: ReactNode }) {
  return (
    <div className="recipeEditorShell">
      {/* Clasificador visual derivado: la receta y su comportamiento siguen viviendo en los editores actuales. */}
      <RecipeModeTabs activeMode={mode} />
      <div className="recipeEditorContent">
        {children}
      </div>
    </div>
  );
}

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
  const customValuePartsLabel = column.recipe.type === 'combine'
    ? getCustomValuePartsDisplayLabel(column.recipe)
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
            partsLabel={customValuePartsLabel}
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
            title={`Crear valor personalizado${column.label ? `: ${column.label}` : ''}`}
            titleInfo="Configurá cómo se arma este valor antes de aplicarlo."
            size="xl"
            onClose={requestCancelConstructor}
            headerDetails={(
              <RecipePreviewBar preview={modalCombineRecipe ? buildCustomValuePreview(modalCombineRecipe, sampleInputValues, true, effectiveModalCustomValueMode, manualRangeRows) : customValuePreview} />
            )}
            footer={(
              <div className="constructorModalFooterContent">
                <p>{recipeEditorModalPendingApplyText}</p>
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
            <div className="constructorModalContent">
              {modalCombineRecipe ? (
                <RecipeEditorShell mode={getRecipeEditorVisualMode(modalCombineRecipe, effectiveModalCustomValueMode)}>
                  <CustomValueEditor
                    recipe={modalCombineRecipe}
                    inputColumns={activeInputColumns}
                    manualRangeRows={manualRangeRows}
                    sampleInputValues={sampleInputValues}
                    mode={effectiveModalCustomValueMode}
                    onChange={setDraftRecipe}
                  />
                </RecipeEditorShell>
              ) : null}
            </div>
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
            title={`Crear valor personalizado${column.label ? `: ${column.label}` : ''}`}
            titleInfo="Configurá cómo se arma este valor antes de aplicarlo."
            size="xl"
            onClose={requestCancelConstructor}
            headerDetails={(
              <RecipePreviewBar preview={modalManualRangeRecipe ? buildManualRangeRecipePreview(modalManualRangeRecipe, manualRangeRows, sampleInputValues) ?? 'Sin vista previa para los rangos configurados' : 'Sin vista previa para los rangos configurados'} />
            )}
            footer={(
              <div className="constructorModalFooterContent">
                <p>{recipeEditorModalPendingApplyText}</p>
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
            <div className="constructorModalContent">
              {modalManualRangeRecipe ? (
                <RecipeEditorShell mode={getRecipeEditorVisualMode(modalManualRangeRecipe)}>
                  <ManualRangeRecipeEditor
                    recipe={modalManualRangeRecipe}
                    inputColumns={activeInputColumns}
                    manualRangeRows={manualRangeRows}
                    onChange={setDraftRecipe}
                  />
                </RecipeEditorShell>
              ) : null}
            </div>
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
            <dt>Tipo</dt>
            <dd>Trabajar con rangos</dd>
          </div>
          <div>
            <dt>Rangos</dt>
            <dd>{getManualRangeCountLabel(recipe)}</dd>
          </div>
          <div>
            <dt>Condición</dt>
            <dd>{describeManualRangeCondition(recipe, inputColumns)}</dd>
          </div>
        </dl>
      </div>
      <button type="button" onClick={onEdit}>
        Editar valor personalizado
      </button>
    </div>
  );
}

function ManualRangeRecipeEditor({
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
  const [showGenerator, setShowGenerator] = useState(false);
  const [isClearRangesConfirmationOpen, setIsClearRangesConfirmationOpen] = useState(false);
  const hasOverlappingRanges = hasOverlappingManualRanges(recipe.ranges);
  const clearRanges = () => {
    onChange(clearManualRangeValues(recipe));
    setIsClearRangesConfirmationOpen(false);
  };

  return (
    <div className="recipeSubBlock manualRangeEditor">
      <div className="sectionHeader">
        <div>
          <strong className="manualRangeTitleGroup labelWithInfo">
            <span>Valores por rangos</span>
            <InfoTooltip
              ariaLabel="Ayuda: valores por rangos"
              content={manualRangeUsageHelpText}
            />
          </strong>
        </div>
        <div className="manualRangeHeaderActions">
          <ActionButton action="add" variant="secondary" onClick={() => onChange(addManualRangeValue(recipe, 'start'))}>
            Agregar rango
          </ActionButton>
          <InfoTooltip content="Ordena los rangos por la fila de inicio.">
            <button type="button" className="secondary" onClick={() => onChange(sortManualRangesByStart(recipe))}>
              Ordenar por inicio
            </button>
          </InfoTooltip>
          <InfoTooltip content="Elimina todos los rangos configurados.">
            <button type="button" className="secondary" disabled={recipe.ranges.length === 0} onClick={() => setIsClearRangesConfirmationOpen(true)}>
              Borrar rangos
            </button>
          </InfoTooltip>
          <InfoTooltip content="Genera rangos automáticamente según los datos detectados.">
            <button type="button" className="secondary" onClick={() => setShowGenerator(true)}>
              Generar rangos sugeridos
            </button>
          </InfoTooltip>
        </div>
      </div>
      {showGenerator ? (
        <ManualRangeTextGenerator
          recipe={recipe}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          onClose={() => setShowGenerator(false)}
          onChange={onChange}
        />
      ) : null}

      {recipe.condition ? (
        <p className="manualRangeWarning">
          Esta configuración conserva una condición interna heredada: {describeManualRangeCondition(recipe, inputColumns)}. Para nuevas condiciones usá la condición general del paso.
        </p>
      ) : null}

      {recipe.ranges.length === 0 ? (
        <p className="muted">No hay rangos configurados.</p>
      ) : (
        <>
          {hasOverlappingRanges ? (
            <p className="manualRangeWarning">Hay rangos superpuestos. En filas repetidas se usará el primer rango configurado.</p>
          ) : null}
          <div className="manualRangeList">
            {recipe.ranges.map((range) => (
              <ManualRangeTableRow
                key={range.id}
                recipe={recipe}
                range={range}
                inputColumns={inputColumns}
                manualRangeRows={manualRangeRows}
                onChange={onChange}
              />
            ))}
          </div>
          <div className="manualRangeFooterActions">
            <ActionButton action="add" variant="secondary" onClick={() => onChange(addManualRangeValue(recipe, 'end'))}>
              Agregar rango
            </ActionButton>
          </div>
        </>
      )}
      <ConfirmDialog
        open={isClearRangesConfirmationOpen}
        title="Borrar rangos"
        message="¿Querés borrar todos los rangos configurados?"
        cancelLabel="Cancelar"
        confirmLabel="Borrar rangos"
        variant="danger"
        onCancel={() => setIsClearRangesConfirmationOpen(false)}
        onConfirm={clearRanges}
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
  initialValueMode: initialGeneratorValueMode = 'detectedText',
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
  const generateRanges = () => {
    if (!canPreview) {
      return [];
    }

    const effectiveInitialValueColumnId = shouldShowInitialValueColumn ? initialValueColumnId : undefined;

    if (detectionMode === 'dataBlocks') {
      return generateManualRangesFromDataBlocks(manualRangeRows, {
        dataColumnId: inputColumnId,
        startRowNumber: startRowNumber!,
        endRowNumber: endRowNumber!,
        initialValueMode,
        initialValueColumnId: effectiveInitialValueColumnId,
        trailingRowCount,
      });
    }

    return generateManualRangesFromTexts(manualRangeRows, {
      inputColumnId,
      startRowNumber: startRowNumber!,
      endRowNumber: endRowNumber!,
      mode: 'untilNextText',
      initialValueMode,
      initialValueColumnId: effectiveInitialValueColumnId,
      validRowsColumnId: effectiveValidRowsColumnId,
      trailingRowCount,
      startFilter,
    });
  };
  const generatedPreviewRanges = generateRanges();
  const generatedPreviewRangesWithoutStartFilter = detectionMode === 'textStarts' && canPreview && startFilter
    ? generateManualRangesFromTexts(manualRangeRows, {
      inputColumnId,
      startRowNumber: startRowNumber!,
      endRowNumber: endRowNumber!,
      mode: 'untilNextText',
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
  const suggestionResult = buildManualRangeSuggestions(generatedPreviewRanges, recipe.ranges);
  const availableSuggestionRanges = suggestionResult.suggestions;
  const omittedSuggestionRanges = suggestionResult.omittedSuggestions;
  const hiddenSuggestionCount = omittedSuggestionRanges.length;
  const visiblePreviewRanges = availableSuggestionRanges.slice(0, 6);
  const hiddenPreviewRangeLabels = availableSuggestionRanges.slice(6).map((range) => getManualRangeGeneratedExampleLabel(range));
  const previewMessage = !inputColumnId
    ? (detectionMode === 'dataBlocks' ? 'Elegí una columna con datos.' : 'Elegí una columna para buscar textos.')
    : !canPreview
      ? ''
      : generatedPreviewRanges.length === 0
        ? 'No se encontraron rangos con esta configuración. Revisá la columna elegida, el intervalo de filas o los filtros aplicados.'
        : '';
  const safePreviewMessage = previewMessage || (generatedPreviewRanges.length > 0 && availableSuggestionRanges.length === 0
    ? 'No hay sugerencias nuevas para agregar con esta configuracion.'
    : '');
  const suggestionConflictMessage = hiddenSuggestionCount > 0
    ? `Se ${hiddenSuggestionCount === 1 ? 'oculto' : 'ocultaron'} ${hiddenSuggestionCount} ${hiddenSuggestionCount === 1 ? 'sugerencia' : 'sugerencias'} por duplicado o superposicion.`
    : '';
  const confirmGeneratedRanges = () => {
    if (!canPreview) {
      return;
    }

    const nextRecipe = appendManualRangeSuggestions(recipe, generateRanges());

    if (nextRecipe === recipe) {
      return;
    }

    onChange(nextRecipe);
  };
  const confirmGeneratedRange = (range: ManualRangeValue) => {
    onChange(appendManualRangeSuggestion(recipe, range));
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
            disabled={availableSuggestionRanges.length === 0}
            onClick={confirmGeneratedRanges}
          >
            Agregar todas
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
            : 'Cada celda con dato en la columna elegida inicia un rango hasta el texto siguiente.'}
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
      {suggestionConflictMessage ? (
        <div className="manualRangeGeneratorWarnings" role="status">
          <p>{suggestionConflictMessage}</p>
        </div>
      ) : null}
      {safePreviewMessage ? (
        <div className="manualRangeGeneratorWarnings" role="status">
          <p>{safePreviewMessage}</p>
        </div>
      ) : availableSuggestionRanges.length > 0 ? (
        <div className="manualRangeGeneratorExamples">
          <span className="manualRangeGeneratorExamplesLabel">
            {availableSuggestionRanges.length} {availableSuggestionRanges.length === 1 ? 'sugerencia encontrada' : 'sugerencias encontradas'}
            {hiddenSuggestionCount > 0 ? ` (${hiddenSuggestionCount} ocultas por seguridad)` : ''}
          </span>
          <div className="manualRangeGeneratorPreview" aria-label="Ejemplos de rangos sugeridos">
            {visiblePreviewRanges.map((range, index) => (
              <div className="manualRangeGeneratorSuggestion" key={`${range.startRowNumber}-${range.endRowNumber}-${index}`}>
                <span>{getManualRangeGeneratedExampleLabel(range)}</span>
                <button type="button" className="secondary sm" onClick={() => confirmGeneratedRange(range)}>
                  Agregar
                </button>
              </div>
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
      {omittedSuggestionRanges.length > 0 ? (
        <details className="manualRangeGeneratorOmitted">
          <summary>Ver {omittedSuggestionRanges.length} {omittedSuggestionRanges.length === 1 ? 'sugerencia omitida' : 'sugerencias omitidas'}</summary>
          <div className="manualRangeGeneratorOmittedList" aria-label="Sugerencias omitidas">
            {omittedSuggestionRanges.map(({ range, reason }, index) => (
              <div className="manualRangeGeneratorOmittedItem" key={`${range.startRowNumber}-${range.endRowNumber}-${reason}-${index}`}>
                <span>{getManualRangeGeneratedExampleLabel(range)}</span>
                <span>{describeManualRangeOmittedSuggestionReason(reason)}</span>
              </div>
            ))}
          </div>
        </details>
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
    : [`Pandora usará cada dato de ${columnLabel} como inicio de un rango, ${intervalSummary}.`];

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
          onValueSourceTypeChange={(type) => onChange(updateManualRangeValueSourceType(recipe, range.id, type, inputColumns))}
          onFixedTextChange={(value) => onChange(updateManualRangeFixedTextValue(recipe, range.id, value))}
          onInputColumnChange={(inputColumnId) => onChange(updateManualRangeInputValue(recipe, range.id, inputColumnId))}
          onRangeTextChange={(patch) => {
            const nextPatch = patch.inputColumnId !== undefined && patch.selectedText === undefined
              ? { ...patch, selectedText: '' }
              : patch;
            const nextRecipe = updateManualRangeRangeTextValue(recipe, range.id, nextPatch);
            onChange(reconcileManualRangeTextSelections(nextRecipe, range.id, manualRangeRows));
          }}
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

export function describeCombineParts(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]) {
  if (recipe.parts.length === 0) {
    return 'Sin partes configuradas';
  }

  return recipe.parts
    .map((part) => {
      if (part.type === 'text') {
        return `Texto: "${part.value || ''}"`;
      }

      const inputColumn = inputColumns.find((column) => column.id === part.inputColumnId);
      return inputColumn ? getInputColumnSummary(inputColumn) : 'Columna de entrada';
    })
    .join(' | ');
}

export function getConstructorPartsSummary(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]) {
  return `${recipe.parts.length === 1 ? 'Base' : 'Partes'}: ${describeCombineParts(recipe, inputColumns)}`;
}

export function getCustomValuePartsDisplayLabel(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  const concatStep = getConfiguredConcatStep(recipe);

  if (!concatStep && recipe.parts.length === 1) {
    return 'Origen/base';
  }

  return '';
}

export function getCustomValuePartsDisplaySummary(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]) {
  const concatStep = getConfiguredConcatStep(recipe);

  if (concatStep?.parts?.length) {
    return concatStep.parts.map((part) => describeConcatPartSource(part, inputColumns)).join(' | ');
  }

  if (recipe.parts.length === 0) {
    return 'Sin partes configuradas';
  }

  return describeCombineParts(recipe, inputColumns);
}

export function getConstructorAdjustmentsSummary(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  inputColumns: InputColumn[],
  limit = 3,
) {
  const adjustments = getConstructorAdjustmentDescriptions(recipe, inputColumns);

  if (adjustments.length === 0) {
    return '';
  }

  if (adjustments.length <= limit) {
    return adjustments.join(' · ');
  }

  return `${adjustments.slice(0, limit).join(' · ')} · ${adjustments.length - limit} pasos más`;
}

export function getConstructorAdjustmentLabels(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  inputColumns: InputColumn[],
  limit = 4,
) {
  const adjustments = getConstructorAdjustmentDescriptions(recipe, inputColumns);

  if (adjustments.length <= limit) {
    return adjustments.map(formatAdjustmentForDisplay);
  }

  return [
    ...adjustments.slice(0, limit).map(formatAdjustmentForDisplay),
    `${adjustments.length - limit} pasos más`,
  ];
}

function getConstructorAdjustmentDescriptions(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]) {
  return [
    ...recipe.parts.flatMap((part) => describePartAdjustments(part, inputColumns)),
    ...describeStepAdjustments(recipe.steps ?? [], inputColumns),
  ];
}

function getConfiguredConcatStep(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return (recipe.steps ?? []).find((step) => step.type === 'concat' && (step.parts?.length ?? 0) > 0);
}

function formatAdjustmentForDisplay(adjustment: string) {
  const labels: Record<string, string> = {
    'limpiar espacios': 'Limpiar espacios',
    'sin operación seleccionada': 'Sin operación seleccionada',
    mayúsculas: 'Mayúsculas',
    minúsculas: 'Minúsculas',
    concatenar: 'Concatenar',
    'extraer número': 'Extraer número',
    'convertir a número': 'Convertir a número',
    'convertir a texto': 'Convertir a texto',
    'sin redondeo': 'Sin redondeo',
  };

  return labels[adjustment] ?? adjustment.charAt(0).toUpperCase() + adjustment.slice(1);
}

function describePartAdjustments(part: RecipePart, inputColumns: InputColumn[]) {
  const partLabel = part.type === 'text'
    ? `Texto: "${part.value || ''}"`
    : inputColumns.find((column) => column.id === part.inputColumnId)
      ? getInputColumnSummary(inputColumns.find((column) => column.id === part.inputColumnId)!)
      : 'Columna de entrada';
  const stepAdjustments = describeStepAdjustments(part.steps ?? [], inputColumns).map((adjustment) => `${adjustment} en ${partLabel}`);
  const separatorAdjustment = part.separatorAfter ? [`separador "${part.separatorAfter}" en ${partLabel}`] : [];

  return [...stepAdjustments, ...separatorAdjustment];
}

function describeStepAdjustments(steps: TransformStep[], inputColumns: InputColumn[] = []) {
  return steps.flatMap((step) => {
    if (step.type === 'numericOperation') {
      return [
        describeNumericOperation(step),
        describeRounding(step.rounding ?? 2),
      ];
    }

    return describeSimpleStep(step, inputColumns);
  }).filter(Boolean);
}

function describeSimpleStep(step: TransformStep, inputColumns: InputColumn[] = []) {
  if (step.type === 'trim') {
    return ['limpiar espacios'];
  }

  if (step.type === 'noop') {
    if (step.source?.type === 'fixedText') return ['usar texto fijo'];
    if (step.source?.type === 'input') return ['usar columna de entrada'];
    if (step.source?.type === 'previousResult') return ['usar resultado anterior'];
    return ['usar valor tal cual'];
  }

  if (step.type === 'uppercase') {
    return ['mayúsculas'];
  }

  if (step.type === 'lowercase') {
    return ['minúsculas'];
  }

  if (step.type === 'addPrefix') {
    return [`prefijo "${step.value ?? ''}"`];
  }

  if (step.type === 'addSuffix') {
    return [`sufijo "${step.value ?? ''}"`];
  }

  if (step.type === 'removeText') {
    return [`quitar "${step.value ?? ''}"`];
  }

  if (step.type === 'extractNumber') {
    return ['extraer número'];
  }

  if (step.type === 'toNumber') {
    return ['convertir a número'];
  }

  if (step.type === 'toText') {
    return ['convertir a texto'];
  }

  if (step.type === 'formatDate') {
    return ['formatear fecha'];
  }

  if (step.type === 'manualRange') {
    return [describeManualRangeStepSummary(step, inputColumns)];
  }

  if (step.type === 'concat') {
    return ['concatenar'];
  }

  return [`reemplazar "${step.searchValue ?? ''}" por "${step.replaceValue ?? ''}"`];
}

function describeNumericOperation(step: TransformStep) {
  const amount = step.amount ?? 0;

  if (step.operation === 'subtract') {
    return `restar valor ${amount}`;
  }

  if (step.operation === 'multiply') {
    return `multiplicar por ${amount}`;
  }

  if (step.operation === 'divide') {
    return `dividir por ${amount}`;
  }

  if (step.operation === 'addPercentage') {
    return `sumar ${amount}%`;
  }

  if (step.operation === 'subtractPercentage') {
    return `restar ${amount}%`;
  }

  if (step.operation === 'removeIncludedPercentage') {
    return `quitar ${amount}% incluido`;
  }

  return `sumar valor ${amount}`;
}

function describeRounding(rounding: TransformStep['rounding']) {
  if (rounding === 'none') {
    return 'sin redondeo';
  }

  return `${rounding ?? 2} decimales`;
}

function getStepSummary(step: TransformStep, inputColumns: InputColumn[] = []) {
  if (step.type === 'numericOperation') {
    return describeNumericOperation(step);
  }

  const [summary] = describeSimpleStep(step, inputColumns);
  return summary;
}

export function buildCustomValuePreview(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  sampleInputValues?: Record<string, string>,
  modal = false,
  modeOverride?: CustomValueMode,
  manualRangeRows: InputRow[] = [],
) {
  const mode = modeOverride ?? getCustomValueMode(recipe);

  if (mode === '') {
    return modal ? 'Configurá el Paso 1 para ver la vista previa.' : 'Sin valores configurados';
  }

  const hasNumericOperands = hasConfiguredNumericStepOperands(recipe);
  const effectiveMode = hasNumericOperands ? 'number' : mode;

  if (effectiveMode === 'number' && !getSimpleInputPart(recipe).inputColumnId && !getFirstStepSource(recipe) && !hasNumericOperands) {
    return 'Seleccioná una columna numérica.';
  }

  if (effectiveMode === 'text' && !getSimpleInputPart(recipe).inputColumnId && !getFirstStepSource(recipe) && !hasConfiguredManualRangeStep(recipe)) {
    return 'Seleccioná una columna de texto.';
  }

  if (effectiveMode === 'concat' && recipe.parts.length === 0 && !hasConfiguredConcatStep(recipe)) {
    return 'Agrega una parte para ver la vista previa.';
  }

  if (!isCustomValueConfigured(recipe, effectiveMode)) {
    return 'No se han elegido valores suficientes.';
  }

  if (effectiveMode === 'number' && !canPreviewNumericValue(recipe, sampleInputValues)) {
    return 'No se pudo calcular: valor no numérico.';
  }

  if (recipeHasManualRange(recipe)) {
    return buildManualRangeAwarePreview(recipe, manualRangeRows) ?? 'Sin vista previa para los rangos configurados';
  }

  return buildCombinePreview(recipe, sampleInputValues) ?? 'Sin datos de ejemplo disponibles';
}

export function buildCombinePreview(recipe: Extract<OutputRecipe, { type: 'combine' }>, sampleInputValues?: Record<string, string>) {
  if (!sampleInputValues) {
    return null;
  }

  const previewColumn: OutputColumn = {
    id: 'constructor-preview',
    label: 'Vista previa',
    order: 0,
    enabled: true,
    recipe,
  };
  const [row] = buildProcessedRows([{ rowNumber: 1, values: sampleInputValues }], [previewColumn]);
  return row?.outputValues[previewColumn.id] ?? '';
}

export function buildManualRangeAwarePreview(recipe: Extract<OutputRecipe, { type: 'combine' }>, rows: InputRow[]) {
  const previewRows = getManualRangeAwarePreviewRows(recipe, rows);

  if (previewRows.length === 0) {
    return null;
  }

  const previewColumn: OutputColumn = {
    id: 'constructor-preview',
    label: 'Vista previa',
    order: 0,
    enabled: true,
    recipe,
  };

  for (const row of previewRows) {
    const [processedRow] = buildProcessedRows([row], [previewColumn]);
    const value = processedRow?.outputValues[previewColumn.id] ?? '';
    if (value.trim() !== '') {
      return `Fila ${row.rowNumber}: ${value}`;
    }
  }

  return null;
}

export function buildManualRangeRecipePreview(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rows: InputRow[],
  sampleInputValues?: Record<string, string>,
) {
  const previewRows = getManualRangePreviewRows(recipe, rows, sampleInputValues);
  if (previewRows.length === 0) {
    return null;
  }

  const previewColumn: OutputColumn = {
    id: 'manual-range-preview',
    label: 'Vista previa',
    order: 0,
    enabled: true,
    recipe,
  };

  for (const row of previewRows) {
    const [processedRow] = buildProcessedRows([row], [previewColumn]);
    const value = processedRow?.outputValues[previewColumn.id] ?? '';
    if (value.trim() !== '') {
      return `Fila ${row.rowNumber}: ${value}`;
    }
  }

  return null;
}

function getManualRangeAwarePreviewRows(recipe: Extract<OutputRecipe, { type: 'combine' }>, rows: InputRow[]) {
  const manualRangeSteps = collectManualRangeSteps(recipe.steps ?? []);
  recipe.parts.forEach((part) => {
    manualRangeSteps.push(...collectManualRangeSteps(part.steps ?? []));
  });

  if (manualRangeSteps.length === 0) {
    return [];
  }

  return rows.filter((row) => manualRangeSteps.some((step) => (
    (step.ranges ?? []).some((range) => row.rowNumber >= range.startRowNumber && row.rowNumber <= range.endRowNumber)
  )));
}

function collectManualRangeSteps(steps: TransformStep[]): TransformStep[] {
  return steps.flatMap((step) => {
    const nestedSteps = step.parts?.flatMap((part) => part.steps ?? []) ?? [];
    const nestedManualRangeSteps = collectManualRangeSteps(nestedSteps);
    return step.type === 'manualRange' ? [step, ...nestedManualRangeSteps] : nestedManualRangeSteps;
  });
}

function getManualRangePreviewRows(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rows: InputRow[],
  sampleInputValues?: Record<string, string>,
) {
  const rowsInRange = rows.filter((row) => recipe.ranges.some((range) => row.rowNumber >= range.startRowNumber && row.rowNumber <= range.endRowNumber));
  if (rowsInRange.length > 0 || !sampleInputValues) {
    return rowsInRange;
  }

  return recipe.ranges.map((range) => ({
    rowNumber: range.startRowNumber,
    values: sampleInputValues,
  }));
}

function recipeHasManualRange(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return stepsHaveManualRange(recipe.steps ?? [])
    || recipe.parts.some((part) => stepsHaveManualRange(part.steps ?? []));
}

function stepsHaveManualRange(steps: TransformStep[]): boolean {
  return steps.some((step) => (
    step.type === 'manualRange'
    || stepsHaveManualRange(step.parts?.flatMap((part) => part.steps ?? []) ?? [])
  ));
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

function CustomValueEditor({
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
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
}) {
  const baseInputPart = getSimpleInputPart(recipe);
  const visibleSteps = getVisibleRecipeSteps(recipe, mode);
  const defaultStepMode = getDefaultStepModeForRecipe(recipe, mode);
  const updateBaseInputColumn = (inputColumnId: string) => {
    const nextMode = defaultStepMode === 'number' ? 'number' : 'text';
    onChange(buildSimpleCustomValueRecipeWithSteps(nextMode, inputColumnId, visibleSteps, recipe));
  };
  const updateSteps = (steps: TransformStep[]) => {
    onChange(buildStepBasedCustomValueRecipe(recipe, steps, defaultStepMode));
  };

  return (
    <div className="recipeSubBlock customValueEditor">
      <StepBlocksEditor
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        defaultStepMode={defaultStepMode}
        baseInputColumnId={baseInputPart.inputColumnId}
        steps={visibleSteps}
        requireAtLeastOne
        getPreviousStepPreviewValue={(stepIndex) => getPreviousStepPreviewValue(recipe, sampleInputValues, stepIndex)}
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
  getPreviousStepPreviewValue,
  onBaseInputColumnChange,
  onStepsChange,
}: {
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  defaultStepMode: TransformStepMode;
  baseInputColumnId: string;
  steps: TransformStep[];
  requireAtLeastOne?: boolean;
  getPreviousStepPreviewValue?: (stepIndex: number) => string | null;
  onBaseInputColumnChange: (inputColumnId: string) => void;
  onStepsChange: (steps: TransformStep[]) => void;
}) {
  const addStep = () => {
    onStepsChange([...steps, createNoopStep(defaultStepMode)]);
  };

  const deleteStep = (indexToDelete: number) => {
    if (requireAtLeastOne && steps.length <= 1) {
      return;
    }

    onStepsChange(steps.filter((_, index) => index !== indexToDelete));
  };

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
              onBaseInputColumnChange={onBaseInputColumnChange}
              onChange={(patch) => onStepsChange(updateStep(steps, step.id, patch))}
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

function SimpleStepBlock({
  step,
  index,
  inputColumns,
  manualRangeRows,
  defaultStepMode,
  baseInputColumnId,
  canDelete,
  previousResultPreviewValue,
  onBaseInputColumnChange,
  onChange,
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
  onBaseInputColumnChange: (inputColumnId: string) => void;
  onChange: (patch: Partial<TransformStep>) => void;
  onDelete: () => void;
}) {
  const [textSourceActionOverride, setTextSourceActionOverride] = useState<StepTextSourceAction | null>(null);
  const summary = getStepSummary(step, inputColumns);
  const stepMode = getStepMode(step, defaultStepMode);
  const isManualRangeStep = step.type === 'manualRange';
  const showStepTypeSelect = shouldShowStepTypeSelectForStep(step);
  const stepSource = getVisibleStepSource(step, index, baseInputColumnId);
  const textSourceAction = textSourceActionOverride ?? getStepTextSourceAction(stepSource);
  const updateStepSource = (source: StepSource) => {
    if (index === 0 && source.type === 'input') {
      onBaseInputColumnChange(source.inputColumnId);
    }

    onChange({ source });
  };
  const updateTextSourceAction = (action: StepTextSourceAction) => {
    setTextSourceActionOverride(action);
    onChange({
      ...replaceStepType(step, 'noop', 'text', undefined, index),
      source: getStepSourceForTextAction(action, stepSource, inputColumns),
    });
  };

  return (
    <div className="stepDetailPanel">
      <div className="stepCardHeader">
        <strong>
          Paso {index + 1}{summary ? ` · ${summary}` : ''}
        </strong>
        {canDelete ? <DeleteButton title="Eliminar paso" onClick={onDelete} /> : <span aria-hidden="true" />}
      </div>
      <div className={`simpleCustomValueGrid${isManualRangeStep ? ' manualRangeStepGrid' : ''}`}>
        {step.type === 'concat' || isManualRangeStep ? (
          <div className="concatStepTopRow">
            <div className="concatStepTopControls">
              <StepModeSelect mode={stepMode} onChange={(mode) => onChange(changeStepMode(step, mode))} />
              {showStepTypeSelect ? (
                <StepTypeSelect
                  step={step}
                  mode={stepMode}
                  textSourceAction={textSourceAction}
                  allowPreviousResultSource={index > 0}
                  onTextSourceAction={updateTextSourceAction}
                  onChange={(type, operation) => onChange(replaceStepType(step, type, stepMode, operation, index))}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <StepModeSelect mode={stepMode} onChange={(mode) => onChange(changeStepMode(step, mode))} />
            <StepTypeSelect
              step={step}
              mode={stepMode}
              textSourceAction={textSourceAction}
              allowPreviousResultSource={index > 0}
              onTextSourceAction={updateTextSourceAction}
              onChange={(type, operation) => onChange(replaceStepType(step, type, stepMode, operation, index))}
            />
          </>
        )}
        <StepFields
          step={step}
          stepIndex={index}
          stepSource={stepSource}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          labels="workflow"
          previousResultPreviewValue={previousResultPreviewValue}
          textSourceAction={textSourceAction}
          onSourceChange={updateStepSource}
          onChange={onChange}
        />
        {isManualRangeStep ? (
          <div className="manualRangeStepCondition">
            <StepConditionFields step={step} inputColumns={inputColumns} variant="manualRange" onChange={onChange} />
          </div>
        ) : (
          <StepConditionFields step={step} inputColumns={inputColumns} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

function StepDetailPanel({
  step,
  index,
  inputColumns,
  manualRangeRows = [],
  canDelete,
  allowConcat = true,
  stepSource = step.source ?? { type: 'previousResult' },
  allowPreviousResultSource,
  previousResultPreviewValue,
  onSourceChange,
  onChange,
  onDelete,
  concatPart = false,
}: {
  step: TransformStep;
  index: number;
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  canDelete: boolean;
  allowConcat?: boolean;
  stepSource?: StepSource;
  allowPreviousResultSource?: boolean;
  previousResultPreviewValue?: string | null;
  onSourceChange?: (source: StepSource) => void;
  onChange: (patch: Partial<TransformStep>) => void;
  onDelete: () => void;
  concatPart?: boolean;
}) {
  const [textSourceActionOverride, setTextSourceActionOverride] = useState<StepTextSourceAction | null>(null);
  const summary = getStepSummary(step, inputColumns);
  const stepMode = getStepMode(step);
  const isManualRangeStep = step.type === 'manualRange';
  const showStepTypeSelect = shouldShowStepTypeSelectForStep(step);
  const textSourceAction = textSourceActionOverride ?? getStepTextSourceAction(stepSource);
  const updateTextSourceAction = (action: StepTextSourceAction) => {
    setTextSourceActionOverride(action);
    const source = getStepSourceForTextAction(action, stepSource, inputColumns);
    onSourceChange?.(source);
    onChange({
      ...replaceStepType(step, 'noop', 'text', undefined, index),
      ...(onSourceChange ? {} : { source }),
    });
  };
  return (
    <div className="stepDetailPanel">
      <div className="stepCardHeader">
        <strong>
          Paso {index + 1}{summary ? ` · ${summary}` : ''}
        </strong>
        {canDelete ? <DeleteButton title="Eliminar paso" onClick={onDelete} /> : <span aria-hidden="true" />}
      </div>
      <div className={`simpleCustomValueGrid${isManualRangeStep ? ' manualRangeStepGrid' : ''}`}>
        {step.type === 'concat' || isManualRangeStep ? (
          <div className="concatStepTopRow">
            <div className="concatStepTopControls">
              <StepModeSelect mode={stepMode} allowManualRange={allowConcat} onChange={(mode) => onChange(changeStepMode(step, mode))} />
              {showStepTypeSelect ? (
                <StepTypeSelect
                  step={step}
                  mode={stepMode}
                  allowConcat={allowConcat}
                  textSourceAction={textSourceAction}
                  allowPreviousResultSource={Boolean(allowPreviousResultSource)}
                  onTextSourceAction={updateTextSourceAction}
                  onChange={(type, operation) => onChange(replaceStepType(step, type, stepMode, operation, index))}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <StepModeSelect mode={stepMode} allowManualRange={allowConcat} onChange={(mode) => onChange(changeStepMode(step, mode))} />
            <StepTypeSelect
              step={step}
              mode={stepMode}
              allowConcat={allowConcat}
              textSourceAction={textSourceAction}
              allowPreviousResultSource={Boolean(allowPreviousResultSource)}
              onTextSourceAction={updateTextSourceAction}
              onChange={(type, operation) => onChange(replaceStepType(step, type, stepMode, operation, index))}
            />
          </>
        )}
        <StepFields
          step={step}
          stepIndex={index}
          stepSource={stepSource}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          labels="workflow"
          allowPreviousResultSource={allowPreviousResultSource}
          previousResultPreviewValue={previousResultPreviewValue}
          textSourceAction={textSourceAction}
          showSourceFields={!(concatPart && (step.type === 'addPrefix' || step.type === 'addSuffix'))}
          hideFixedTextInput={concatPart && (step.type === 'addPrefix' || step.type === 'addSuffix')}
          onSourceChange={onSourceChange ?? ((source) => onChange({ source }))}
          onChange={onChange}
        />
        {isManualRangeStep ? (
          <div className="manualRangeStepCondition">
            <StepConditionFields step={step} inputColumns={inputColumns} variant="manualRange" onChange={onChange} />
          </div>
        ) : (
          <StepConditionFields step={step} inputColumns={inputColumns} onChange={onChange} />
        )}
      </div>
    </div>
  );
}


function ConcatStepFields({
  parts,
  inputColumns,
  manualRangeRows,
  allowPreviousResult,
  previousResultPreviewValue,
  onChange,
}: {
  parts: ConcatPart[];
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  allowPreviousResult: boolean;
  previousResultPreviewValue?: string | null;
  onChange: (parts: ConcatPart[]) => void;
}) {
  const [selectedPartId, setSelectedPartId] = useState<string | null>(parts[0]?.id ?? null);
  const previousPartCountRef = useRef(parts.length);
  const safeSelectedPartId = getSafeSelectedConcatPartId(parts, selectedPartId);
  const selectedPart = parts.find((part) => part.id === safeSelectedPartId);
  const selectedPartIndex = selectedPart ? parts.findIndex((part) => part.id === selectedPart.id) : -1;

  useEffect(() => {
    if (parts.length > previousPartCountRef.current) {
      setSelectedPartId(parts[parts.length - 1]?.id ?? null);
    }

    previousPartCountRef.current = parts.length;
  }, [parts]);

  const updatePart = (partId: string, nextPart: ConcatPart) => {
    onChange(parts.map((part) => (part.id === partId ? nextPart : part)));
  };
  const addPart = () => {
    onChange([
      ...parts,
      createDefaultConcatPart(parts.length, allowPreviousResult),
    ]);
  };
  const removePart = (partId: string) => {
    setSelectedPartId(getNextSelectedConcatPartIdAfterRemove(parts, partId, safeSelectedPartId));
    onChange(parts.filter((part) => part.id !== partId));
  };

  return (
    <div className="concatStepFields">
      {parts.length === 0 ? (
        <div className="concatPartsEmptyState">
          <p className="muted">Agrega una parte para construir el valor.</p>
          <InfoTooltip content="Agrega otro dato o texto a combinar.">
            <button type="button" className="secondary concatAddPartButton" onClick={addPart}>{addPartLabel}</button>
          </InfoTooltip>
        </div>
      ) : null}
      {parts.length > 0 ? (
        <div className="concatPartsWorkspace">
          <div className="concatPartsSidebar">
            <SortableList
              items={parts}
              onChange={(nextParts) => onChange(normalizeConcatPartsAfterReorder(nextParts))}
              renderItem={(part, handle) => {
                const index = parts.findIndex((item) => item.id === part.id);

                return (
                  <div className={`concatPartListItem${part.id === safeSelectedPartId ? ' selected' : ''}`}>
                    {handle}
                    <button
                      type="button"
                      className="concatPartSelectButton"
                      onClick={() => setSelectedPartId(part.id)}
                    >
                      <strong>Parte {index + 1}</strong>
                      <span>{describeConcatPartSource(part, inputColumns)}</span>
                    </button>
                  </div>
                );
              }}
            />
            <InfoTooltip content="Agrega otro dato o texto a combinar.">
              <button type="button" className="secondary concatAddPartButton" onClick={addPart}>{addPartLabel}</button>
            </InfoTooltip>
          </div>
          {selectedPart ? (
            <div className="concatPartDetailPanel">
              <div className="concatPartHeader">
                <strong className="headingWithInfo">
                  <span>Parte {selectedPartIndex + 1}</span>
                  <InfoTooltip content="Configurá el dato o texto de esta parte." />
                </strong>
                <DeleteButton title="Eliminar parte" onClick={() => removePart(selectedPart.id)} />
              </div>
              <ConcatPartStepsEditor
                inputColumns={inputColumns}
                manualRangeRows={manualRangeRows}
                steps={selectedPart.steps ?? []}
                baseSource={selectedPart.source}
                separatorFields={selectedPartIndex > 0 ? (
                  <div className="concatPartFields">
                    <label className="field compact">
                      <span className="labelWithInfo">
                        <span>Separador antes de esta parte</span>
                        <InfoTooltip content="Texto que separa esta parte de la anterior." />
                      </span>
                      <input
                        value={selectedPart.separatorBefore ?? ''}
                        onChange={(event) => updatePart(selectedPart.id, { ...selectedPart, separatorBefore: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}
                previousResultPreviewValue={previousResultPreviewValue}
                onBaseSourceChange={(source, nextSteps) => updatePart(
                  selectedPart.id,
                  {
                    ...selectedPart,
                    source,
                    ...(nextSteps ? { steps: nextSteps } : {}),
                  },
                )}
                onChange={(steps) => onChange(updateConcatPartSteps(parts, selectedPart.id, steps))}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ConcatPartStepsEditor({
  inputColumns,
  manualRangeRows,
  steps,
  baseSource,
  separatorFields,
  previousResultPreviewValue,
  onBaseSourceChange,
  onChange,
}: {
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  steps: TransformStep[];
  baseSource: StepSource;
  separatorFields?: ReactNode;
  previousResultPreviewValue?: string | null;
  onBaseSourceChange: (source: StepSource, nextSteps?: TransformStep[]) => void;
  onChange: (steps: TransformStep[]) => void;
}) {
  const primaryStep = getVisibleConcatPartPrimaryStep(steps);
  const additionalSteps = steps.slice(1);
  const updatePrimaryStep = (patch: Partial<TransformStep>) => {
    onChange(updateConcatPartPrimaryStep(steps, patch));
  };
  const updatePrimaryStepSource = (source: StepSource) => {
    onBaseSourceChange(source, primaryStep.source ? clearPrimaryStepSource(steps) : undefined);
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

      <StepDetailPanel
        step={primaryStep}
        index={0}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        canDelete={false}
        allowConcat={false}
        stepSource={primaryStep.source ?? baseSource}
        allowPreviousResultSource
        previousResultPreviewValue={baseSource.type === 'previousResult' ? previousResultPreviewValue : null}
        concatPart
        onSourceChange={updatePrimaryStepSource}
        onChange={updatePrimaryStep}
        onDelete={() => undefined}
      />

      <div className="concatPartStepsBlock">
        {additionalSteps.length > 0 ? (
          <div className="concatPartTransformList">
            {additionalSteps.map((step, index) => {
              const transformIndex = index + 1;

              return (
                <StepDetailPanel
                  key={step.id}
                  step={step}
                  index={transformIndex}
                  inputColumns={inputColumns}
                  manualRangeRows={manualRangeRows}
                  canDelete
                  allowConcat={false}
                  allowPreviousResultSource
                  previousResultPreviewValue={previousResultPreviewValue}
                  concatPart
                  onChange={(patch) => updateAdditionalStep(step.id, patch)}
                  onDelete={() => deleteAdditionalStep(step.id)}
                />
              );
            })}
          </div>
        ) : null}
        <div className="concatPartStepsActions">
          <InfoTooltip content="Agrega una transformacion adicional a esta parte.">
            <button type="button" className="secondary concatAddAdjustmentButton" onClick={addAdditionalStep}>{recipeEditorAdditionalStepLabel}</button>
          </InfoTooltip>
        </div>
      </div>
    </div>
  );
}

function clearPrimaryStepSource(steps: TransformStep[]) {
  if (steps.length === 0) {
    return steps;
  }

  const [{ source: _source, ...primaryStep }, ...additionalSteps] = steps;
  return [primaryStep, ...additionalSteps];
}

type StepFieldLabels = 'default' | 'workflow';

function StepFields({
  step,
  stepIndex = 0,
  stepSource,
  inputColumns,
  manualRangeRows = [],
  labels = 'default',
  showSourceFields = true,
  allowPreviousResultSource,
  previousResultPreviewValue,
  hideFixedTextInput = false,
  textSourceAction,
  onSourceChange,
  onChange,
}: {
  step: TransformStep;
  stepIndex?: number;
  stepSource: StepSource;
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  labels?: StepFieldLabels;
  showSourceFields?: boolean;
  allowPreviousResultSource?: boolean;
  previousResultPreviewValue?: string | null;
  hideFixedTextInput?: boolean;
  textSourceAction?: StepTextSourceAction;
  onSourceChange: (source: StepSource) => void;
  onChange: (patch: Partial<TransformStep>) => void;
}) {
  const canUsePreviousResultSource = allowPreviousResultSource ?? stepIndex > 0;
  const usesFixedDateSource = step.type === 'formatDate' && stepSource.type === 'fixedText';
  const updateSource = (source: StepSource) => {
    if (step.type === 'formatDate' && source.type === 'fixedText') {
      onChange({
        source: { type: 'fixedText', value: getDatePickerValue(source.value, step.dateInputFormat ?? defaultDateInputFormat) },
        dateInputFormat: 'YYYY-MM-DD',
      });
      return;
    }

    onSourceChange(source);
  };
  const sourceFields = showSourceFields && shouldShowTextSourceFields(step.type) ? (
    <StepSourceFields
      label={valueSourceLabel}
      source={stepSource}
      inputColumns={inputColumns}
      inputRows={manualRangeRows}
      allowPreviousResult={canUsePreviousResultSource}
      previousResultPreviewValue={previousResultPreviewValue}
      fixedTextInputType={step.type === 'formatDate' ? 'date' : 'text'}
      fixedTextDateInputFormat={step.dateInputFormat ?? defaultDateInputFormat}
      hideFixedTextInput={hideFixedTextInput}
      hideSourceSelector={(step.type === 'noop' && Boolean(textSourceAction)) || stepSource.type === 'fixedText'}
      columnTextPickerOpen={step.type === 'noop' && textSourceAction === 'pickColumnText'}
      onChange={updateSource}
    />
  ) : null;

  if (step.type === 'noop') {
    return sourceFields;
  }

  if (step.type === 'manualRange') {
    return (
      <div className="manualRangeStepFields">
        <ManualRangeRecipeEditor
          recipe={manualRangeStepToRecipe(step)}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          onChange={(recipe) => onChange(manualRangeRecipeToStepPatch(recipe))}
        />
      </div>
    );
  }

  if (step.type === 'addPrefix') {
    return (
      <>
        {sourceFields}
        <label className="field compact">
          <span>{labels === 'workflow' ? 'Prefijo' : 'Texto al inicio'}</span>
          <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
        </label>
      </>
    );
  }

  if (step.type === 'addSuffix') {
    return (
      <>
        {sourceFields}
        <label className="field compact">
          <span>{labels === 'workflow' ? 'Sufijo' : 'Texto al final'}</span>
          <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
        </label>
      </>
    );
  }

  if (step.type === 'removeText') {
    return (
      <>
        {sourceFields}
        <label className="field compact">
          <span>{labels === 'workflow' ? 'Texto a quitar' : 'Texto a quitar'}</span>
          <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
        </label>
      </>
    );
  }

  if (step.type === 'replaceText') {
    return (
      <>
        {sourceFields}
        <label className="field compact">
          <span>Buscar</span>
          <input value={step.searchValue ?? ''} onChange={(event) => onChange({ searchValue: event.target.value })} />
        </label>
        <label className="field compact">
          <span>Reemplazar por</span>
          <input value={step.replaceValue ?? ''} onChange={(event) => onChange({ replaceValue: event.target.value })} />
        </label>
      </>
    );
  }

  if (step.type === 'numericOperation') {
    const leftOperand = getVisibleLeftOperand(step, stepSource);
    const rightOperand = getVisibleRightOperand(step);

    return (
      <div className="numericOperationFields">
        <StepOperandFields
          label="Primer valor"
          operand={leftOperand}
          inputColumns={inputColumns}
          allowPreviousResult={canUsePreviousResultSource}
          onChange={(leftOperand) => onChange({ leftOperand })}
        />
        <StepOperandFields
          label="Segundo valor"
          operand={rightOperand}
          inputColumns={inputColumns}
          allowPreviousResult={canUsePreviousResultSource}
          onChange={(rightOperand) => onChange({
            rightOperand,
            ...(rightOperand.type === 'fixedText' ? { amount: parseOptionalNumberInput(rightOperand.value) } : {}),
          })}
        />
        <Dropdown
          className="compact"
          label={labels === 'workflow' ? 'Decimales / redondeo' : 'Redondeo'}
          labelInfo={<InfoTooltip content="Definí cómo mostrar los números del resultado." />}
          value={String(step.rounding ?? 2)}
          options={[
            { value: 'none', label: 'Sin redondeo' },
            { value: '0', label: '0 decimales' },
            { value: '2', label: '2 decimales' },
            { value: '4', label: '4 decimales' },
          ]}
          scrollStrategy="close"
          onChange={(value) => onChange({ rounding: parseRounding(value) })}
        />
      </div>
    );
  }

  if (step.type === 'concat') {
    return (
      <ConcatStepFields
        parts={step.parts ?? []}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        allowPreviousResult={canUsePreviousResultSource}
        previousResultPreviewValue={previousResultPreviewValue}
        onChange={(parts) => onChange({ parts })}
      />
    );
  }

  if (step.type === 'formatDate') {
    return (
      <>
        {sourceFields}
        {usesFixedDateSource ? null : (
          <Dropdown<DateInputFormat>
            className="compact"
            label="Formato de entrada"
            value={step.dateInputFormat ?? defaultDateInputFormat}
            options={dateInputFormatOptions}
            scrollStrategy="close"
            onChange={(dateInputFormat) => onChange({ dateInputFormat })}
          />
        )}
        <Dropdown<DateOutputFormat>
          className="compact"
          label="Formato de salida"
          value={step.dateOutputFormat ?? defaultDateOutputFormat}
          options={dateOutputFormatOptions}
          scrollStrategy="close"
          onChange={(dateOutputFormat) => onChange({ dateOutputFormat })}
        />
        <Dropdown<DateInvalidFallback>
          className="compact"
          label="Si no es una fecha válida"
          value={step.dateInvalidFallback ?? defaultDateInvalidFallback}
          options={dateInvalidFallbackOptions}
          scrollStrategy="close"
          onChange={(dateInvalidFallback) => onChange({ dateInvalidFallback })}
        />
        {(step.dateInvalidFallback ?? defaultDateInvalidFallback) === 'fixedText' ? (
          <label className="field compact">
            <span>Texto fallback</span>
            <input value={step.dateInvalidFallbackText ?? ''} onChange={(event) => onChange({ dateInvalidFallbackText: event.target.value })} />
          </label>
        ) : null}
      </>
    );
  }

  if (step.type === 'extractNumber') {
    return sourceFields;
  }

  if (step.type === 'toNumber') {
    return sourceFields;
  }

  if (step.type === 'toText') {
    return sourceFields;
  }

  return sourceFields;
}

function describeManualRangeOmittedSuggestionReason(reason: ManualRangeOmittedSuggestionReason) {
  if (reason === 'duplicate') {
    return 'Ya existe un rango igual.';
  }

  if (reason === 'overlapExisting') {
    return 'Se superpone con un rango configurado.';
  }

  return 'Se superpone con otra sugerencia generada.';
}
