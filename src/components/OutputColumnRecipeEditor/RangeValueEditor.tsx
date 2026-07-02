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
import { useState } from 'react';
import type { ConcatPart, InputColumn, InputRow, ManualRangeValue, StepSource, TransformStep, TransformStepMode } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { SortableList } from '../SortableList/SortableList';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { WarningTooltip } from '../ui/WarningTooltip/WarningTooltip';
import { ColumnTextPicker, createFixedTextSourceFromColumnText, getInvalidPickerTooltip, invalidPickerValuesLabel } from './ColumnTextPicker';
import { addPartLabel, noActiveColumnsLabel, pickColumnTextLabel, useValueAsIsLabel, valueSourceLabel } from './OutputColumnRecipeEditor.constants';
import { StepSourceFields } from './OutputColumnRecipeEditor.StepFields';
import {
  createCanonicalStepForMode,
  getVisibleStepAction,
  isStepSourceAction,
  normalizeStepForContext,
  type StepEditorContext,
  type StepEditorContextKind,
  type StepSourceAction,
  type VisibleStepAction,
} from './OutputColumnRecipeEditor.stepPolicy';
import { StepEditorBlock, type StepEditorBlockFieldRenderer } from './StepEditorBlock';
import './OutputColumnRecipeEditor.recipeStudio.css';

type RangeValueEditorProps = {
  range: ManualRangeValue;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onSourceAndStepsChange: (source: StepSource, steps: TransformStep[]) => void;
  onStepsChange: (steps: TransformStep[]) => void;
};

export type RangeValueSourceDropdownValue = ManualRangeValueSourceType | 'columnTextPicker' | `input:${string}`;
export type RangeValueConcatPartSourceDropdownValue = 'previousResult' | 'fixedText' | 'rangeText' | 'columnTextPicker' | `input:${string}`;
export type RangeValueTextAction = Exclude<VisibleStepAction, 'unconfigured'>;

export type RangeValueSourceSelection =
  | { type: 'valueSourceType'; value: ManualRangeValueSourceType }
  | { type: 'inputColumn'; inputColumnId: string };

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

function getStepWithRangeValueSource(step: TransformStep, source?: StepSource, context?: StepEditorContext, forceConfiguredSource = false): TransformStep {
  if (!source || step.type !== 'noop' || step.source) {
    return step;
  }

  if (!forceConfiguredSource && !context?.sourceActionOverride && !isConfiguredRangeValueSource(source)) {
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

  if (step.mode === 'number' || step.mode === 'date') {
    return step;
  }

  if (step.source.type === 'fixedText' && step.source.value.trim() === '') {
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
  onSourceAndStepsChange,
  onStepsChange,
}: RangeValueEditorProps) {
  const valueSourceType = getManualRangeValueSourceType(range);
  const inputSource = getManualRangeInputSource(range);
  const rangeTextSource = getManualRangeRangeTextSource(range);
  const inputColumnOptions = inputColumns.length === 0
    ? [{ value: '', label: noActiveColumnsLabel }]
    : [{ value: '', label: 'Seleccionar' }, ...inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))];
  const hasSourceDetails = true;

  const steps = range.valueRecipe?.steps ?? [];
  const primaryStep = getRangeValuePrimaryStep(steps);
  const valueRecipeSource = range.valueRecipe?.source ?? getRangeValueFallbackSource(range, valueSourceType, inputSource, rangeTextSource);
  const primaryContext = createRangeValueStepContext('range', 0, inputColumns);
  const primaryPolicyStep = getStepWithRangeValueSource(primaryStep, valueRecipeSource, primaryContext, steps.length > 0);

  const renderRangeTextFields = (source: StepSource, onChange: (source: StepSource) => void) => {
    const currentSource = source.type === 'rangeText'
      ? source
      : { type: 'rangeText' as const, inputColumnId: inputColumns[0]?.id ?? '', selectedText: '' };
    const options = getManualRangeSelectedTextOptions(manualRangeRows, range, currentSource);
    const helpText = getManualRangeRangeTextHelpText(manualRangeRows, range, currentSource);
    const hasNoOptions = options.length === 0;
    const warning = hasNoOptions ? getInvalidPickerTooltip(helpText || 'Sin textos en el rango') : '';

    return (
      <>
        <Dropdown
          className="compact recipeField"
          label="Buscar textos en"
          value={currentSource.inputColumnId}
          options={inputColumnOptions}
          scrollStrategy="close"
          onChange={(inputColumnId) => onChange({ ...currentSource, inputColumnId, selectedText: '' })}
        />
        <Dropdown
          className="compact recipeField"
          label="Texto encontrado"
          labelInfo={warning ? <WarningTooltip content={warning} /> : undefined}
          value={currentSource.selectedText}
          options={hasNoOptions
            ? [{ value: '', label: invalidPickerValuesLabel, disabled: true }]
            : options.map((text) => ({ value: text, label: text }))}
          disabled={hasNoOptions}
          searchable
          searchPlaceholder="Buscar texto"
          scrollStrategy="close"
          onChange={(selectedText) => onChange({ ...currentSource, selectedText })}
        />
        {helpText && !hasNoOptions && helpText !== 'No se encontraron textos en este rango.' ? (
          <div className="textSourceHelperRow">
            <p className="manualRangeValueHelp">{helpText}</p>
          </div>
        ) : null}
      </>
    );
  };
  const renderPrimaryFields: StepEditorBlockFieldRenderer = ({ step, visibleAction, stepSource, onSourceChange, onChange }) => {
    if (visibleAction === 'useRangeText' || stepSource.type === 'rangeText') {
      return renderRangeTextFields(stepSource, onSourceChange);
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

    return undefined;
  };

  return (
    <div className="manualRangeValueFields">
      <RangeValueStepsEditor
        steps={steps}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        sourceForPrimary={valueRecipeSource}
        contextKind="range"
        fixedTextInputLabel="Texto"
        renderFields={renderPrimaryFields}
        onPrimarySourceAndStepsChange={onSourceAndStepsChange}
        showAdditionalStepsHeader={false}
        onChange={onStepsChange}
      />
    </div>
  );
}

function getRangeValuePrimaryStep(steps: TransformStep[]) {
  return steps.find((step) => step.type !== 'manualRange') ?? { id: rangeValuePrimaryStepId, mode: 'text' as const, type: 'noop' as const };
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
  sourceForPrimary,
  sourceActionOverride,
  contextKind = 'range',
  allowConcat = true,
  fixedTextInputLabel,
  renderFields,
  onPrimarySourceAndStepsChange,
  showAdditionalStepsHeader = true,
  onChange,
}: {
  steps: TransformStep[];
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  sourceForPrimary?: StepSource;
  sourceActionOverride?: StepSourceAction;
  contextKind?: StepEditorContextKind;
  allowConcat?: boolean;
  fixedTextInputLabel?: string;
  renderFields?: StepEditorBlockFieldRenderer;
  onPrimarySourceAndStepsChange?: (source: StepSource, steps: TransformStep[]) => void;
  showAdditionalStepsHeader?: boolean;
  onChange: (steps: TransformStep[]) => void;
}) {
  const primaryStepIndex = 0;
  const safeSteps = steps
    .filter((step) => step.type !== 'manualRange' && (allowConcat || step.type !== 'concat'))
    .map((step, index) => normalizeRangeValueStep(step, createRangeValueStepContext(contextKind, index + primaryStepIndex, inputColumns)));
  const primaryStep = safeSteps[0] ?? { id: rangeValuePrimaryStepId, mode: 'text' as const, type: 'noop' as const };
  const primaryContext = createRangeValueStepContext(contextKind, primaryStepIndex, inputColumns, sourceActionOverride);
  const primaryPolicyStep = getStepWithRangeValueSource(primaryStep, sourceForPrimary, primaryContext, contextKind === 'rangeConcat');
  const additionalSteps = safeSteps.slice(1);
  const updatePrimaryStep = (step: TransformStep) => {
    const nextSource = step.source ?? sourceForPrimary;
    const storedStep = stripPrimarySource(step);
    const normalizedStep = normalizeRangeValueStep(storedStep, createRangeValueStepContext(contextKind, primaryStepIndex, inputColumns));
    const nextVisibleAction = getVisibleStepAction(step, createRangeValueStepContext(contextKind, primaryStepIndex, inputColumns));
    const shouldKeepImplicitNoop = safeSteps.length === 0
      && normalizedStep.mode === 'text'
      && normalizedStep.type === 'noop'
      && nextVisibleAction === 'unconfigured';
    const nextSteps = shouldKeepImplicitNoop ? [] : [normalizedStep, ...additionalSteps];

    if (nextSource && onPrimarySourceAndStepsChange) {
      onPrimarySourceAndStepsChange(nextSource, nextSteps);
      return;
    }

    onChange(nextSteps);
  };
  const addStep = () => onChange(appendRangeValueStep(safeSteps, createRangeValueStepContext(contextKind, safeSteps.length + primaryStepIndex, inputColumns)));
  const replaceStep = (stepId: string, nextStep: TransformStep) => {
    onChange(safeSteps.map((step, index) => (step.id === stepId ? normalizeRangeValueStep(nextStep, createRangeValueStepContext(contextKind, index + primaryStepIndex, inputColumns)) : step)));
  };
  const updateStep = (stepId: string, patch: Partial<TransformStep>) => {
    onChange(safeSteps.map((step, index) => (step.id === stepId ? normalizeRangeValueStep({ ...step, ...patch }, createRangeValueStepContext(contextKind, index + primaryStepIndex, inputColumns)) : step)));
  };
  const deleteStep = (stepId: string) => onChange(safeSteps.filter((step) => step.id !== stepId));
  const isPrimaryConcat = primaryStep.type === 'concat';
  const shouldShowAdditionalStepControls = showAdditionalStepsHeader && !isPrimaryConcat;

  return (
    <div className="rangeValueTransforms">
      {showAdditionalStepsHeader ? (
        <div className={`rangeValueOperationPanel${!isPrimaryConcat ? ' hasSourceDetails' : ''}`}>
          <StepEditorBlock
            step={primaryPolicyStep}
            context={primaryContext}
            inputColumns={inputColumns}
            manualRangeRows={manualRangeRows}
            showHeader={false}
            showCondition={!isPrimaryConcat}
            fixedTextInputLabel={fixedTextInputLabel}
            renderFields={renderFields}
            onChange={(patch) => updatePrimaryStep({ ...primaryPolicyStep, ...patch })}
            onReplace={updatePrimaryStep}
          />
        </div>
      ) : (
        <StepEditorBlock
          step={primaryPolicyStep}
          context={primaryContext}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          title={`Paso 1 · ${getRangeValueStepTitle(primaryPolicyStep, primaryContext)}`}
          fixedTextInputLabel={fixedTextInputLabel}
          showCondition={!isPrimaryConcat}
          showAddStep={!isPrimaryConcat}
          renderFields={renderFields}
          onAddStep={addStep}
          onChange={(patch) => updatePrimaryStep({ ...primaryPolicyStep, ...patch })}
          onReplace={updatePrimaryStep}
        />
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
                context={createRangeValueStepContext(contextKind, index + 1 + primaryStepIndex, inputColumns)}
                onChange={(patch) => updateStep(step.id, patch)}
                onReplace={(nextStep) => replaceStep(step.id, nextStep)}
                onDelete={() => deleteStep(step.id)}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
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
  context,
  onChange,
  onReplace,
  onDelete,
}: {
  step: TransformStep;
  index: number;
  stepNumber?: number;
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  context: StepEditorContext;
  onChange: (patch: Partial<TransformStep>) => void;
  onReplace: (step: TransformStep) => void;
  onDelete: () => void;
}) {
  const title = stepNumber
    ? `Paso ${stepNumber} · ${getRangeValueStepTitle(step, context)}`
    : `Paso adicional ${index + 1}`;

  return (
    <StepEditorBlock
      step={step}
      context={context}
      inputColumns={inputColumns}
      manualRangeRows={manualRangeRows}
      title={title}
      canDelete
      onChange={onChange}
      onReplace={onReplace}
      onDelete={onDelete}
    />
  );
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
                  sourceForPrimary={selectedPart.source}
                  contextKind="rangeConcat"
                  renderFields={({ visibleAction, stepSource, onSourceChange }) => {
                    if (visibleAction !== 'useRangeText' && stepSource.type !== 'rangeText') {
                      return undefined;
                    }

                    return (
                      <RangeValueConcatPartSourceFields
                        source={stepSource.type === 'rangeText' ? stepSource : getRangeValueConcatPartRangeTextSource(selectedPart.source, inputColumns)}
                        inputColumns={inputColumns}
                        manualRangeRows={manualRangeRows}
                        range={range}
                        hideSourceSelector
                        onChange={onSourceChange}
                      />
                    );
                  }}
                  onPrimarySourceAndStepsChange={(source, steps) => updatePart(selectedPart.id, { source, steps })}
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
