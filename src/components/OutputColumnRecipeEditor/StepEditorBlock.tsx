import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  defaultDateInputFormat,
  defaultDateInvalidFallback,
  defaultDateOutputFormat,
  getDateOutputFormatDisplayValue,
  getDateOutputFormatError,
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
import { Modal } from '../Modal/Modal';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { AppIcon } from '../ui/AppIcon/AppIcon';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { WarningTooltip } from '../ui/WarningTooltip/WarningTooltip';
import { NumericFormulaEditor, createDefaultNumericFormula, getNumericFormulaUiWarning } from './NumericFormulaEditor';
import { operationTypeLabel } from './OutputColumnRecipeEditor.constants';
import {
  conversionInvalidFallbackOptions,
  dateInputFormatOptions,
  dateInvalidFallbackOptions,
  getNumericOperandLabels,
  numericOperationOptions,
  parseRounding,
} from './OutputColumnRecipeEditor.optionHelpers';
import { getVisibleLeftOperand, getVisibleRightOperand, shouldShowTextSourceFields } from './OutputColumnRecipeEditor.recipeHelpers';
import { StepConditionFields, StepOperandFields, StepSourceFields, getColumnCompatibilityHint, getCompatibleStepValueInputColumns, getStepActionHelpText, type PreviousResultDisplay, type StepSourceChangeContext } from './OutputColumnRecipeEditor.StepFields';
import {
  createCanonicalStepForAction,
  createCanonicalStepForMode,
  getAllowedSourceActions,
  getSourceActionForTypedStepSourceAction,
  getStepEditorContextFacts,
  getStepRowsForCellPicker,
  getStepRowsForNumericOperandCompatibility,
  getStepRowsForSourceCompatibility,
  getStepRowsForTypedActionCompatibility,
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
import {
  getStepActionOptionsForContext,
  getStepModeOptionsForContext,
  getStepSourceOptionsConfigForStep,
  type StepEditorActionOptionValue,
} from './OutputColumnRecipeEditor.stepOptions';

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

type BlockAction = StepEditorActionOptionValue;
const dateOutputFormatPartRows = [
  { format: 'AAAA', example: '2026', description: 'Año de 4 dígitos' },
  { format: 'AA', example: '26', description: 'Año de 2 dígitos' },
  { format: 'MMMM', example: 'julio', description: 'Nombre completo del mes' },
  { format: 'MMM', example: 'jul', description: 'Nombre corto del mes' },
  { format: 'MM', example: '07', description: 'Mes con 2 dígitos' },
  { format: 'M', example: '7', description: 'Mes sin cero inicial' },
  { format: 'dddd', example: 'domingo', description: 'Día de semana completo' },
  { format: 'ddd', example: 'dom', description: 'Día de semana corto' },
  { format: 'DD', example: '05', description: 'Día del mes con 2 dígitos' },
  { format: 'D', example: '5', description: 'Día del mes sin cero inicial' },
];
const dateOutputFormatExamples = [
  ['DD/MM/AAAA', '05/07/2026'],
  ['AAAA-MM-DD', '2026-07-05'],
  ['D/M/AA', '5/7/26'],
  ['DD.MM.AAAA', '05.07.2026'],
  ['MMMM DD AAAA', 'julio 05 2026'],
  ['dddd DD/MM/AAAA', 'domingo 05/07/2026'],
];
const dateOutputFormatFieldHelpText = 'Escribí el formato combinando partes como DD, MM y AAAA. Usá el calendario para ver todos los formatos disponibles.';
const dateOutputFormatHelpButtonLabel = 'Ver formatos disponibles';
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
                ? step.operation ?? 'addPercentage'
                : visibleAction === 'unconfigured' ? '' : visibleAction,
              mode,
            )} />}
            value={actionValue}
            options={getStepActionOptionsForContext(mode, effectiveContext, visibleAction)}
            placeholder="Seleccionar acción"
            scrollStrategy="close"
            onChange={(action) => {
              if (action === 'numericFormula') {
                setScopedSourceActionOverride(undefined);
                replaceStep(createNewNumericFormulaStep(step.id, effectiveContext, inputColumns, manualRangeRows, inputCompatibilityRows));
                return;
              }

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
                const nextContext = getContextWithDefaultColumnForTypedAction(
                  action,
                  effectiveContext,
                  inputColumns,
                  getStepRowsForTypedActionCompatibility({ manualRangeRows, inputCompatibilityRows }),
                );
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
    <div className={className} role="group" aria-label={title ?? `Paso ${(context.stepIndex ?? 0) + 1}`}>
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
  const contextFacts = getStepEditorContextFacts(context);
  const rowsForCellPicker = getStepRowsForCellPicker({ manualRangeRows });
  const rowsForSourceCompatibility = getStepRowsForSourceCompatibility({ inputCompatibilityRows });
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
          inputRows={rowsForCellPicker}
          inputCompatibilityRows={rowsForSourceCompatibility}
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
          inputRows={rowsForCellPicker}
          inputCompatibilityRows={rowsForSourceCompatibility}
          allowPreviousResult={allowPreviousResult}
          previousResultPreviewValue={previousResultPreviewValue}
          previousResultDisplay={previousResultDisplay}
          fixedTextInputType={mode === 'number' ? 'number' : 'date'}
          fixedTextInputLabel={mode === 'number' ? 'Valor fijo' : 'Fecha fija'}
          valueKind={mode}
          hideSourceSelector
          columnTextPickerOpen={isCellPickerAction}
          limitColumnTextPickerToCompatibleColumns={!contextFacts.isRangeContext}
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
      inputRows={rowsForCellPicker}
      inputCompatibilityRows={rowsForSourceCompatibility}
      allowPreviousResult={allowPreviousResult}
      previousResultPreviewValue={previousResultPreviewValue}
      previousResultDisplay={previousResultDisplay}
      fixedTextInputType={step.type === 'formatDate' ? 'date' : 'text'}
      fixedTextDateInputFormat={step.dateInputFormat ?? defaultDateInputFormat}
      fixedTextInputLabel={step.type === 'formatDate' ? 'Fecha fija' : 'Valor fijo'}
      valueKind={step.type === 'formatDate' ? 'date' : 'text'}
      explicitTextValueSource={step.type !== 'formatDate'}
      sourceOptionsConfig={getStepSourceOptionsConfigForStep(step, context)}
      labelInfoText={getStepSourceHelpText(step.type)}
      {...conversionPickerProps}
      limitColumnTextPickerToCompatibleColumns={!contextFacts.isRangeContext}
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
    const suffixField = (
      <label className="field compact recipeField">
        <span>Sufijo</span>
        <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
      </label>
    );

    if (contextFacts.isFollowUpStep) {
      return (
        <>
          {sourceFields}
          {suffixField}
        </>
      );
    }

    return (
      <>
        {renderTextSourceFields(suffixField)}
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
    const numericCompatibility = getStepRowsForNumericOperandCompatibility({ manualRangeRows, inputCompatibilityRows });
    const numericInputColumns = getNumericOperandInputColumns(inputColumns, numericCompatibility.rows, { includeSampleValues: numericCompatibility.includeSampleValues });
    const operandLabels = getNumericOperandLabels(step.operation);
    const numericWarning = getNumericOperationUiWarning(step.operation, leftOperand, rightOperand);
    const numericCompatibilityHint = getColumnCompatibilityHint('number', inputColumns.length, numericInputColumns.length);
    const hidePreviousResultBase = contextFacts.isFollowUpStep && leftOperand.type === 'previousResult';

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
            helpText={getNumericOperandHelpText(step.operation, 'left')}
            fixedTextHelpText={getNumericOperandFixedTextHelpText(step.operation, 'left')}
            inputColumnLabel={getNumericOperandInputColumnLabel(step.operation, 'left')}
            fixedTextLabel={getNumericOperandFixedTextLabel(step.operation, 'left')}
            previousResultLabel={getNumericOperandPreviousResultLabel(step.operation, 'left')}
            rangeTextLabel={getNumericOperandRangeTextLabel(step.operation, 'left')}
            onChange={(leftOperand) => onChange({ leftOperand })}
          />
        )}
        <StepOperandFields
          label={operandLabels.right}
          operand={rightOperand}
          inputColumns={numericInputColumns}
          allowPreviousResult={allowPreviousResult}
          compatibilityHint={numericCompatibilityHint}
          helpText={getNumericOperandHelpText(step.operation, 'right')}
          fixedTextHelpText={getNumericOperandFixedTextHelpText(step.operation, 'right')}
          inputColumnLabel={getNumericOperandInputColumnLabel(step.operation, 'right')}
          fixedTextLabel={getNumericOperandFixedTextLabel(step.operation, 'right')}
          previousResultLabel={getNumericOperandPreviousResultLabel(step.operation, 'right')}
          rangeTextLabel={getNumericOperandRangeTextLabel(step.operation, 'right')}
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

  if (step.type === 'numericFormula') {
    const numericCompatibility = getStepRowsForNumericOperandCompatibility({ manualRangeRows, inputCompatibilityRows });
    const numericInputColumns = getNumericOperandInputColumns(inputColumns, numericCompatibility.rows, { includeSampleValues: numericCompatibility.includeSampleValues });
    const numericCompatibilityHint = getColumnCompatibilityHint('number', inputColumns.length, numericInputColumns.length);

    return (
      <NumericFormulaEditor
        formula={step.formula}
        rounding={step.rounding ?? 2}
        inputColumns={numericInputColumns}
        allowPreviousResult={allowPreviousResult}
        compatibilityHint={numericCompatibilityHint}
        warning={getNumericFormulaUiWarning(step.formula)}
        onFormulaChange={(formula) => onChange({ formula })}
        onRoundingChange={(rounding) => onChange({ rounding })}
      />
    );
  }

  if (step.type === 'formatDate') {
    const outputFormat = getDateOutputFormatDisplayValue(step.dateOutputFormat ?? defaultDateOutputFormat);
    const outputFormatError = getDateOutputFormatError(outputFormat);
    const invalidFallback = step.dateInvalidFallback ?? defaultDateInvalidFallback;
    const invalidFallbackField = (
      <Dropdown<DateInvalidFallback>
        className="compact recipeField"
        label="Si no es una fecha válida"
        value={invalidFallback}
        options={dateInvalidFallbackOptions}
        scrollStrategy="close"
        onChange={(dateInvalidFallback) => onChange({ dateInvalidFallback })}
      />
    );
    const fixedFallbackField = invalidFallback === 'fixedText' ? (
      <label className="field compact recipeField">
        <span>Texto si no es fecha válida</span>
        <input value={step.dateInvalidFallbackText ?? ''} onChange={(event) => onChange({ dateInvalidFallbackText: event.target.value })} />
      </label>
    ) : null;

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
        <DateOutputFormatInput
          outputFormat={outputFormat}
          error={outputFormatError}
          onChange={(dateOutputFormat) => onChange({ dateOutputFormat })}
        />
        {invalidFallbackField}
        {fixedFallbackField}
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

function DateOutputFormatInput({
  outputFormat,
  error,
  onChange,
}: {
  outputFormat: DateOutputFormat;
  error: string;
  onChange: (dateOutputFormat: DateOutputFormat) => void;
}) {
  const inputId = useId();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  return (
    <div className="field compact recipeField dateOutputFormatField">
      <span className="labelWithInfo dateOutputFormatLabel">
        <label htmlFor={inputId}>Formato de salida</label>
        <InfoTooltip content={dateOutputFormatFieldHelpText} className="dateOutputFormatFieldInfo" />
        {error ? <WarningTooltip content={error} ariaLabel="Advertencia: formato de salida inválido" /> : null}
      </span>
      <span className="dateOutputFormatInputRow">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          placeholder="DD/MM/AAAA"
          value={outputFormat}
          onChange={(event) => onChange(event.target.value)}
        />
        <InfoTooltip
          content={dateOutputFormatHelpButtonLabel}
          ariaLabel={dateOutputFormatHelpButtonLabel}
          placement="right"
        >
          <button
            type="button"
            className="dateOutputFormatHelpButton"
            aria-label={dateOutputFormatHelpButtonLabel}
            onClick={() => setIsHelpModalOpen(true)}
          >
            <AppIcon name="calendar" size={16} />
          </button>
        </InfoTooltip>
      </span>
      <Modal
        open={isHelpModalOpen}
        title="Formatos disponibles"
        className="dateOutputFormatHelpModal"
        onClose={() => setIsHelpModalOpen(false)}
      >
        <DateOutputFormatHelp />
      </Modal>
    </div>
  );
}

function DateOutputFormatHelp() {
  return (
    <span className="dateOutputFormatHelpContent">
      <span>Combiná estas partes para definir el formato de salida.</span>
      <table>
        <colgroup>
          <col className="dateOutputFormatColumn" />
          <col className="dateOutputExampleColumn" />
          <col className="dateOutputDescriptionColumn" />
        </colgroup>
        <thead>
          <tr>
            <th>Formato</th>
            <th>Ejemplo</th>
            <th>Qué significa</th>
          </tr>
        </thead>
        <tbody>
          {dateOutputFormatPartRows.map((row) => (
            <tr key={row.format}>
              <td><code>{row.format}</code></td>
              <td>{row.example}</td>
              <td title={row.description}>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <strong className="dateOutputFormatExamplesTitle">Ejemplos</strong>
      <span className="dateOutputFormatExamples">
        {dateOutputFormatExamples.map(([format, example]) => (
          <span key={format}><code>{format}</code> → <span>{example}</span></span>
        ))}
      </span>
    </span>
  );
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
    return step.operation ?? 'addPercentage';
  }

  return visibleAction;
}

function createNewNumericOperationStep(stepId: string, context: StepEditorContext, operation: NumericOperation): TransformStep {
  const contextFacts = getStepEditorContextFacts(context);
  const { amount: _amount, rightOperand: _rightOperand, rounding: _rounding, ...step } = createCanonicalStepForAction('number', 'numericOperation', { ...context, idFactory: () => stepId });
  return {
    ...step,
    operation,
    leftOperand: contextFacts.isFollowUpStep
      ? { type: 'previousResult' }
      : { type: 'fixedText', value: '' },
    rightOperand: { type: 'fixedText', value: '' },
    rounding: 0,
  };
}

function createNewNumericFormulaStep(
  stepId: string,
  context: StepEditorContext,
  inputColumns: InputColumn[],
  manualRangeRows: InputRow[],
  inputCompatibilityRows?: InputRow[],
): TransformStep {
  const contextFacts = getStepEditorContextFacts(context);
  const numericCompatibility = getStepRowsForNumericOperandCompatibility({ manualRangeRows, inputCompatibilityRows });
  const numericInputColumns = getNumericOperandInputColumns(inputColumns, numericCompatibility.rows, { includeSampleValues: numericCompatibility.includeSampleValues });

  return {
    id: stepId,
    mode: 'number',
    type: 'numericFormula',
    formula: createDefaultNumericFormula(numericInputColumns, contextFacts.isFollowUpStep),
    rounding: 2,
    applyToEmptyValues: false,
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
  const contextFacts = getStepEditorContextFacts(context);
  if (contextFacts.isFirstStep) {
    return undefined;
  }

  return [
    'previousResult',
    ...(operand.type === 'input' ? ['input' as const] : []),
    ...(operand.type === 'fixedText' ? ['fixedText' as const] : []),
  ];
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
  if (operation === 'removeIncludedPercentage' && rightValue === -100) {
    return 'No se pudo calcular: división por cero.';
  }

  return '';
}

function getNumericOperandHelpText(operation: NumericOperation | undefined, side: 'left' | 'right') {
  if ((operation === 'addPercentage' || operation === 'subtractPercentage') && side === 'left') {
    return 'Es el valor sobre el que se va a sumar o restar el porcentaje.';
  }

  if ((operation === 'addPercentage' || operation === 'subtractPercentage') && side === 'right') {
    return 'Es el porcentaje que se va a aplicar sobre el valor base.';
  }

  if (operation === 'removeIncludedPercentage' && side === 'left') {
    return 'Es el valor final que ya tiene el porcentaje incorporado.';
  }

  if (operation === 'removeIncludedPercentage' && side === 'right') {
    return 'Es el porcentaje que ya está incluido dentro del valor final y que se quiere quitar.';
  }

  return undefined;
}

function getNumericOperandFixedTextHelpText(operation: NumericOperation | undefined, side: 'left' | 'right') {
  return getNumericOperandHelpText(operation, side);
}

function getNumericOperandInputColumnLabel(operation: NumericOperation | undefined, _side: 'left' | 'right') {
  return isPercentageNumericOperation(operation) ? 'Columna' : undefined;
}

function getNumericOperandFixedTextLabel(operation: NumericOperation | undefined, _side: 'left' | 'right') {
  return isPercentageNumericOperation(operation) ? 'Valor fijo' : undefined;
}

function getNumericOperandPreviousResultLabel(operation: NumericOperation | undefined, _side: 'left' | 'right') {
  return isPercentageNumericOperation(operation) ? 'Resultado anterior' : undefined;
}

function getNumericOperandRangeTextLabel(operation: NumericOperation | undefined, _side: 'left' | 'right') {
  return isPercentageNumericOperation(operation) ? 'Celda seleccionada' : undefined;
}

function isPercentageNumericOperation(operation: NumericOperation | undefined) {
  return operation === 'addPercentage'
    || operation === 'subtractPercentage'
    || operation === 'removeIncludedPercentage';
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

  if (step.type === 'numericOperation' || step.type === 'numericFormula') return 'number';
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
  if (getStepEditorContextFacts(context).isFollowUpStep) {
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
