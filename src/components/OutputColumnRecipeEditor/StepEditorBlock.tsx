import { useEffect, useState, type ReactNode } from 'react';
import {
  defaultDateInputFormat,
  defaultDateInvalidFallback,
  defaultDateOutputFormat,
} from '../../domain/import/dateOperations';
import type {
  DateInputFormat,
  DateInvalidFallback,
  DateOutputFormat,
  InputColumn,
  InputRow,
  NumericOperation,
  StepSource,
  TransformStep,
  TransformStepMode,
} from '../../types/import';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { operationTypeLabel, useValueAsIsLabel } from './OutputColumnRecipeEditor.constants';
import {
  dateInputFormatOptions,
  dateInvalidFallbackOptions,
  dateOutputFormatOptions,
  numericOperationOptions,
  parseRounding,
} from './OutputColumnRecipeEditor.optionHelpers';
import { getVisibleLeftOperand, getVisibleRightOperand, shouldShowTextSourceFields } from './OutputColumnRecipeEditor.recipeHelpers';
import { StepConditionFields, StepOperandFields, StepSourceFields, type StepSourceChangeContext } from './OutputColumnRecipeEditor.StepFields';
import {
  createCanonicalStepForAction,
  createCanonicalStepForMode,
  getAllowedSourceActions,
  getAllowedStepActions,
  getAllowedStepModes,
  getVisibleStepAction,
  isStepSourceAction,
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
  title?: string;
  canDelete?: boolean;
  showHeader?: boolean;
  showCondition?: boolean;
  showAddStep?: boolean;
  className?: string;
  gridClassName?: string;
  fixedTextInputLabel?: string;
  hideTransformSourceFields?: boolean;
  previousResultPreviewValue?: string | null;
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

const stepModeLabels: Record<TransformStepMode, string> = {
  text: 'Trabajar con texto',
  number: 'Trabajar con número',
  conversion: 'Conversión',
  date: 'Trabajar con fechas',
  manualRange: 'Trabajar con rangos',
};

const stepActionLabels: Record<Exclude<VisibleStepAction, 'unconfigured'>, string> = {
  useValueAsIs: useValueAsIsLabel,
  useInputColumn: 'Usar columna de entrada',
  useFixedText: 'Usar texto fijo',
  pickColumnText: 'Elegir texto desde celda',
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

export function StepEditorBlock({
  step,
  context,
  inputColumns,
  manualRangeRows = [],
  title,
  canDelete = false,
  showHeader = true,
  showCondition = true,
  showAddStep = false,
  className = 'stepDetailPanel',
  gridClassName = 'simpleCustomValueGrid',
  fixedTextInputLabel,
  hideTransformSourceFields = false,
  previousResultPreviewValue,
  renderCondition,
  onChange,
  onReplace,
  onDelete,
  onAddStep,
  renderFields,
}: StepEditorBlockProps) {
  const mode = getStepModeForBlock(step);
  const sourceActionOverrideIdentity = getSourceActionOverrideIdentity(step, context, mode);
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
  const fieldsClassName = step.type === 'concat'
    ? 'stepFullWidthFields'
    : 'rangeValuePrimaryStepFields rangeValueSourceControls stepExtraFieldsRow';

  useEffect(() => {
    setSourceActionOverrideState(context.sourceActionOverride
      ? { action: context.sourceActionOverride, identity: sourceActionOverrideIdentity }
      : undefined);
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

  const body = (
    <div className="rangeValuePrimaryLayout">
      <div className="rangeValuePrimaryControls stepPrimaryFieldsRow">
        <Dropdown<TransformStepMode>
          className="compact recipeField"
          label={operationTypeLabel}
          labelInfo={<InfoTooltip content="Agrupa las acciones segun el tipo de dato." />}
          value={mode}
          options={getStepModeOptionsForContext(effectiveContext)}
          scrollStrategy="close"
          onChange={(nextMode) => {
            setScopedSourceActionOverride(undefined);
            replaceStep(createCanonicalStepForMode(nextMode, { ...effectiveContext, idFactory: () => step.id }));
          }}
        />
        <Dropdown<BlockAction>
          className="compact recipeField"
          label="Qué quiero hacer"
          labelInfo={<InfoTooltip content="Definí cómo se va a transformar esta información." />}
          value={actionValue}
          options={getStepActionOptionsForContext(mode, effectiveContext)}
          placeholder="Seleccionar acción"
          scrollStrategy="close"
          onChange={(action) => {
            if (isNumericOperation(action)) {
              setScopedSourceActionOverride(undefined);
              replaceStep({
                ...createCanonicalStepForAction('number', 'numericOperation', { ...effectiveContext, idFactory: () => step.id }),
                operation: action,
              });
              return;
            }

            if (isStepSourceAction(action)) {
              setScopedSourceActionOverride(action === 'pickColumnText' ? 'pickColumnText' : undefined);
              replaceStep(replaceStepActionWithSource(step, action, effectiveContext));
              return;
            }

            setScopedSourceActionOverride(undefined);
            replaceStep(createCanonicalStepForAction(mode, action, { ...effectiveContext, idFactory: () => step.id }));
          }}
        />
      </div>
      <div className={fieldsClassName}>
        {hasVisibleAction ? renderFields?.({
          step,
          context: effectiveContext,
          stepSource,
          visibleAction,
          onSourceChange: updateSource,
          onChange,
          onReplace: replaceStep,
        }) ?? renderDefaultFields({
          step,
          context: effectiveContext,
          visibleAction,
          stepSource,
          inputColumns,
          manualRangeRows,
          fixedTextInputLabel,
          hideTransformSourceFields,
          previousResultPreviewValue,
          sourceActionOverride,
          onSourceActionOverrideChange: setScopedSourceActionOverride,
          onSourceChange: updateSource,
          onChange,
        }) : null}
      </div>
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
        {canDelete && onDelete ? <button type="button" className="secondary" onClick={onDelete}>Eliminar paso</button> : <span aria-hidden="true" />}
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
  fixedTextInputLabel,
  hideTransformSourceFields,
  previousResultPreviewValue,
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
  fixedTextInputLabel?: string;
  hideTransformSourceFields?: boolean;
  previousResultPreviewValue?: string | null;
  sourceActionOverride?: StepSourceAction;
  onSourceActionOverrideChange: (action: StepSourceAction | undefined) => void;
  onSourceChange: (source: StepSource, changeContext?: StepSourceChangeContext) => void;
  onChange: (patch: Partial<TransformStep>) => void;
}) {
  const mode = getStepModeForBlock(step);
  const allowPreviousResult = getAllowedSourceActions(step, context).includes('usePreviousResult');

  if (step.type === 'noop') {
    if (mode === 'text' && isStepSourceAction(visibleAction)) {
      return (
        <StepSourceFields
          source={stepSource}
          inputColumns={inputColumns}
          inputRows={manualRangeRows}
          allowPreviousResult={allowPreviousResult}
          previousResultPreviewValue={previousResultPreviewValue}
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
      return (
        <StepSourceFields
          label={mode === 'number' ? 'Qué valor usar' : 'Qué fecha usar'}
          source={getTypedStepSource(stepSource)}
          inputColumns={inputColumns}
          inputRows={manualRangeRows}
          allowPreviousResult={allowPreviousResult}
          previousResultPreviewValue={previousResultPreviewValue}
          fixedTextInputType={mode === 'number' ? 'number' : 'date'}
          fixedTextInputLabel={mode === 'number' ? 'Valor fijo' : 'Fecha fija'}
          valueKind={mode}
          onChange={onSourceChange}
        />
      );
    }

    return null;
  }

  const renderTextSourceFields = (afterSourceSelector?: ReactNode) => !hideTransformSourceFields && shouldShowTextSourceFields(step.type) ? (
    <StepSourceFields
      label={step.type === 'formatDate' ? 'Qué fecha usar' : 'Qué valor usar'}
      source={stepSource}
      inputColumns={inputColumns}
      inputRows={manualRangeRows}
      allowPreviousResult={allowPreviousResult}
      previousResultPreviewValue={previousResultPreviewValue}
      fixedTextInputType={step.type === 'formatDate' ? 'date' : 'text'}
      fixedTextDateInputFormat={step.dateInputFormat ?? defaultDateInputFormat}
      fixedTextInputLabel={step.type === 'formatDate' ? 'Fecha fija' : 'Valor fijo'}
      valueKind={step.type === 'formatDate' ? 'date' : 'text'}
      explicitTextValueSource={step.type !== 'formatDate'}
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

    return (
      <div className="numericOperationFields">
        <StepOperandFields
          label="Primer valor"
          operand={leftOperand}
          inputColumns={inputColumns}
          allowPreviousResult={allowPreviousResult}
          onChange={(leftOperand) => onChange({ leftOperand })}
        />
        <StepOperandFields
          label="Segundo valor"
          operand={rightOperand}
          inputColumns={inputColumns}
          allowPreviousResult={allowPreviousResult}
          onChange={(rightOperand) => onChange({ rightOperand })}
        />
        <Dropdown
          className="compact recipeField"
          label="Decimales / redondeo"
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
    return sourceFields;
  }

  if (step.type === 'concat') {
    return null;
  }

  return sourceFields;
}

function getStepModeOptionsForContext(context: StepEditorContext) {
  return getAllowedStepModes(context).map((mode) => ({ value: mode, label: stepModeLabels[mode] }));
}

function getStepActionOptionsForContext(mode: TransformStepMode, context: StepEditorContext): Array<{ value: BlockAction; label: string }> {
  const actions = getAllowedStepActions(mode, context).filter((action) => action !== 'unconfigured');
  if (mode === 'number' && actions.includes('numericOperation')) {
    return [
      ...(actions.includes('useValueAsIs') ? [{ value: 'useValueAsIs' as const, label: useValueAsIsLabel }] : []),
      ...numericOperationOptions,
    ];
  }

  return actions.map((action) => ({ value: action as Exclude<VisibleStepAction, 'unconfigured'>, label: stepActionLabels[action as Exclude<VisibleStepAction, 'unconfigured'>] }));
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

function getSourceActionOverrideIdentity(step: TransformStep, context: StepEditorContext, mode: TransformStepMode) {
  return [
    context.kind,
    context.stepIndex ?? 0,
    context.partIndex ?? '',
    step.id,
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
