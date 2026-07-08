import { useEffect, useState, type ReactNode } from 'react';
import {
  defaultDateInputFormat,
  defaultDateInvalidFallback,
  defaultDateOutputFormat,
} from '../../domain/import/dateOperations';
import { extractNumericValue, parseNumericValue } from '../../domain/import/numericOperations';
import type {
  ConversionInvalidFallback,
  DateInputFormat,
  DateInvalidFallback,
  DateOutputFormat,
  InputColumn,
  InputRow,
  NumericOperation,
  StepOperand,
  StepSource,
  TransformStep,
  TransformStepMode,
} from '../../types/import';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { WarningTooltip } from '../ui/WarningTooltip/WarningTooltip';
import { operationTypeLabel } from './OutputColumnRecipeEditor.constants';
import { getRecipeStepActionLabel, getRecipeStepModeLabel } from './OutputColumnRecipeEditor.actionDefinitions';
import {
  conversionInvalidFallbackOptions,
  dateInputFormatOptions,
  dateInvalidFallbackOptions,
  dateOutputFormatOptions,
  getNumericOperandLabels,
  numericOperationOptions,
  parseRounding,
} from './OutputColumnRecipeEditor.optionHelpers';
import { getVisibleLeftOperand, getVisibleRightOperand, shouldShowTextSourceFields } from './OutputColumnRecipeEditor.recipeHelpers';
import { StepConditionFields, StepOperandFields, StepSourceFields, getColumnCompatibilityHint, getCompatibleStepValueInputColumns, getStepActionHelpText, type PreviousResultDisplay, type StepSourceChangeContext, type StepValueSourceOptionsConfig } from './OutputColumnRecipeEditor.StepFields';
import {
  createCanonicalStepForAction,
  createCanonicalStepForMode,
  getAllowedSourceActions,
  getAllowedTextTransformerSourceActions,
  getAllowedStepActions,
  getAllowedStepModes,
  getSourceActionForTypedStepSourceAction,
  getVisibleStepAction,
  isTextTransformerAction,
  isStepSourceAction,
  isTypedStepSourceAction,
  isVisibleStepActionConfigured,
  replaceStepActionWithSource,
  type StepEditorContext,
  type StepSourceAction,
  type VisibleStepAction,
} from './OutputColumnRecipeEditor.stepPolicy';

export type StepEditorBlockFieldRenderer = (props: {
  step: TransformStep;
  context: StepEditorContext;
  stepSource: StepSource;
  visibleAction: VisibleStepAction;
  onSourceChange: (source: StepSource, changeContext?: StepSourceChangeContext) => void;
  onChange: (patch: Partial<TransformStep>) => void;
  onReplace: (step: TransformStep) => void;
}) => ReactNode;

type StepEditorBlockProps = {
  step: TransformStep;
  context: StepEditorContext;
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  inputCompatibilityRows?: InputRow[];
  title?: string;
  canDelete?: boolean;
  showHeader?: boolean;
  showCondition?: boolean;
  showAddStep?: boolean;
  className?: string;
  gridClassName?: string;
  fixedTextInputLabel?: string;
  hideTransformSourceFields?: boolean;
  uiStateKey?: string;
  previousResultPreviewValue?: string | null;
  previousResultDisplay?: PreviousResultDisplay | null;
  renderCondition?: (step: TransformStep, onChange: (patch: Partial<TransformStep>) => void) => ReactNode;
  onChange: (patch: Partial<TransformStep>) => void;
  onReplace: (step: TransformStep) => void;
  onDelete?: () => void;
  onAddStep?: () => void;
  renderFields?: StepEditorBlockFieldRenderer;
};

type BlockAction = Exclude<VisibleStepAction, 'unconfigured'> | NumericOperation;
type SourceActionOverrideState = {
  action: StepSourceAction;
  identity: string;
};

export function StepEditorBlock({
  step,
  context,
  inputColumns,
  manualRangeRows = [],
  inputCompatibilityRows,
  title,
  canDelete = false,
  showHeader = true,
  showCondition = true,
  showAddStep = false,
  className = 'stepDetailPanel',
  gridClassName = 'simpleCustomValueGrid',
  fixedTextInputLabel,
  hideTransformSourceFields = false,
  uiStateKey,
  previousResultPreviewValue,
  previousResultDisplay,
  renderCondition,
  onChange,
  onReplace,
  onDelete,
  onAddStep,
  renderFields,
}: StepEditorBlockProps) {
  const mode = getStepModeForBlock(step);
  const sourceActionOverrideIdentity = getSourceActionOverrideIdentity(step, context, mode, uiStateKey);
  const [sourceActionOverrideState, setSourceActionOverrideState] = useState<SourceActionOverrideState | undefined>(() => (
    context.sourceActionOverride ? { action: context.sourceActionOverride, identity: sourceActionOverrideIdentity } : undefined
  ));
  const sourceActionOverride = sourceActionOverrideState?.identity === sourceActionOverrideIdentity
    ? sourceActionOverrideState.action
    : context.sourceActionOverride;
  const effectiveContext = { ...context, sourceActionOverride };
  const visibleAction = getVisibleStepAction(step, effectiveContext);
  const hasVisibleAction = isVisibleStepActionConfigured(step, effectiveContext);
  const stepSource = step.source ?? createFallbackSource(mode, context);
  const actionValue = getActionDropdownValue(step, visibleAction);
  const showActionDropdown = mode !== 'manualRange';
  const fieldsClassName = step.type === 'concat'
    ? 'stepFullWidthFields'
    : 'rangeValuePrimaryStepFields rangeValueSourceControls stepExtraFieldsRow';

  useEffect(() => {
    setSourceActionOverrideState((current) => {
      if (current?.identity === sourceActionOverrideIdentity) {
        return current;
      }

      return context.sourceActionOverride
        ? { action: context.sourceActionOverride, identity: sourceActionOverrideIdentity }
        : undefined;
    });
  }, [context.sourceActionOverride, sourceActionOverrideIdentity]);

  const setScopedSourceActionOverride = (action: StepSourceAction | undefined) => {
    setSourceActionOverrideState(action ? { action, identity: sourceActionOverrideIdentity } : undefined);
  };

  const replaceStep = (nextStep: TransformStep) => {
    onReplace(nextStep);
  };
  const updateSource = (source: StepSource, changeContext?: StepSourceChangeContext) => {
    if (changeContext?.origin === 'cellValuePicker') {
      setScopedSourceActionOverride('pickColumnText');
    } else {
      setScopedSourceActionOverride(undefined);
    }

    replaceStep({ ...step, source });
  };
  const fieldRendererProps = {
    step,
    context: effectiveContext,
    stepSource,
    visibleAction,
    onSourceChange: updateSource,
    onChange,
    onReplace: replaceStep,
  };
  const fieldsContent = hasVisibleAction
    ? renderFields?.(fieldRendererProps) ?? renderDefaultFields({
      step,
      context: effectiveContext,
      visibleAction,
      stepSource,
      inputColumns,
      manualRangeRows,
      inputCompatibilityRows,
      fixedTextInputLabel,
      hideTransformSourceFields,
      previousResultPreviewValue,
      previousResultDisplay,
      sourceActionOverride,
      onSourceActionOverrideChange: setScopedSourceActionOverride,
      onSourceChange: updateSource,
      onChange,
    })
    : null;

  const body = (
    <div className="stepEditorBlock rangeValuePrimaryLayout">
      <div className="rangeValuePrimaryControls stepPrimaryFieldsRow">
        <Dropdown<TransformStepMode>
          className="compact recipeField"
          label={operationTypeLabel}
          value={mode}
          options={getStepModeOptionsForContext(effectiveContext)}
          scrollStrategy="close"
          onChange={(nextMode) => {
            setScopedSourceActionOverride(undefined);
            replaceStep(createCanonicalStepForMode(nextMode, { ...effectiveContext, idFactory: () => step.id }));
          }}
        />
        {showActionDropdown ? (
          <Dropdown<BlockAction>
            className="compact recipeField"
            label="Acción"
            labelInfo={<InfoTooltip content={getStepActionHelpText(
              step.type === 'numericOperation'
                ? step.operation ?? 'add'
                : visibleAction === 'unconfigured' ? '' : visibleAction,
              mode,
            )} />}
            value={actionValue}
            options={getStepActionOptionsForContext(mode, effectiveContext, visibleAction)}
            placeholder="Seleccionar acción"
            scrollStrategy="close"
            onChange={(action) => {
              if (isNumericOperation(action)) {
                setScopedSourceActionOverride(undefined);
                replaceStep(createNewNumericOperationStep(step.id, effectiveContext, action));
                return;
              }

              if (isStepSourceAction(action)) {
                setScopedSourceActionOverride(action === 'pickColumnText' || action === 'useInputColumn' ? action : undefined);
                replaceStep(replaceStepActionWithSource(step, action, effectiveContext));
                return;
              }

              if (isTypedStepSourceAction(action)) {
                const sourceAction = getSourceActionForTypedStepSourceAction(action);
                const nextContext = getContextWithDefaultColumnForTypedAction(action, effectiveContext, inputColumns, inputCompatibilityRows ?? manualRangeRows);
                setScopedSourceActionOverride(sourceAction === 'pickColumnText' || sourceAction === 'useInputColumn' ? sourceAction : undefined);
                replaceStep(replaceStepActionWithSource(step, action, nextContext));
                return;
              }

              setScopedSourceActionOverride(undefined);
              replaceStep(createCanonicalStepForAction(mode, action, { ...effectiveContext, idFactory: () => step.id }));
            }}
          />
        ) : null}
      </div>
      {fieldsContent ? <div className={fieldsClassName}>{fieldsContent}</div> : null}
      {showCondition ? (
        renderCondition?.(step, onChange) ?? <StepConditionFields step={step} inputColumns={inputColumns} onChange={onChange} />
      ) : null}
      {showAddStep ? (
        <div className="concatPartStepsActions">
          <ActionButton action="add" variant="secondary" className="constructorAddStepButton" onClick={onAddStep}>Agregar paso</ActionButton>
        </div>
      ) : null}
    </div>
  );

  if (!showHeader) {
    return body;
  }

  return (
    <div className={className}>
      <div className="stepCardHeader">
        <strong>{title ?? `Paso ${(context.stepIndex ?? 0) + 1}`}</strong>
        {canDelete && onDelete ? (
          <ActionButton action="delete" variant="danger" size="sm" onClick={onDelete}>
            Eliminar paso
          </ActionButton>
        ) : <span aria-hidden="true" />}
      </div>
      <div className={gridClassName}>
        {body}
      </div>
    </div>
  );
}

function renderDefaultFields({
  step,
  context,
  visibleAction,
  stepSource,
  inputColumns,
  manualRangeRows,
  inputCompatibilityRows,
  fixedTextInputLabel,
  hideTransformSourceFields,
  previousResultPreviewValue,
  previousResultDisplay,
  sourceActionOverride,
  onSourceActionOverrideChange,
  onSourceChange,
  onChange,
}: {
  step: TransformStep;
  context: StepEditorContext;
  visibleAction: VisibleStepAction;
  stepSource: StepSource;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  inputCompatibilityRows?: InputRow[];
  fixedTextInputLabel?: string;
  hideTransformSourceFields?: boolean;
  previousResultPreviewValue?: string | null;
  previousResultDisplay?: PreviousResultDisplay | null;
  sourceActionOverride?: StepSourceAction;
  onSourceActionOverrideChange: (action: StepSourceAction | undefined) => void;
  onSourceChange: (source: StepSource, changeContext?: StepSourceChangeContext) => void;
  onChange: (patch: Partial<TransformStep>) => void;
}) {
  const mode = getStepModeForBlock(step);
  const allowPreviousResult = getAllowedSourceActions(step, context).includes('usePreviousResult');
  const conversionPickerProps = step.type === 'toNumber'
    ? {
        columnTextPickerValueValidator: (value: string) => parseNumericValue(value) !== null,
        columnTextPickerEmptyLabel: 'Sin valores numéricos encontrados',
        columnTextPickerFilteredValuesHelp: 'Se omitieron textos que no se pueden convertir a número.',
      }
    : step.type === 'extractNumber'
      ? {
          columnTextPickerValueValidator: (value: string) => extractNumericValue(value) !== null,
          columnTextPickerEmptyLabel: 'Sin textos con números encontrados',
          columnTextPickerFilteredValuesHelp: 'Se omitieron textos sin números.',
        }
      : {};

  if (step.type === 'noop') {
    if (mode === 'text' && isStepSourceAction(visibleAction)) {
      return (
        <StepSourceFields
          source={stepSource}
          inputColumns={inputColumns}
          inputRows={manualRangeRows}
          inputCompatibilityRows={inputCompatibilityRows}
          allowPreviousResult={allowPreviousResult}
          previousResultPreviewValue={previousResultPreviewValue}
          previousResultDisplay={previousResultDisplay}
          fixedTextInputLabel={fixedTextInputLabel}
          hideSourceSelector
          columnTextPickerOpen={visibleAction === 'pickColumnText' || sourceActionOverride === 'pickColumnText'}
          onChange={(source, changeContext) => {
            if (changeContext?.origin === 'cellValuePicker') {
              onSourceActionOverrideChange('pickColumnText');
            }
            onSourceChange(source, changeContext);
          }}
        />
      );
    }

    if (mode === 'number' || mode === 'date') {
      const isCellPickerAction = visibleAction === 'pickNumberCell' || visibleAction === 'pickDateCell' || sourceActionOverride === 'pickColumnText';
      return (
        <StepSourceFields
          source={getTypedStepSource(stepSource)}
          inputColumns={inputColumns}
          inputRows={manualRangeRows}
          inputCompatibilityRows={inputCompatibilityRows}
          allowPreviousResult={allowPreviousResult}
          previousResultPreviewValue={previousResultPreviewValue}
          previousResultDisplay={previousResultDisplay}
          fixedTextInputType={mode === 'number' ? 'number' : 'date'}
          fixedTextInputLabel={mode === 'number' ? 'Valor fijo' : 'Fecha fija'}
          valueKind={mode}
          hideSourceSelector
          columnTextPickerOpen={isCellPickerAction}
          limitColumnTextPickerToCompatibleColumns={!isRangeEditorContext(context)}
          onChange={(source, changeContext) => {
            if (changeContext?.origin === 'cellValuePicker') {
              onSourceActionOverrideChange('pickColumnText');
            }
            onSourceChange(source, changeContext);
          }}
        />
      );
    }

    return null;
  }

  const renderTextSourceFields = (afterSourceSelector?: ReactNode) => !hideTransformSourceFields && shouldShowTextSourceFields(step.type) ? (
    <StepSourceFields
      label={getStepSourceFieldLabel(step.type)}
      source={stepSource}
      inputColumns={inputColumns}
      inputRows={manualRangeRows}
      inputCompatibilityRows={inputCompatibilityRows}
      allowPreviousResult={allowPreviousResult}
      previousResultPreviewValue={previousResultPreviewValue}
      previousResultDisplay={previousResultDisplay}
      fixedTextInputType={step.type === 'formatDate' ? 'date' : 'text'}
      fixedTextDateInputFormat={step.dateInputFormat ?? defaultDateInputFormat}
      fixedTextInputLabel={step.type === 'formatDate' ? 'Fecha fija' : 'Valor fijo'}
      valueKind={step.type === 'formatDate' ? 'date' : 'text'}
      explicitTextValueSource={step.type !== 'formatDate'}
      sourceOptionsConfig={getSourceOptionsConfigForStep(step, context)}
      labelInfoText={getStepSourceHelpText(step.type)}
      {...conversionPickerProps}
      limitColumnTextPickerToCompatibleColumns={!isRangeEditorContext(context)}
      afterSourceSelector={afterSourceSelector}
      onChange={onSourceChange}
    />
  ) : null;
  const sourceFields = renderTextSourceFields();

  if (step.type === 'addPrefix') {
    return (
      <>
        <label className="field compact recipeField">
          <span>Prefijo</span>
          <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
        </label>
        {sourceFields}
      </>
    );
  }

  if (step.type === 'addSuffix') {
    return (
      <>
        {renderTextSourceFields(
          <label className="field compact recipeField">
            <span>Sufijo</span>
            <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
          </label>,
        )}
      </>
    );
  }

  if (step.type === 'removeText') {
    return (
      <>
        {sourceFields}
        <label className="field compact recipeField">
          <span>Texto a quitar</span>
          <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
        </label>
      </>
    );
  }

  if (step.type === 'replaceText') {
    return (
      <>
        {sourceFields}
        <label className="field compact recipeField">
          <span>Texto a buscar</span>
          <input value={step.searchValue ?? ''} onChange={(event) => onChange({ searchValue: event.target.value })} />
        </label>
        <label className="field compact recipeField">
          <span>Reemplazar por</span>
          <input value={step.replaceValue ?? ''} onChange={(event) => onChange({ replaceValue: event.target.value })} />
        </label>
      </>
    );
  }

  if (step.type === 'numericOperation') {
    const leftOperand = getVisibleLeftOperand(step, stepSource);
    const rightOperand = getVisibleRightOperand(step);
    const numericInputColumns = getNumericOperandInputColumns(inputColumns, inputCompatibilityRows ?? manualRangeRows, { includeSampleValues: !inputCompatibilityRows });
    const operandLabels = getNumericOperandLabels(step.operation);
    const numericWarning = getNumericOperationUiWarning(step.operation, leftOperand, rightOperand);
    const numericCompatibilityHint = getColumnCompatibilityHint('number', inputColumns.length, numericInputColumns.length);
    const hidePreviousResultBase = (context.stepIndex ?? 0) > 0 && leftOperand.type === 'previousResult';

    return (
      <div className="numericOperationFields">
        {hidePreviousResultBase ? null : (
          <StepOperandFields
            label={operandLabels.left}
            operand={leftOperand}
            inputColumns={numericInputColumns}
            allowPreviousResult={allowPreviousResult}
            allowedTypes={getAllowedNumericBaseOperandTypes(leftOperand, context)}
            compatibilityHint={numericCompatibilityHint}
            onChange={(leftOperand) => onChange({ leftOperand })}
          />
        )}
        <StepOperandFields
          label={operandLabels.right}
          operand={rightOperand}
          inputColumns={numericInputColumns}
          allowPreviousResult={allowPreviousResult}
          compatibilityHint={numericCompatibilityHint}
          onChange={(rightOperand) => onChange({ rightOperand })}
        />
        <Dropdown
          className="compact recipeField"
          label="Decimales / redondeo"
          labelInfo={numericWarning ? <WarningTooltip content={numericWarning} /> : undefined}
          value={String(step.rounding ?? 0)}
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

  if (step.type === 'formatDate') {
    return (
      <>
        {sourceFields}
        {stepSource.type === 'fixedText' ? null : (
          <Dropdown<DateInputFormat>
            className="compact recipeField"
            label="Formato de entrada"
            value={step.dateInputFormat ?? defaultDateInputFormat}
            options={dateInputFormatOptions}
            scrollStrategy="close"
            onChange={(dateInputFormat) => onChange({ dateInputFormat })}
          />
        )}
        <Dropdown<DateOutputFormat>
          className="compact recipeField"
          label="Formato de salida"
          value={step.dateOutputFormat ?? defaultDateOutputFormat}
          options={dateOutputFormatOptions}
          scrollStrategy="close"
          onChange={(dateOutputFormat) => onChange({ dateOutputFormat })}
        />
        <Dropdown<DateInvalidFallback>
          className="compact recipeField"
          label="Si no es una fecha válida"
          value={step.dateInvalidFallback ?? defaultDateInvalidFallback}
          options={dateInvalidFallbackOptions}
          scrollStrategy="close"
          onChange={(dateInvalidFallback) => onChange({ dateInvalidFallback })}
        />
        {(step.dateInvalidFallback ?? defaultDateInvalidFallback) === 'fixedText' ? (
          <label className="field compact recipeField">
            <span>Texto si no es fecha válida</span>
            <input value={step.dateInvalidFallbackText ?? ''} onChange={(event) => onChange({ dateInvalidFallbackText: event.target.value })} />
          </label>
        ) : null}
      </>
    );
  }

  if (step.type === 'extractNumber' || step.type === 'toNumber' || step.type === 'toText') {
    if (step.type === 'toText') {
      return sourceFields;
    }

    return (
      <>
        {sourceFields}
        <Dropdown<ConversionInvalidFallback>
          className="compact recipeField"
          label="Si no se puede obtener un número"
          value={step.conversionInvalidFallback ?? 'original'}
          options={conversionInvalidFallbackOptions}
          scrollStrategy="close"
          onChange={(conversionInvalidFallback) => onChange({ conversionInvalidFallback })}
        />
        {(step.conversionInvalidFallback ?? 'original') === 'fixedText' ? (
          <label className="field compact recipeField">
            <span>Valor fallback</span>
            <input value={step.conversionInvalidFallbackText ?? ''} onChange={(event) => onChange({ conversionInvalidFallbackText: event.target.value })} />
          </label>
        ) : null}
      </>
    );
  }

  if (step.type === 'concat') {
    return null;
  }

  return sourceFields;
}

function getStepSourceFieldLabel(type: TransformStep['type']) {
  if (type === 'formatDate') {
    return 'Qué fecha usar';
  }

  if (isTextTransformerAction(type)) {
    return 'Valor base';
  }

  return 'Qué valor usar';
}

function getStepSourceHelpText(type: TransformStep['type']) {
  if (isTextTransformerAction(type)) {
    return 'Elegí la columna o el resultado anterior sobre el que se aplica esta acción.';
  }

  return 'Indica de donde sale el valor de este paso.';
}

function getSourceOptionsConfigForStep(step: TransformStep, context: StepEditorContext): StepValueSourceOptionsConfig | undefined {
  const isFollowUpStep = (context.stepIndex ?? 0) > 0;
  if (isFollowUpStep && shouldShowTextSourceFields(step.type)) {
    return {
      allowedSources: getFollowUpSourceTypes(step.source),
      fixedTextLabel: 'Texto fijo actual',
    };
  }

  if (!isTextTransformerAction(step.type) || context.kind === 'concat') {
    return undefined;
  }

  const allowedActions = getAllowedTextTransformerSourceActions(step, context);
  return {
    allowedSources: [
      ...(allowedActions.includes('usePreviousResult') ? ['previousResult' as const] : []),
      ...(allowedActions.includes('useInputColumn') ? ['input' as const] : []),
      ...(allowedActions.includes('useFixedText') ? ['fixedText' as const] : []),
    ],
    fixedTextLabel: 'Texto fijo actual',
  };
}

function getFollowUpSourceTypes(source: StepSource | undefined): StepValueSourceOptionsConfig['allowedSources'] {
  return [
    'previousResult',
    ...(source?.type === 'input' ? ['input' as const] : []),
    ...(source?.type === 'fixedText' ? ['fixedText' as const] : []),
  ];
}

function getStepModeOptionsForContext(context: StepEditorContext) {
  return getAllowedStepModes(context).map((mode) => ({ value: mode, label: getRecipeStepModeLabel(mode) }));
}

function getStepActionOptionsForContext(mode: TransformStepMode, context: StepEditorContext, visibleAction: VisibleStepAction): Array<{ value: BlockAction; label: string }> {
  const actions = getAllowedStepActions(mode, context)
    .filter((action) => action !== 'unconfigured');
  const actionsWithCurrent = includeCurrentVisibleAction(actions, visibleAction);
  if (mode === 'number' && actions.includes('numericOperation')) {
    return [
      ...actionsWithCurrent
        .filter((action) => action !== 'numericOperation')
        .map((action) => ({ value: action as Exclude<VisibleStepAction, 'unconfigured'>, label: getStepActionLabel(action as Exclude<VisibleStepAction, 'unconfigured'>, context) })),
      ...numericOperationOptions,
    ];
  }

  return actionsWithCurrent.map((action) => ({ value: action as Exclude<VisibleStepAction, 'unconfigured'>, label: getStepActionLabel(action as Exclude<VisibleStepAction, 'unconfigured'>, context) }));
}

function includeCurrentVisibleAction(actions: VisibleStepAction[], visibleAction: VisibleStepAction): VisibleStepAction[] {
  if (visibleAction === 'unconfigured' || actions.includes(visibleAction)) {
    return actions;
  }

  return [visibleAction, ...actions];
}

function getStepActionLabel(action: Exclude<VisibleStepAction, 'unconfigured'>, context: StepEditorContext) {
  void context;
  return getRecipeStepActionLabel(action);
}

function getContextWithDefaultColumnForTypedAction(
  action: Exclude<VisibleStepAction, 'unconfigured'>,
  context: StepEditorContext,
  inputColumns: InputColumn[],
  compatibilityRows: InputRow[],
): StepEditorContext {
  const valueKind = action === 'useNumberInputColumn' ? 'number' : action === 'useDateInputColumn' ? 'date' : null;
  if (!valueKind) {
    return context;
  }

  const compatibleColumns = getCompatibleStepValueInputColumns(inputColumns, valueKind, compatibilityRows);
  const defaultColumnIsCompatible = compatibleColumns.some((inputColumn) => inputColumn.id === context.defaultInputColumnId);
  const compatibleColumn = defaultColumnIsCompatible
    ? compatibleColumns.find((inputColumn) => inputColumn.id === context.defaultInputColumnId)
    : compatibleColumns[0] ?? inputColumns[0];
  return {
    ...context,
    defaultInputColumnId: compatibleColumn?.id || '',
  };
}

function getActionDropdownValue(step: TransformStep, visibleAction: VisibleStepAction): BlockAction | '' {
  if (visibleAction === 'unconfigured') {
    return '';
  }

  if (step.type === 'numericOperation') {
    return step.operation ?? 'add';
  }

  return visibleAction;
}

function createNewNumericOperationStep(stepId: string, context: StepEditorContext, operation: NumericOperation): TransformStep {
  const { amount: _amount, rightOperand: _rightOperand, rounding: _rounding, ...step } = createCanonicalStepForAction('number', 'numericOperation', { ...context, idFactory: () => stepId });
  return {
    ...step,
    operation,
    leftOperand: (context.stepIndex ?? 0) > 0
      ? { type: 'previousResult' }
      : { type: 'fixedText', value: '' },
    rightOperand: { type: 'fixedText', value: '' },
    rounding: 0,
  };
}

export function getNumericOperandInputColumns(inputColumns: InputColumn[], rows: InputRow[], options: { includeSampleValues?: boolean } = {}) {
  const includeSampleValues = options.includeSampleValues ?? true;
  return inputColumns.filter((inputColumn) => {
    const values = [
      ...(includeSampleValues ? inputColumn.sampleValues : []),
      ...rows.map((row) => row.values[inputColumn.id] ?? ''),
    ];
    return values.some((value) => parseNumericValue(value) !== null);
  });
}

function getAllowedNumericBaseOperandTypes(operand: StepOperand, context: StepEditorContext): StepOperand['type'][] | undefined {
  if ((context.stepIndex ?? 0) === 0) {
    return undefined;
  }

  return [
    'previousResult',
    ...(operand.type === 'input' ? ['input' as const] : []),
    ...(operand.type === 'fixedText' ? ['fixedText' as const] : []),
  ];
}

function isRangeEditorContext(context: StepEditorContext) {
  return context.kind === 'range' || context.kind === 'rangeConcat';
}

export function getNumericOperationUiWarning(
  operation: NumericOperation | undefined,
  leftOperand: StepOperand,
  rightOperand: StepOperand,
) {
  const fixedOperands = [leftOperand, rightOperand].filter((operand) => operand.type === 'fixedText');
  if (fixedOperands.some((operand) => operand.type === 'fixedText' && operand.value.trim() !== '' && getFixedNumericOperandValue(operand) === null)) {
    return 'No se pudo calcular: el valor no es numérico.';
  }

  const rightValue = rightOperand.type === 'fixedText' ? getFixedNumericOperandValue(rightOperand) : null;
  if ((operation === 'divide' && rightValue === 0) || (operation === 'removeIncludedPercentage' && rightValue === -100)) {
    return 'No se pudo calcular: división por cero.';
  }

  return '';
}

function getFixedNumericOperandValue(operand: Extract<StepOperand, { type: 'fixedText' }>) {
  const parsedValue = parseNumericValue(operand.value);
  if (parsedValue !== null) {
    return parsedValue;
  }

  return typeof operand.numericFallback === 'number' && Number.isFinite(operand.numericFallback)
    ? operand.numericFallback
    : null;
}

function getStepModeForBlock(step: TransformStep): TransformStepMode {
  if (step.mode) {
    return step.mode;
  }

  if (step.type === 'numericOperation') return 'number';
  if (step.type === 'formatDate') return 'date';
  if (step.type === 'extractNumber' || step.type === 'toNumber' || step.type === 'toText') return 'conversion';
  if (step.type === 'manualRange') return 'manualRange';
  return 'text';
}

function getSourceActionOverrideIdentity(step: TransformStep, context: StepEditorContext, mode: TransformStepMode, uiStateKey?: string) {
  return [
    context.kind,
    context.stepIndex ?? 0,
    context.partIndex ?? '',
    uiStateKey ?? step.id,
    mode,
    step.type,
  ].join(':');
}

function createFallbackSource(mode: TransformStepMode, context: StepEditorContext): StepSource {
  if ((context.stepIndex ?? 0) > 0) {
    return { type: 'previousResult' };
  }

  if (mode === 'text') {
    return context.defaultInputColumnId
      ? { type: 'input', inputColumnId: context.defaultInputColumnId }
      : { type: 'input', inputColumnId: '' };
  }

  return { type: 'fixedText', value: '' };
}

function getTypedStepSource(source: StepSource): StepSource {
  if (source.type === 'input' && !source.inputColumnId) {
    return { type: 'fixedText', value: '' };
  }

  if (source.type === 'input' || source.type === 'fixedText' || source.type === 'previousResult') {
    return source;
  }

  return { type: 'fixedText', value: '' };
}

function isNumericOperation(action: BlockAction): action is NumericOperation {
  return numericOperationOptions.some((option) => option.value === action);
}
