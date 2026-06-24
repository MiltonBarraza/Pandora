import { useState, type ReactNode } from 'react';
import { defaultDateInputFormat } from '../../domain/import/dateOperations';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { normalizeNumberInputWhileTyping, parseOptionalNumberInput } from '../../domain/import/numberInput';
import type { ConditionOperator, DateInputFormat, InputColumn, InputRow, StepOperand, StepSource, TransformStep, TransformStepMode, TransformStepType } from '../../types/import';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { ColumnTextPicker, createFixedTextSourceFromColumnText } from './ColumnTextPicker';
import { operationTypeLabel, recipeEditorPreviousResultHelpText, useValueAsIsLabel, valueSourceLabel } from './OutputColumnRecipeEditor.constants';
import {
  conditionNeedsValue,
  conditionOperators,
  createDefaultCondition,
  getDatePickerValue,
  getStepModeOptions,
  getStepSourceDropdownOptions,
  getStepSourceDropdownValue,
  getStepSourceFromDropdownValue,
  getStepTextSourceActionOptions,
  getStepTypeOptions,
  getStepTypesForMode,
  isNumericConditionOperator,
  isStepTextSourceAction,
  normalizeConditionToInput,
  numericOperationOptions,
  shouldShowPreviousResultSourceHelp,
  type StepTextAction,
  type StepTextSourceAction,
} from './OutputColumnRecipeEditor.optionHelpers';
import { getValueSourceFieldVisibility } from './OutputColumnRecipeEditor.valueActionHelpers';

export function StepTypeSelect({
  step,
  mode,
  allowConcat = true,
  textSourceAction,
  allowPreviousResultSource = false,
  onTextSourceAction,
  action,
  onChange,
}: {
  step: TransformStep;
  mode?: TransformStepMode;
  allowConcat?: boolean;
  textSourceAction?: StepTextSourceAction;
  allowPreviousResultSource?: boolean;
  onTextSourceAction?: (action: StepTextSourceAction) => void;
  action?: ReactNode;
  onChange: (type: TransformStepType, operation?: NonNullable<TransformStep['operation']>) => void;
}) {
  if (mode === 'number') {
    return (
      <Dropdown<NonNullable<TransformStep['operation']> | ''>
        className="compact"
        label="Que quiero hacer"
        labelInfo={<InfoTooltip content="Definí cómo se va a transformar esta información." />}
        value={step.type === 'numericOperation' ? step.operation ?? 'add' : ''}
        options={[
          { value: '', label: useValueAsIsLabel },
          ...numericOperationOptions,
        ]}
        scrollStrategy="close"
        onChange={(value) => {
          if (value === '') {
            return;
          }

          onChange('numericOperation', value);
        }}
      />
    );
  }

  const options = mode ? getStepTypesForMode(mode, { allowConcat }) : getStepTypeOptions({ allowConcat });
  const textOptions = [
    ...getStepTextSourceActionOptions(allowPreviousResultSource),
    ...options.filter((option) => option.value !== 'noop'),
  ];
  const value = mode === 'text' && step.type === 'noop' && textSourceAction ? textSourceAction : step.type;

  return (
    <div className="stepTypeFieldGroup">
      <Dropdown<StepTextAction>
        className="compact"
        label="Que quiero hacer"
        labelInfo={<InfoTooltip content="Definí cómo se va a transformar esta información." />}
        value={value}
        options={mode === 'text' && onTextSourceAction ? textOptions : options}
        scrollStrategy="close"
        onChange={(type) => {
          if (mode === 'text' && onTextSourceAction && isStepTextSourceAction(type)) {
            onTextSourceAction(type);
            return;
          }

          onChange(type as TransformStepType);
        }}
      />
      {action}
    </div>
  );
}

export function shouldShowStepTypeSelectForStep(step: TransformStep) {
  return step.type !== 'manualRange';
}

export function StepModeSelect({
  mode,
  allowManualRange = true,
  onChange,
}: {
  mode: TransformStepMode;
  allowManualRange?: boolean;
  onChange: (mode: TransformStepMode) => void;
}) {
  return (
    <Dropdown<TransformStepMode>
      className="compact"
      label={operationTypeLabel}
      labelInfo={<InfoTooltip content="Agrupa las acciones segun el tipo de dato." />}
      value={mode}
      options={getStepModeOptions({ allowManualRange })}
      scrollStrategy="close"
      onChange={onChange}
    />
  );
}

export function StepSourceFields({
  label = valueSourceLabel,
  source,
  inputColumns,
  inputRows = [],
  allowPreviousResult,
  previousResultPreviewValue,
  fixedTextInputType = 'text',
  fixedTextDateInputFormat = defaultDateInputFormat,
  hideFixedTextInput = false,
  hideSourceSelector = false,
  columnTextPickerOpen = false,
  onChange,
}: {
  label?: string;
  source: StepSource;
  inputColumns: InputColumn[];
  inputRows?: InputRow[];
  allowPreviousResult: boolean;
  previousResultPreviewValue?: string | null;
  fixedTextInputType?: 'text' | 'date';
  fixedTextDateInputFormat?: DateInputFormat;
  hideFixedTextInput?: boolean;
  hideSourceSelector?: boolean;
  columnTextPickerOpen?: boolean;
  onChange: (source: StepSource) => void;
}) {
  const [isColumnTextPickerOpen, setIsColumnTextPickerOpen] = useState(false);
  const safeSource = !allowPreviousResult && source.type === 'previousResult'
    ? { type: 'input' as const, inputColumnId: '' }
    : source;
  const effectiveColumnTextPickerOpen = columnTextPickerOpen || isColumnTextPickerOpen;
  const showPreviousResultHelp = !effectiveColumnTextPickerOpen && shouldShowPreviousResultSourceHelp(safeSource);
  const showPreviousResultPreview = showPreviousResultHelp && previousResultPreviewValue !== null && previousResultPreviewValue !== undefined && previousResultPreviewValue !== '';
  const canPickColumnText = fixedTextInputType === 'text';
  const sourceValue = effectiveColumnTextPickerOpen ? 'columnTextPicker' : getStepSourceDropdownValue(safeSource);
  const sourceFieldVisibility = getValueSourceFieldVisibility(safeSource.type, {
    columnTextPickerOpen: effectiveColumnTextPickerOpen,
    hideFixedTextInput,
    hideSourceSelector,
  });

  return (
    <>
      {sourceFieldVisibility.showSourceSelector ? (
        <Dropdown
          className="compact"
          label={label}
          labelInfo={<InfoTooltip content="Indica de donde sale el valor de este paso." />}
          value={sourceValue}
          options={getStepSourceDropdownOptions(inputColumns, allowPreviousResult, canPickColumnText)}
          placeholder="Seleccionar fuente"
          scrollStrategy="close"
          onChange={(value) => {
            if (value === 'columnTextPicker') {
              setIsColumnTextPickerOpen(true);
              return;
            }

            setIsColumnTextPickerOpen(false);
            onChange(getStepSourceFromDropdownValue(value, safeSource));
          }}
        />
      ) : null}

      {showPreviousResultHelp ? (
        <div className="muted sourceHelpText">
          <p>{recipeEditorPreviousResultHelpText}</p>
          {showPreviousResultPreview ? (
            <p>Valor disponible: <strong>{previousResultPreviewValue}</strong></p>
          ) : null}
        </div>
      ) : null}

      {sourceFieldVisibility.showColumnTextPicker ? (
        <ColumnTextPicker
          inputColumns={inputColumns}
          rows={inputRows}
          value={safeSource.type === 'fixedText' ? safeSource.value : ''}
          onSelect={(value) => onChange(createFixedTextSourceFromColumnText(value))}
        />
      ) : sourceFieldVisibility.showInputColumnSelect && safeSource.type === 'input' ? (
        <Dropdown
          className="compact"
          label="Columna de entrada"
          value={safeSource.inputColumnId}
          options={inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))}
          scrollStrategy="close"
          onChange={(inputColumnId) => onChange({ type: 'input', inputColumnId })}
        />
      ) : sourceFieldVisibility.showFixedTextInput && safeSource.type === 'fixedText' ? (
        <label className="field compact">
          <span className="labelWithInfo">
            <span>{fixedTextInputType === 'date' ? 'Fecha fija' : 'Texto fijo'}</span>
            <InfoTooltip content={fixedTextInputType === 'date' ? 'Fecha manual usada en este paso.' : 'Valor manual usado en este paso.'} />
          </span>
          <input
            type={fixedTextInputType}
            value={fixedTextInputType === 'date' ? getDatePickerValue(safeSource.value, fixedTextDateInputFormat) : safeSource.value}
            onChange={(event) => onChange({ type: 'fixedText', value: event.target.value })}
          />
        </label>
      ) : null}
    </>
  );
}

export function StepOperandFields({
  label,
  operand,
  inputColumns,
  allowPreviousResult,
  onChange,
}: {
  label: string;
  operand: StepOperand;
  inputColumns: InputColumn[];
  allowPreviousResult: boolean;
  onChange: (operand: StepOperand) => void;
}) {
  const safeOperand = !allowPreviousResult && operand.type === 'previousResult'
    ? { type: 'fixedText' as const, value: '0', numericFallback: 0 }
    : operand;

  return (
    <>
      <Dropdown<StepOperand['type']>
        className="compact"
        label={label}
        labelInfo={<InfoTooltip content="Elige si el valor viene de una columna, un numero fijo o un paso previo." />}
        value={safeOperand.type}
        options={[
          ...(allowPreviousResult ? [{ value: 'previousResult' as const, label: 'Resultado del paso anterior' }] : []),
          { value: 'input', label: 'Columna de entrada' },
          { value: 'fixedText', label: 'Valor fijo' },
        ]}
        scrollStrategy="close"
        onChange={(type) => {
          if (type === 'previousResult') {
            onChange({ type: 'previousResult' });
            return;
          }

          if (type === 'input') {
            onChange({ type: 'input', inputColumnId: inputColumns[0]?.id ?? '' });
            return;
          }

          onChange({ type: 'fixedText', value: '0', numericFallback: 0 });
        }}
      />

      {safeOperand.type === 'input' ? (
        <InputColumnSelect
          label={`${label}: columna`}
          value={safeOperand.inputColumnId}
          inputColumns={inputColumns}
          onChange={(inputColumnId) => onChange({ type: 'input', inputColumnId })}
        />
      ) : null}

      {safeOperand.type === 'fixedText' ? (
        <label className="field compact">
          <span className="labelWithInfo">
            <span>{label}: valor fijo</span>
            <InfoTooltip content="Numero manual para usar en la operacion." />
          </span>
          <input
            type="number"
            step="any"
            value={safeOperand.value}
            onChange={(event) => {
              const value = normalizeNumberInputWhileTyping(safeOperand.value, event.target.value);
              const numericFallback = parseOptionalNumberInput(value);
              onChange({
                type: 'fixedText',
                value,
                ...(numericFallback === undefined ? {} : { numericFallback }),
              });
            }}
          />
        </label>
      ) : null}
    </>
  );
}

export function InputColumnSelect({
  value,
  inputColumns,
  label = 'Columna de entrada',
  onChange,
}: {
  value: string;
  inputColumns: InputColumn[];
  label?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Dropdown
      className="compact"
      label={label}
      labelInfo={<InfoTooltip content="Elegí la columna del Excel que contiene este dato." />}
      value={value}
      options={[
        { value: '', label: 'Seleccionar columna' },
        ...inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) })),
      ]}
      scrollStrategy="close"
      onChange={onChange}
    />
  );
}

export function StepConditionFields({
  step,
  inputColumns,
  variant = 'default',
  onChange,
}: {
  step: TransformStep;
  inputColumns: InputColumn[];
  variant?: 'default' | 'manualRange';
  onChange: (patch: Partial<TransformStep>) => void;
}) {
  const condition = step.condition;
  const conditionColumns = inputColumns;
  const inputCondition = condition ? normalizeConditionToInput(condition, inputColumns) : undefined;
  const isManualRangeCondition = variant === 'manualRange';

  return (
    <div className="transformConditionBlock conditionFieldsRow">
      <Dropdown<'always' | 'conditional'>
        className="compact"
        label={isManualRangeCondition ? 'Aplicar el valor' : 'Condición'}
        labelInfo={<InfoTooltip content={isManualRangeCondition
          ? 'El rango puede incluir filas de título o separación. Esta condición define en qué filas se escribe realmente el valor.'
          : 'Elige si este paso se aplica siempre o solo en algunos casos.'} />}
        value={condition ? 'conditional' : 'always'}
        options={[
          { value: 'always', label: isManualRangeCondition ? 'Aplicar el valor a todas las filas del rango' : 'Aplicar siempre' },
          { value: 'conditional', label: isManualRangeCondition ? 'Aplicar el valor sólo a filas donde' : 'Aplicar solo si...' },
        ]}
        scrollStrategy="close"
        onChange={(value) => {
          if (value === 'always') {
            onChange({ condition: undefined });
            return;
          }

          onChange({ condition: createDefaultCondition(inputColumns) });
        }}
      />

      {condition ? (
        <Dropdown
          className="compact"
          label="Columna"
          labelInfo={<InfoTooltip content="Columna que se revisa para decidir si aplicar el paso." />}
          value={inputCondition?.columnId ?? ''}
          options={conditionColumns.length === 0
            ? [{ value: '', label: 'Sin columnas' }]
            : conditionColumns.map((item) => ({ value: item.id, label: getInputColumnLabel(item) }))}
          scrollStrategy="close"
          onChange={(columnId) => onChange({ condition: { ...(inputCondition ?? createDefaultCondition(inputColumns)), columnId } })}
        />
      ) : null}
      {condition ? (
        <Dropdown<ConditionOperator>
          className="compact"
          label="Operador"
          labelInfo={<InfoTooltip content="Regla que compara la columna elegida." />}
          value={inputCondition?.operator ?? 'isNotEmpty'}
          options={conditionOperators}
          scrollStrategy="close"
          onChange={(operator) => {
            onChange({
              condition: {
                ...(inputCondition ?? createDefaultCondition(inputColumns)),
                operator,
                valueType: isNumericConditionOperator(operator) ? 'number' : 'text',
              },
            });
          }}
        />
      ) : null}
      {inputCondition && conditionNeedsValue(inputCondition.operator) ? (
        <label className="field compact">
          <span className="labelWithInfo">
            <span>Valor condición</span>
            <InfoTooltip content="Valor que debe coincidir para aplicar el paso." />
          </span>
          <input value={inputCondition.value ?? ''} onChange={(event) => onChange({ condition: { ...inputCondition, value: event.target.value } })} />
        </label>
      ) : null}
    </div>
  );
}
