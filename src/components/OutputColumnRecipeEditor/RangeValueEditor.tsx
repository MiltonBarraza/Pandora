import { defaultDateInputFormat, defaultDateOutputFormat, supportedDateInputFormats, supportedDateOutputFormats } from '../../domain/import/dateOperations';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import {
  getManualRangeFixedTextValue,
  getManualRangeInputSource,
  getManualRangeRangeTextHelpText,
  getManualRangeRangeTextSource,
  getManualRangeSelectedTextOptions,
  getManualRangeValueSourceType,
  manualRangeValueSourceOptions,
  type ManualRangeValueSourceType,
} from '../../domain/import/manualRangeModel';
import { useEffect, useState, type ReactNode } from 'react';
import type { ConcatPart, InputColumn, InputRow, ManualRangeValue, NumericOperation, StepSource, TransformStep, TransformStepMode } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { SortableList } from '../SortableList/SortableList';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { WarningTooltip } from '../ui/WarningTooltip/WarningTooltip';
import { ColumnTextPicker, createFixedTextSourceFromColumnText, getInvalidPickerTooltip, invalidPickerValuesLabel } from './ColumnTextPicker';
import { addPartLabel, noActiveColumnsLabel, operationTypeLabel, pickColumnTextLabel, useValueAsIsLabel, valueSourceLabel } from './OutputColumnRecipeEditor.constants';
import { StepConditionFields, StepSourceFields } from './OutputColumnRecipeEditor.StepFields';
import {
  createCanonicalSourceForAction,
  createCanonicalStepForAction,
  createCanonicalStepForMode,
  getAllowedSourceActions,
  getAllowedStepActions,
  getAllowedStepModes,
  getVisibleStepAction,
  isStepSourceAction,
  isVisibleStepActionConfigured,
  normalizeStepForContext,
  replaceStepActionWithSource,
  type StepEditorContext,
  type StepEditorContextKind,
  type StepSourceAction,
  type VisibleStepAction,
} from './OutputColumnRecipeEditor.stepPolicy';
import './OutputColumnRecipeEditor.recipeStudio.css';

type RangeValueEditorProps = {
  range: ManualRangeValue;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onFixedTextChange: (value: string) => void;
  onInputColumnChange: (inputColumnId: string) => void;
  onRangeTextChange: (patch: { inputColumnId?: string; selectedText?: string }) => void;
  onSourceChange: (source: StepSource) => void;
  onSourceAndStepsChange: (source: StepSource, steps: TransformStep[]) => void;
  onStepsChange: (steps: TransformStep[]) => void;
};

export type RangeValueSourceDropdownValue = ManualRangeValueSourceType | 'columnTextPicker' | `input:${string}`;
export type RangeValueConcatPartSourceDropdownValue = 'previousResult' | 'fixedText' | 'rangeText' | 'columnTextPicker' | `input:${string}`;
export type RangeValueTextAction = Exclude<VisibleStepAction, 'unconfigured'>;

export type RangeValueSourceSelection =
  | { type: 'valueSourceType'; value: ManualRangeValueSourceType }
  | { type: 'inputColumn'; inputColumnId: string };

const rangeValueModeLabels: Record<Exclude<TransformStepMode, 'manualRange'>, string> = {
  text: 'Trabajar con texto',
  number: 'Trabajar con número',
  conversion: 'Conversión',
  date: 'Trabajar con fechas',
};

const rangeValueActionLabels: Record<RangeValueTextAction, string> = {
  useValueAsIs: useValueAsIsLabel,
  useInputColumn: 'Usar columna de entrada',
  useFixedText: 'Usar texto fijo',
  pickColumnText: pickColumnTextLabel,
  useRangeText: 'Texto encontrado en el rango',
  usePreviousResult: 'Usar resultado anterior',
  trim: 'Limpiar espacios',
  uppercase: 'Convertir a mayúsculas',
  lowercase: 'Convertir a minúsculas',
  addPrefix: 'Agregar prefijo',
  addSuffix: 'Agregar sufijo',
  removeText: 'Quitar texto',
  replaceText: 'Reemplazar texto',
  concat: 'Concatenar',
  numericOperation: 'Operación numérica',
  extractNumber: 'Extraer número del texto',
  toNumber: 'Convertir a número',
  toText: 'Convertir a texto',
  formatDate: 'Formatear fecha',
  manualRange: 'Trabajar con rangos',
};

const numericOperationOptions: Array<{ value: NumericOperation; label: string }> = [
  { value: 'add', label: 'Sumar valor' },
  { value: 'subtract', label: 'Restar valor' },
  { value: 'multiply', label: 'Multiplicar por' },
  { value: 'divide', label: 'Dividir por' },
  { value: 'addPercentage', label: 'Sumar porcentaje' },
  { value: 'subtractPercentage', label: 'Restar porcentaje' },
  { value: 'removeIncludedPercentage', label: 'Quitar porcentaje incluido' },
];

const rangeValuePrimaryStepId = 'range-value-primary-step';

function createRangeValueStepContext(
  kind: StepEditorContextKind,
  stepIndex: number,
  inputColumns: InputColumn[],
  sourceActionOverride?: StepSourceAction,
): StepEditorContext {
  return {
    kind,
    stepIndex,
    defaultInputColumnId: inputColumns[0]?.id ?? '',
    sourceActionOverride,
  };
}

function getRangeValueModeOptions(context: StepEditorContext): Array<{ value: Exclude<TransformStepMode, 'manualRange'>; label: string }> {
  return getAllowedStepModes(context)
    .filter((mode): mode is Exclude<TransformStepMode, 'manualRange'> => mode !== 'manualRange')
    .map((mode) => ({ value: mode, label: rangeValueModeLabels[mode] }));
}

function getRangeValueActionOptions(
  mode: Exclude<TransformStepMode, 'manualRange'>,
  context: StepEditorContext,
): Array<{ value: RangeValueTextAction; label: string }> {
  return getAllowedStepActions(mode, context)
    .filter((action): action is RangeValueTextAction => action !== 'unconfigured')
    .map((action) => ({ value: action, label: rangeValueActionLabels[action] }));
}

function getRangeValueAdditionalActionOptions(
  mode: Exclude<TransformStepMode, 'manualRange'>,
  context: StepEditorContext,
) {
  return getRangeValueActionOptions(mode, context).filter((option) => !isStepSourceAction(option.value) || option.value === 'usePreviousResult');
}

function getConfiguredRangeValueAction(step: TransformStep, context: StepEditorContext): RangeValueTextAction | undefined {
  const action = getVisibleStepAction(step, context);
  return action === 'unconfigured' ? undefined : action;
}

function getStepWithRangeValueSource(step: TransformStep, source?: StepSource, context?: StepEditorContext, forceConfiguredSource = false): TransformStep {
  if (!source || step.type !== 'noop' || (!forceConfiguredSource && !context?.sourceActionOverride && !isConfiguredRangeValueSource(source))) {
    return step;
  }

  return { ...step, source };
}

function isConfiguredRangeValueSource(source: StepSource) {
  if (source.type === 'fixedText') {
    return source.value.trim().length > 0;
  }

  if (source.type === 'input' || source.type === 'rangeText') {
    return source.inputColumnId.trim().length > 0 || (source.type === 'rangeText' && source.selectedText.trim().length > 0);
  }

  return true;
}

function stripPrimarySource(step: TransformStep): TransformStep {
  if (step.type !== 'noop' || !step.source) {
    return step;
  }

  const { source: _source, ...stepWithoutSource } = step;
  return stepWithoutSource;
}

function getRangeValueFallbackSource(
  range: ManualRangeValue,
  valueSourceType: ManualRangeValueSourceType,
  inputSource: Extract<StepSource, { type: 'input' }>,
  rangeTextSource: Extract<StepSource, { type: 'rangeText' }>,
): StepSource {
  if (valueSourceType === 'input') {
    return inputSource;
  }

  if (valueSourceType === 'rangeText') {
    return rangeTextSource;
  }

  return { type: 'fixedText', value: getManualRangeFixedTextValue(range) };
}

export function RangeValueEditor({
  range,
  inputColumns,
  manualRangeRows,
  onFixedTextChange,
  onInputColumnChange,
  onRangeTextChange,
  onSourceChange,
  onSourceAndStepsChange,
  onStepsChange,
}: RangeValueEditorProps) {
  const [isColumnTextPickerOpen, setIsColumnTextPickerOpen] = useState(false);
  const valueSourceType = getManualRangeValueSourceType(range);
  const inputSource = getManualRangeInputSource(range);
  const rangeTextSource = getManualRangeRangeTextSource(range);
  const selectedTextOptions = getManualRangeSelectedTextOptions(manualRangeRows, range, rangeTextSource);
  const rangeTextHelpText = getManualRangeRangeTextHelpText(manualRangeRows, range, rangeTextSource);
  const hasNoRangeTextOptions = selectedTextOptions.length === 0;
  const noRangeTextWarning = hasNoRangeTextOptions
    ? getInvalidPickerTooltip(rangeTextHelpText || 'Sin textos en el rango')
    : '';
  const inputColumnOptions = inputColumns.length === 0
    ? [{ value: '', label: noActiveColumnsLabel }]
    : [{ value: '', label: 'Seleccionar' }, ...inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))];
  const hasSourceDetails = true;

  const steps = range.valueRecipe?.steps ?? [];
  const primaryStep = getRangeValuePrimaryStep(steps);
  const valueRecipeSource = range.valueRecipe?.source ?? getRangeValueFallbackSource(range, valueSourceType, inputSource, rangeTextSource);
  const primaryContext = createRangeValueStepContext('range', 0, inputColumns, isColumnTextPickerOpen ? 'pickColumnText' : undefined);
  const primaryPolicyStep = getStepWithRangeValueSource(primaryStep, valueRecipeSource, primaryContext, steps.length > 0);
  const primaryMode = getRangeValueStepMode(primaryPolicyStep);
  const visibleTextAction = getConfiguredRangeValueAction(primaryPolicyStep, primaryContext);

  useEffect(() => {
    setIsColumnTextPickerOpen(false);
  }, [range.id]);

  const textSourceActionFields = (
    <>
      {isColumnTextPickerOpen ? (
        <ColumnTextPicker
          inputColumns={inputColumns}
          rows={manualRangeRows}
          value={getManualRangeFixedTextValue(range)}
          onSelect={onFixedTextChange}
        />
      ) : valueSourceType === 'input' ? (
        <Dropdown
          className="compact manualRangeValueDetailField"
          label="Columna de entrada"
          value={inputSource.inputColumnId}
          options={inputColumnOptions}
          scrollStrategy="close"
          onChange={onInputColumnChange}
        />
      ) : valueSourceType === 'rangeText' ? (
        <>
          <Dropdown
            className="compact manualRangeValueDetailField"
            label="Buscar textos en"
            value={rangeTextSource.inputColumnId}
            options={inputColumnOptions}
            scrollStrategy="close"
            onChange={(inputColumnId) => onRangeTextChange({ inputColumnId })}
          />
          <Dropdown
            className="compact manualRangeValueDetailField"
            label="Texto encontrado"
            labelInfo={noRangeTextWarning ? <WarningTooltip content={noRangeTextWarning} /> : undefined}
            value={rangeTextSource.selectedText}
            options={hasNoRangeTextOptions
              ? [{ value: '', label: invalidPickerValuesLabel, disabled: true }]
              : selectedTextOptions.map((text) => ({ value: text, label: text }))}
            disabled={hasNoRangeTextOptions}
            searchable
            searchPlaceholder="Buscar texto"
            scrollStrategy="close"
            onChange={(selectedText) => onRangeTextChange({ selectedText })}
          />
          {rangeTextHelpText && !hasNoRangeTextOptions && rangeTextHelpText !== 'No se encontraron textos en este rango.' ? (
            <div className="textSourceHelperRow">
              <p className="manualRangeValueHelp">{rangeTextHelpText}</p>
            </div>
          ) : null}
        </>
      ) : valueSourceType === 'fixedText' ? (
        <label className="field compact manualRangeValueDetailField">
          <span>Texto</span>
          <input
            value={getManualRangeFixedTextValue(range)}
            onChange={(event) => onFixedTextChange(event.target.value)}
          />
        </label>
      ) : null}
    </>
  );
  const sourceFields = getRangeValueSourceFields({
    mode: primaryMode,
    primaryStep: primaryPolicyStep,
    source: valueRecipeSource,
    context: primaryContext,
    textActionValue: visibleTextAction,
    textSourceActionFields,
    inputColumns,
    manualRangeRows,
    onSourceChange,
  });

  return (
    <div className="manualRangeValueFields">
      <RangeValueStepsEditor
        steps={steps}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        range={range}
        sourceFields={sourceFields}
        hasSourceDetails={hasSourceDetails}
        sourceForPrimary={valueRecipeSource}
        sourceActionOverride={isColumnTextPickerOpen ? 'pickColumnText' : undefined}
        contextKind="range"
        onTextSourceAction={(action, _nextPrimaryStep, nextSteps) => {
          setIsColumnTextPickerOpen(action === 'pickColumnText');
          onSourceAndStepsChange(getRangeValueSourceForTextAction(action, range, inputColumns), nextSteps);
          return true;
        }}
        onTextActionClear={() => {
          setIsColumnTextPickerOpen(false);
        }}
        showAdditionalStepsHeader={false}
        onChange={onStepsChange}
      />
    </div>
  );
}

function getRangeValuePrimaryStep(steps: TransformStep[]) {
  return steps.find((step) => step.type !== 'manualRange') ?? { id: rangeValuePrimaryStepId, mode: 'text' as const, type: 'noop' as const };
}

function getRangeValueSourceFields({
  mode,
  primaryStep,
  source,
  context,
  textActionValue,
  textSourceActionFields,
  inputColumns,
  manualRangeRows,
  onSourceChange,
}: {
  mode: Exclude<TransformStepMode, 'manualRange'>;
  primaryStep: TransformStep;
  source: StepSource;
  context: StepEditorContext;
  textActionValue?: RangeValueTextAction;
  textSourceActionFields: ReactNode;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onSourceChange: (source: StepSource) => void;
}) {
  if (mode === 'text' && primaryStep.type === 'noop') {
    return textActionValue && isStepSourceAction(textActionValue) && getAllowedSourceActions(primaryStep, context).includes(textActionValue)
      ? textSourceActionFields
      : null;
  }

  if (mode === 'number') {
    return (
      <StepSourceFields
        label="Qué valor usar"
        source={getTypedRangeValueSource(source)}
        inputColumns={inputColumns}
        inputRows={manualRangeRows}
        allowPreviousResult={false}
        fixedTextInputType="number"
        fixedTextInputLabel="Valor fijo"
        valueKind="number"
        onChange={onSourceChange}
      />
    );
  }

  if (mode === 'date') {
    return (
      <StepSourceFields
        label="Qué fecha usar"
        source={getTypedRangeValueSource(source)}
        inputColumns={inputColumns}
        inputRows={manualRangeRows}
        allowPreviousResult={false}
        fixedTextInputType="date"
        fixedTextInputLabel="Fecha fija"
        valueKind="date"
        onChange={onSourceChange}
      />
    );
  }

  return (
    <StepSourceFields
      label="Qué texto usar"
      source={source}
      inputColumns={inputColumns}
      inputRows={manualRangeRows}
      allowPreviousResult={false}
      explicitTextValueSource
      valueKind="text"
      onChange={onSourceChange}
    />
  );
}

function getTypedRangeValueSource(source: StepSource): StepSource {
  if (source.type === 'input' || source.type === 'fixedText') {
    return source;
  }

  return { type: 'fixedText', value: '' };
}

function getRangeValueSourceForTextAction(action: StepSourceAction, range: ManualRangeValue, inputColumns: InputColumn[]): StepSource {
  const context = createRangeValueStepContext('range', 0, inputColumns);

  if (action === 'useInputColumn') {
    return {
      ...createCanonicalSourceForAction(action, context),
      type: 'input',
      inputColumnId: getManualRangeInputSource(range).inputColumnId || inputColumns[0]?.id || '',
    };
  }

  if (action === 'useRangeText') {
    const rangeTextSource = getManualRangeRangeTextSource(range);
    return {
      ...createCanonicalSourceForAction(action, context),
      type: 'rangeText',
      inputColumnId: rangeTextSource.inputColumnId || inputColumns[0]?.id || '',
      selectedText: rangeTextSource.selectedText,
    };
  }

  if (action === 'useFixedText' || action === 'pickColumnText') {
    return { type: 'fixedText', value: getManualRangeFixedTextValue(range) };
  }

  return createCanonicalSourceForAction(action, context);
}

export function getRangeValueSourceDropdownOptions(inputColumns: InputColumn[]) {
  return [
    ...manualRangeValueSourceOptions.filter((option) => option.value !== 'input' && option.value !== 'fixedText'),
    { value: 'columnTextPicker' as const, label: pickColumnTextLabel },
    ...inputColumns.map((inputColumn) => ({ value: `input:${inputColumn.id}` as const, label: getInputColumnLabel(inputColumn) })),
  ];
}

export function getRangeValueSourceSelection(value: Exclude<RangeValueSourceDropdownValue, 'columnTextPicker'>): RangeValueSourceSelection {
  if (value === 'fixedText' || value === 'rangeText' || value === 'input') {
    return { type: 'valueSourceType', value };
  }

  return { type: 'inputColumn', inputColumnId: value.slice('input:'.length) };
}

function RangeValueStepsEditor({
  steps,
  inputColumns,
  manualRangeRows,
  range,
  sourceFields,
  hasSourceDetails = false,
  sourceForPrimary,
  sourceActionOverride,
  contextKind = 'range',
  onTextSourceAction,
  onTextActionClear,
  allowConcat = true,
  showAdditionalStepsHeader = true,
  onChange,
}: {
  steps: TransformStep[];
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  range?: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>;
  sourceFields?: ReactNode;
  hasSourceDetails?: boolean;
  sourceForPrimary?: StepSource;
  sourceActionOverride?: StepSourceAction;
  contextKind?: StepEditorContextKind;
  onTextSourceAction?: (action: StepSourceAction, nextPrimaryStep: TransformStep, nextSteps: TransformStep[]) => boolean | void;
  onTextActionClear?: () => void;
  allowConcat?: boolean;
  showAdditionalStepsHeader?: boolean;
  onChange: (steps: TransformStep[]) => void;
}) {
  const primaryStepIndex = contextKind === 'rangeConcat' ? 1 : 0;
  const safeSteps = steps
    .filter((step) => step.type !== 'manualRange' && (allowConcat || step.type !== 'concat'))
    .map((step, index) => normalizeRangeValueStep(step, createRangeValueStepContext(contextKind, index + primaryStepIndex, inputColumns)));
  const primaryStep = safeSteps[0] ?? { id: rangeValuePrimaryStepId, mode: 'text' as const, type: 'noop' as const };
  const primaryContext = createRangeValueStepContext(contextKind, primaryStepIndex, inputColumns, sourceActionOverride);
  const primaryPolicyStep = getStepWithRangeValueSource(primaryStep, sourceForPrimary, primaryContext, contextKind === 'rangeConcat' || safeSteps.length > 0);
  const hasVisiblePrimaryAction = isVisibleStepActionConfigured(primaryPolicyStep, primaryContext);
  const additionalSteps = safeSteps.slice(1);
  const updatePrimaryStep = (step: TransformStep) => {
    const normalizedStep = normalizeRangeValueStep(step, createRangeValueStepContext(contextKind, primaryStepIndex, inputColumns));
    const shouldKeepImplicitNoop = safeSteps.length === 0 && normalizedStep.mode === 'text' && normalizedStep.type === 'noop';

    onChange(shouldKeepImplicitNoop ? [] : [normalizedStep, ...additionalSteps]);
  };
  const addStep = () => onChange(appendRangeValueStep(safeSteps, createRangeValueStepContext(contextKind, safeSteps.length + primaryStepIndex, inputColumns)));
  const updateStep = (stepId: string, patch: Partial<TransformStep>) => {
    onChange(safeSteps.map((step, index) => (step.id === stepId ? normalizeRangeValueStep({ ...step, ...patch }, createRangeValueStepContext(contextKind, index + primaryStepIndex, inputColumns)) : step)));
  };
  const deleteStep = (stepId: string) => onChange(safeSteps.filter((step) => step.id !== stepId));
  const isPrimaryConcat = primaryStep.type === 'concat';
  const shouldShowAdditionalStepControls = showAdditionalStepsHeader && !isPrimaryConcat;
  const primaryEditor = (
    <div className="rangeValuePrimaryLayout">
      <div className="rangeValuePrimaryControls">
        <RangeValueStepControls
          step={primaryPolicyStep}
          context={primaryContext}
          onTextSourceAction={onTextSourceAction
            ? (action, nextPrimaryStep) => {
              const nextStoredStep = stripPrimarySource(nextPrimaryStep);
              return onTextSourceAction(action, nextStoredStep, [nextStoredStep, ...additionalSteps]);
            }
            : undefined}
          onTextActionClear={onTextActionClear}
          onChange={updatePrimaryStep}
        />
      </div>
      {isPrimaryConcat || !hasVisiblePrimaryAction ? null : (
        <div className="rangeValueSourceControls">
          {sourceFields}
        </div>
      )}
      <div className="rangeValuePrimaryStepFields">
        {!hasVisiblePrimaryAction || primaryPolicyStep.type === 'noop' ? null : (
          <RangeValueStepFields
            step={primaryStep}
            inputColumns={inputColumns}
            manualRangeRows={manualRangeRows}
            range={range}
            onChange={(patch) => updatePrimaryStep({ ...primaryStep, ...patch })}
          />
        )}
      </div>
      {!showAdditionalStepsHeader && !isPrimaryConcat ? (
        <StepConditionFields
          step={primaryStep}
          inputColumns={inputColumns}
          onChange={(patch) => updatePrimaryStep({ ...primaryStep, ...patch })}
        />
      ) : null}
      {!showAdditionalStepsHeader && !isPrimaryConcat ? (
        <div className="concatPartStepsActions">
          <ActionButton action="add" variant="secondary" className="constructorAddStepButton" onClick={addStep}>Agregar paso</ActionButton>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="rangeValueTransforms">
      {showAdditionalStepsHeader ? (
        <div className={`rangeValueOperationPanel${hasSourceDetails && !isPrimaryConcat ? ' hasSourceDetails' : ''}`}>
          {primaryEditor}
        </div>
      ) : (
        <div className="stepDetailPanel">
          <div className="stepCardHeader">
            <strong>Paso 1 · {getRangeValueStepTitle(primaryPolicyStep, primaryContext)}</strong>
            <span aria-hidden="true" />
          </div>
          <div className="simpleCustomValueGrid">
            {primaryEditor}
          </div>
        </div>
      )}

      {shouldShowAdditionalStepControls ? (
        <div className="sectionHeader compact rangeValueAdditionalHeader">
          <div>
            <strong>Pasos adicionales</strong>
            <p className="muted">{additionalSteps.length === 0 ? 'Sin pasos adicionales.' : `${additionalSteps.length} configurado${additionalSteps.length === 1 ? '' : 's'}.`}</p>
          </div>
          <ActionButton action="add" variant="secondary" onClick={addStep}>Agregar paso</ActionButton>
        </div>
      ) : null}

      {additionalSteps.length > 0 ? (
        <div className="concatPartTransformList">
          {additionalSteps.map((step, index) => (
            <div key={step.id} className={showAdditionalStepsHeader ? undefined : 'concatPartStepDivider'}>
              <RangeValueStepEditor
                step={step}
                index={index}
                stepNumber={showAdditionalStepsHeader ? undefined : index + 2}
                inputColumns={inputColumns}
                manualRangeRows={manualRangeRows}
                range={range}
                context={createRangeValueStepContext(contextKind, index + 1 + primaryStepIndex, inputColumns)}
                onChange={(patch) => updateStep(step.id, patch)}
                onDelete={() => deleteStep(step.id)}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RangeValueStepControls({
  step,
  context,
  onTextSourceAction,
  onTextActionClear,
  onChange,
}: {
  step: TransformStep;
  context: StepEditorContext;
  onTextSourceAction?: (action: StepSourceAction, nextPrimaryStep: TransformStep) => boolean | void;
  onTextActionClear?: () => void;
  onChange: (step: TransformStep) => void;
}) {
  const mode = getRangeValueStepMode(step);
  const actionValue = getVisibleStepAction(step, context);
  const stepId = step.id === rangeValuePrimaryStepId ? crypto.randomUUID() : step.id;

  return (
    <>
      <Dropdown<Exclude<TransformStepMode, 'manualRange'>>
        className="compact"
        label={operationTypeLabel}
        value={mode}
        options={getRangeValueModeOptions(context)}
        scrollStrategy="close"
        onChange={(nextMode) => {
          onTextActionClear?.();
          onChange(createRangeValueStep(nextMode, { ...context, idFactory: () => stepId }));
        }}
      />
      <Dropdown<RangeValueTextAction>
        className="compact"
        label="Qué quiero hacer"
        value={actionValue === 'unconfigured' ? '' : actionValue}
        placeholder="Seleccionar acción"
        options={getRangeValueActionOptions(mode, context)}
        scrollStrategy="close"
        onChange={(type) => {
          if (onTextSourceAction && isStepSourceAction(type)) {
            const nextStep = replaceStepActionWithSource({ ...step, id: stepId }, type, context);
            const handled = onTextSourceAction(type, nextStep);
            if (!handled) {
              onChange(nextStep);
            }
            return;
          }

          onTextActionClear?.();
          onChange(createRangeValueStepForAction(mode, type, { ...context, idFactory: () => stepId }));
        }}
      />
    </>
  );
}

export function isRangeValueTextSourceAction(value: RangeValueTextAction): value is StepSourceAction {
  return isStepSourceAction(value);
}

function RangeValueStepEditor({
  step,
  index,
  stepNumber,
  inputColumns,
  manualRangeRows,
  range,
  context,
  onChange,
  onDelete,
}: {
  step: TransformStep;
  index: number;
  stepNumber?: number;
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  range?: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>;
  context: StepEditorContext;
  onChange: (patch: Partial<TransformStep>) => void;
  onDelete: () => void;
}) {
  const mode = getRangeValueStepMode(step);
  const actionValue = getVisibleStepAction(step, context);
  const safeAction = actionValue === 'unconfigured' ? getRangeValueActionOptions(mode, context)[0]?.value ?? 'useValueAsIs' : actionValue;
  const safeStep = actionValue === 'unconfigured'
    ? createRangeValueStepForAction(mode, safeAction, { ...context, idFactory: () => step.id })
    : step;
  const title = stepNumber
    ? `Paso ${stepNumber} · ${getRangeValueStepTitle(safeStep, context)}`
    : `Paso adicional ${index + 1}`;

  return (
    <div className="stepDetailPanel">
      <div className="stepCardHeader">
        <strong>{title}</strong>
        <DeleteButton title="Eliminar paso" onClick={onDelete} />
      </div>
      <div className="simpleCustomValueGrid">
        <Dropdown<Exclude<TransformStepMode, 'manualRange'>>
          className="compact"
          label={operationTypeLabel}
          value={mode}
          options={getRangeValueModeOptions(context)}
          scrollStrategy="close"
          onChange={(nextMode) => onChange(createRangeValueStep(nextMode, { ...context, idFactory: () => step.id }))}
        />
        <Dropdown<RangeValueTextAction>
          className="compact"
          label="Qué quiero hacer"
          value={safeAction}
          options={getRangeValueAdditionalActionOptions(mode, context)}
          scrollStrategy="close"
          onChange={(type) => onChange(createRangeValueStepForAction(mode, type, { ...context, idFactory: () => step.id }))}
        />
        <RangeValueStepFields
          step={safeStep}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          range={range}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function RangeValueStepFields({
  step,
  inputColumns,
  manualRangeRows = [],
  range,
  onChange,
}: {
  step: TransformStep;
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  range?: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>;
  onChange: (patch: Partial<TransformStep>) => void;
}) {
  if (step.type === 'addPrefix' || step.type === 'addSuffix' || step.type === 'removeText') {
    return (
      <label className="field compact">
        <span>{step.type === 'addPrefix' ? 'Prefijo' : step.type === 'addSuffix' ? 'Sufijo' : 'Texto a quitar'}</span>
        <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
      </label>
    );
  }

  if (step.type === 'replaceText') {
    return (
      <>
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
    return (
      <>
        <Dropdown<NumericOperation>
          className="compact"
          label="Operación"
          value={step.operation ?? 'add'}
          options={numericOperationOptions}
          scrollStrategy="close"
          onChange={(operation) => onChange({ operation })}
        />
        <label className="field compact">
          <span>Valor</span>
          <input type="number" step="any" value={step.amount ?? 0} onChange={(event) => onChange({ amount: Number(event.target.value) })} />
        </label>
      </>
    );
  }

  if (step.type === 'formatDate') {
    return (
      <>
        <Dropdown
          className="compact"
          label="Formato de entrada"
          value={step.dateInputFormat ?? defaultDateInputFormat}
          options={supportedDateInputFormats.map((format) => ({ value: format, label: format }))}
          scrollStrategy="close"
          onChange={(dateInputFormat) => onChange({ dateInputFormat })}
        />
        <Dropdown
          className="compact"
          label="Formato de salida"
          value={step.dateOutputFormat ?? defaultDateOutputFormat}
          options={supportedDateOutputFormats.map((format) => ({ value: format, label: format }))}
          scrollStrategy="close"
          onChange={(dateOutputFormat) => onChange({ dateOutputFormat })}
        />
      </>
    );
  }

  if (step.type === 'concat') {
    return (
      <RangeValueConcatEditor
        parts={step.parts ?? createDefaultRangeValueConcatParts()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        range={range}
        onChange={(parts) => onChange({ parts })}
      />
    );
  }

  return <p className="manualRangeValueHelp">Usa el valor tal cual.</p>;
}

function RangeValueConcatEditor({
  parts,
  inputColumns,
  manualRangeRows,
  range,
  onChange,
}: {
  parts: ConcatPart[];
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  range?: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>;
  onChange: (parts: ConcatPart[]) => void;
}) {
  const safeParts = parts.length > 0 ? parts : createDefaultRangeValueConcatParts();
  const [selectedPartId, setSelectedPartId] = useState(safeParts[0]?.id ?? '');
  const [columnTextPickerPartId, setColumnTextPickerPartId] = useState<string | null>(null);
  const safeSelectedPartId = safeParts.some((part) => part.id === selectedPartId) ? selectedPartId : safeParts[0]?.id ?? '';
  const selectedPart = safeParts.find((part) => part.id === safeSelectedPartId);
  const selectedPartIndex = selectedPart ? safeParts.findIndex((part) => part.id === selectedPart.id) : -1;
  const updatePart = (partId: string, patch: Partial<ConcatPart>) => {
    onChange(safeParts.map((part) => (part.id === partId ? { ...part, ...patch } : part)));
  };
  const addPart = () => {
    const nextPart = { id: crypto.randomUUID(), source: { type: 'input' as const, inputColumnId: '' } };
    setSelectedPartId(nextPart.id);
    onChange([
      ...safeParts,
      nextPart,
    ]);
  };
  const deletePart = (partId: string) => {
    if (safeParts.length <= 1) {
      return;
    }

    const nextParts = safeParts.filter((part) => part.id !== partId);
    setSelectedPartId(nextParts[Math.max(0, safeParts.findIndex((part) => part.id === partId) - 1)]?.id ?? nextParts[0]?.id ?? '');
    onChange(nextParts);
  };

  return (
    <div className="composeStudio composeStudioFlat rangeValueComposeStudio">
      <section className="recipeStudioSection recipeStudioSectionLight composePartsBuilder" aria-label="Editor de partes">
        <div className="composePartsBuilderHeader">
          <div className="composePartsBuilderTitle">
            <strong>Editor de partes</strong>
            <p className="composeStudioHint">Arrastrá las partes para cambiar el orden.</p>
          </div>
          <div className="composeStudioActions">
            <div className="composeStudioAddActions">
              <ActionButton action="add" variant="secondary" className="composeStudioActionButton" onClick={addPart}>
                {addPartLabel}
              </ActionButton>
            </div>
          </div>
        </div>

        <div className="compositionTokenList" aria-label="Partes de combinación">
          <SortableList
            items={safeParts}
            axis="horizontal"
            handleLabel="Arrastrar parte"
            onChange={onChange}
            renderItem={(part, handle) => {
              const index = safeParts.findIndex((item) => item.id === part.id);
              const kind = getRangeValueCompositionTokenKind(part);
              const selected = part.id === safeSelectedPartId;

              return (
                <div className="compositionTokenSlot">
                  {index > 0 ? <span className="compositionJoiner">{part.separatorBefore ? JSON.stringify(part.separatorBefore) : '+'}</span> : null}
                  <div className={`compositionTokenCard compositionToken-${kind}${selected ? ' selected' : ' unselected'}`}>
                    {handle}
                    <button type="button" className={`compositionToken compositionToken-${kind}${selected ? ' selected' : ''}`} aria-pressed={selected} onClick={() => setSelectedPartId(part.id)}>
                      <span>Parte {index + 1}</span>
                      <small>{describeRangeValueConcatPartSource(part, inputColumns)}</small>
                    </button>
                    <div className="compositionTokenActions">
                      {safeParts.length > 1 ? (
                        <InfoTooltip content="Eliminar parte">
                          <DeleteButton title="Eliminar parte" onClick={() => deletePart(part.id)} />
                        </InfoTooltip>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </div>
      </section>

      {selectedPart ? (
        <section className="recipeStudioSection composeTokenInspector composeTokenInspectorFlat">
          <div className="composeTokenInspectorHeader">
            <span>Parte seleccionada</span>
            <strong>Parte {selectedPartIndex + 1}</strong>
          </div>
          <div className="composeTokenFields">
            <div className="composePartTechnicalEditor composePartTechnicalEditorFlat">
                <RangeValueStepsEditor
                  steps={selectedPart.steps ?? []}
                  inputColumns={inputColumns}
                  manualRangeRows={manualRangeRows}
                  range={range}
                  sourceFields={getRangeValueConcatPartSourceFields({
                    part: selectedPart,
                    inputColumns,
                    manualRangeRows,
                    range,
                    columnTextPickerOpen: columnTextPickerPartId === selectedPart.id,
                    onChange: (source) => updatePart(selectedPart.id, { source }),
                  })}
                  sourceForPrimary={selectedPart.source}
                  sourceActionOverride={columnTextPickerPartId === selectedPart.id ? 'pickColumnText' : undefined}
                  contextKind="rangeConcat"
                  onTextSourceAction={(action, nextPrimaryStep) => {
                    setColumnTextPickerPartId(action === 'pickColumnText' ? selectedPart.id : null);
                    const source: StepSource = action === 'usePreviousResult'
                      ? { type: 'previousResult' }
                      : action === 'useInputColumn'
                        ? { type: 'input', inputColumnId: selectedPart.source.type === 'input' ? selectedPart.source.inputColumnId : inputColumns[0]?.id ?? '' }
                        : action === 'useRangeText'
                          ? getRangeValueConcatPartRangeTextSource(selectedPart.source, inputColumns)
                          : selectedPart.source.type === 'fixedText'
                            ? selectedPart.source
                            : { type: 'fixedText', value: '' };
                    updatePart(selectedPart.id, { source, steps: [nextPrimaryStep, ...(selectedPart.steps ?? []).slice(1)] });
                    return true;
                  }}
                  allowConcat={false}
                  showAdditionalStepsHeader={false}
                  onChange={(steps) => updatePart(selectedPart.id, normalizeRangeValueConcatPartPatch(selectedPart, steps))}
                />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function getRangeValueConcatPartSourceFields({
  part,
  inputColumns,
  manualRangeRows,
  range,
  columnTextPickerOpen,
  onChange,
}: {
  part: ConcatPart;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  range?: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>;
  columnTextPickerOpen: boolean;
  onChange: (source: StepSource) => void;
}) {
  const primaryStep = part.steps?.[0] ?? { id: rangeValuePrimaryStepId, mode: 'text' as const, type: 'noop' as const };
  const mode = getRangeValueStepMode(primaryStep);
  if (mode === 'number' || mode === 'date') {
    return (
      <StepSourceFields
        label={mode === 'number' ? 'Qué valor usar' : 'Qué fecha usar'}
        source={part.source}
        inputColumns={inputColumns}
        inputRows={manualRangeRows}
        allowPreviousResult={false}
        fixedTextInputType={mode === 'number' ? 'number' : 'date'}
        fixedTextInputLabel={mode === 'number' ? 'Valor fijo' : 'Fecha fija'}
        valueKind={mode}
        onChange={onChange}
      />
    );
  }

  return (
    <RangeValueConcatPartSourceFields
      source={part.source}
      inputColumns={inputColumns}
      manualRangeRows={manualRangeRows}
      range={range}
      hideSourceSelector
      columnTextPickerOpen={columnTextPickerOpen}
      onChange={onChange}
    />
  );
}

function normalizeRangeValueConcatPartPatch(part: ConcatPart, steps: TransformStep[]): Partial<ConcatPart> {
  const primaryStep = steps[0];
  const mode = primaryStep ? getRangeValueStepMode(primaryStep) : 'text';

  if ((mode === 'number' || mode === 'date') && part.source.type !== 'fixedText') {
    return { steps, source: { type: 'fixedText', value: '' } };
  }

  return { steps };
}

function RangeValueConcatPartSourceFields({
  source,
  inputColumns,
  manualRangeRows,
  range,
  hideFixedTextInput = false,
  hideSourceSelector = false,
  columnTextPickerOpen = false,
  onChange,
}: {
  source: StepSource;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  range?: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>;
  hideFixedTextInput?: boolean;
  hideSourceSelector?: boolean;
  columnTextPickerOpen?: boolean;
  onChange: (source: StepSource) => void;
}) {
  const [isColumnTextPickerOpen, setIsColumnTextPickerOpen] = useState(false);
  const effectiveColumnTextPickerOpen = columnTextPickerOpen || isColumnTextPickerOpen;
  const sourceValue = effectiveColumnTextPickerOpen ? 'columnTextPicker' : getConcatPartSourceDropdownValue(source);
  const rangeTextSource = getRangeValueConcatPartRangeTextSource(source, inputColumns);
  const selectedTextOptions = range
    ? getManualRangeSelectedTextOptions(manualRangeRows, range, rangeTextSource)
    : [];
  const rangeTextHelpText = range
    ? getManualRangeRangeTextHelpText(manualRangeRows, range, rangeTextSource)
    : '';
  const hasNoRangeTextOptions = selectedTextOptions.length === 0;
  const noRangeTextWarning = hasNoRangeTextOptions
    ? getInvalidPickerTooltip(rangeTextHelpText || 'Sin textos en el rango')
    : '';
  const inputColumnOptions = inputColumns.length === 0
    ? [{ value: '', label: noActiveColumnsLabel }]
    : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }));

  return (
    <>
      {!hideSourceSelector ? <Dropdown<RangeValueConcatPartSourceDropdownValue>
        className="compact manualRangeValueSourceField"
        label={valueSourceLabel}
        value={sourceValue}
        options={getRangeValueConcatPartSourceDropdownOptions(inputColumns)}
        scrollStrategy="close"
        onChange={(value) => {
          if (value === 'columnTextPicker') {
            setIsColumnTextPickerOpen(true);
            return;
          }

          setIsColumnTextPickerOpen(false);
          onChange(getConcatPartSourceFromDropdownValue(value, source));
        }}
      /> : null}
      {effectiveColumnTextPickerOpen ? (
        <ColumnTextPicker
          inputColumns={inputColumns}
          rows={manualRangeRows}
          value={source.type === 'fixedText' ? source.value : ''}
          onSelect={(value) => onChange(createFixedTextSourceFromColumnText(value))}
        />
      ) : hideSourceSelector && source.type === 'input' ? (
        <Dropdown
          className="compact manualRangeValueDetailField"
          label="Columna de entrada"
          value={source.inputColumnId}
          options={inputColumnOptions}
          scrollStrategy="close"
          onChange={(inputColumnId) => onChange({ type: 'input', inputColumnId })}
        />
      ) : source.type === 'fixedText' && !hideFixedTextInput ? (
        <label className="field compact manualRangeValueDetailField">
          <span>Texto fijo</span>
          <input value={source.value} onChange={(event) => onChange({ type: 'fixedText', value: event.target.value })} />
        </label>
      ) : null}
      {source.type === 'rangeText' ? (
        <>
          <Dropdown
            className="compact manualRangeValueDetailField"
            label="Buscar textos en"
            value={rangeTextSource.inputColumnId}
            options={inputColumnOptions}
            scrollStrategy="close"
            onChange={(inputColumnId) => onChange({ ...rangeTextSource, inputColumnId })}
          />
          <Dropdown
            className="compact manualRangeValueDetailField"
            label="Texto encontrado"
            labelInfo={noRangeTextWarning ? <WarningTooltip content={noRangeTextWarning} /> : undefined}
            value={rangeTextSource.selectedText}
            options={hasNoRangeTextOptions
              ? [{ value: '', label: invalidPickerValuesLabel, disabled: true }]
              : selectedTextOptions.map((text) => ({ value: text, label: text }))}
            disabled={hasNoRangeTextOptions}
            searchable
            searchPlaceholder="Buscar texto"
            scrollStrategy="close"
            onChange={(selectedText) => onChange({ ...rangeTextSource, selectedText })}
          />
          {rangeTextHelpText && !hasNoRangeTextOptions && rangeTextHelpText !== 'No se encontraron textos en este rango.' ? (
            <div className="textSourceHelperRow">
              <p className="manualRangeValueHelp">{rangeTextHelpText}</p>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}

export function getRangeValueConcatPartSourceDropdownOptions(inputColumns: InputColumn[]) {
  return [
    { value: 'previousResult' as const, label: 'Resultado anterior' },
    { value: 'columnTextPicker' as const, label: pickColumnTextLabel },
    { value: 'rangeText' as const, label: 'Texto encontrado en el rango' },
    ...inputColumns.map((inputColumn) => ({ value: `input:${inputColumn.id}` as const, label: getInputColumnLabel(inputColumn) })),
  ];
}

function getRangeValueConcatPartRangeTextSource(source: StepSource, inputColumns: InputColumn[]): Extract<StepSource, { type: 'rangeText' }> {
  return source.type === 'rangeText'
    ? source
    : { type: 'rangeText', inputColumnId: inputColumns[0]?.id ?? '', selectedText: '' };
}

function describeRangeValueConcatPartSource(part: ConcatPart, inputColumns: InputColumn[]) {
  const { source } = part;

  if (source.type === 'previousResult') {
    return 'Resultado anterior';
  }

  if (source.type === 'fixedText') {
    return `Texto fijo "${source.value || ''}"`;
  }

  if (source.type === 'rangeText') {
    return source.selectedText ? `Texto encontrado "${source.selectedText}"` : 'Texto encontrado en el rango';
  }

  const inputColumn = inputColumns.find((column) => column.id === source.inputColumnId);
  return inputColumn ? getInputColumnLabel(inputColumn) : 'Sin configurar';
}

function getRangeValueCompositionTokenKind(part: ConcatPart) {
  if ((part.steps ?? []).length > 0) {
    return 'advanced';
  }

  if (part.source.type === 'previousResult') {
    return 'previous';
  }

  if (part.source.type === 'fixedText') {
    return 'text';
  }

  return 'input';
}

function createRangeValueStep(
  mode: Exclude<TransformStepMode, 'manualRange'> = 'text',
  context: StepEditorContext = { kind: 'range', stepIndex: 0 },
): TransformStep {
  return normalizeRangeValueStep(createCanonicalStepForMode(mode, context), context);
}

function createRangeValueStepForAction(
  mode: Exclude<TransformStepMode, 'manualRange'>,
  action: RangeValueTextAction,
  context: StepEditorContext,
): TransformStep {
  return normalizeRangeValueStep(createCanonicalStepForAction(mode, action, context), context);
}

function normalizeRangeValueStep(step: TransformStep, context: StepEditorContext): TransformStep {
  const normalizedStep = normalizeStepForContext(step, context);

  if (normalizedStep.type === 'manualRange') {
    return createRangeValueStep('text', { ...context, idFactory: () => normalizedStep.id });
  }

  return normalizedStep;
}

export function createDefaultRangeValueConcatParts(): ConcatPart[] {
  return [
    { id: crypto.randomUUID(), source: { type: 'input', inputColumnId: '' } },
  ];
}

export function appendRangeValueStep(steps: TransformStep[], context: StepEditorContext = { kind: 'range', stepIndex: steps.length }): TransformStep[] {
  return steps.length === 0
    ? [createRangeValueStep('text', { ...context, stepIndex: 0 }), createRangeValueStep('text', context)]
    : [...steps, createRangeValueStep('text', context)];
}

function getConcatPartSourceDropdownValue(source: StepSource): RangeValueConcatPartSourceDropdownValue | '' {
  if (source.type === 'previousResult') {
    return 'previousResult';
  }

  if (source.type === 'fixedText') {
    return 'fixedText';
  }

  if (source.type === 'rangeText') {
    return 'rangeText';
  }

  return source.inputColumnId ? `input:${source.inputColumnId}` : '';
}

function getConcatPartSourceFromDropdownValue(value: string, currentSource: StepSource): StepSource {
  if (value === 'previousResult') {
    return { type: 'previousResult' };
  }

  if (value === 'fixedText') {
    return { type: 'fixedText', value: currentSource.type === 'fixedText' ? currentSource.value : '' };
  }

  if (value === 'rangeText') {
    return currentSource.type === 'rangeText'
      ? currentSource
      : { type: 'rangeText', inputColumnId: '', selectedText: '' };
  }

  if (value.startsWith('input:')) {
    return { type: 'input', inputColumnId: value.slice('input:'.length) };
  }

  return currentSource;
}

function getRangeValueStepMode(step: TransformStep): Exclude<TransformStepMode, 'manualRange'> {
  if (step.mode && step.mode !== 'manualRange') {
    return step.mode;
  }

  if (step.type === 'numericOperation') {
    return 'number';
  }

  if (step.type === 'extractNumber' || step.type === 'toNumber' || step.type === 'toText') {
    return 'conversion';
  }

  if (step.type === 'formatDate') {
    return 'date';
  }

  return 'text';
}

function getRangeValueStepTitle(step: TransformStep, context: StepEditorContext) {
  const actionValue = getVisibleStepAction(step, context);
  if (actionValue === 'unconfigured') {
    return 'Sin configurar';
  }

  return rangeValueActionLabels[actionValue] ?? 'Sin configurar';
}
