import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { defaultDateInputFormat, parseDateValue, supportedDateInputFormats } from '../../domain/import/dateOperations';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { normalizeNumberInputWhileTyping, parseOptionalNumberInput } from '../../domain/import/numberInput';
import type { ConditionOperator, DateInputFormat, InputColumn, InputRow, StepOperand, StepSource, TransformStep, TransformStepMode, TransformStepType } from '../../types/import';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { WarningTooltip } from '../ui/WarningTooltip/WarningTooltip';
import { ColumnTextPicker, createFixedTextSourceFromColumnText } from './ColumnTextPicker';
import { operationTypeLabel, pickCellTextLabel, recipeEditorPreviousResultHelpText, useValueAsIsLabel, valueSourceLabel } from './OutputColumnRecipeEditor.constants';
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

export type StepValueKind = 'text' | 'number' | 'date';
export type StepSourceChangeContext = { origin: 'cellValuePicker' };
export type PreviousResultDisplay = {
  value: string;
  helpText: string;
};
type VisibleStepAction = StepTextAction | NonNullable<TransformStep['operation']> | '';
type StepValueSourceKind = 'previousResult' | 'input' | 'fixedText' | 'columnTextPicker';

export type StepValueSourceOptionsConfig = {
  allowedSources?: StepValueSourceKind[];
  fixedTextLabel?: string;
  columnTextPickerLabel?: string;
};

export function getVisibleStepAction(
  step: TransformStep,
  mode: TransformStepMode = step.mode ?? 'text',
  textSourceAction?: StepTextSourceAction,
): VisibleStepAction {
  const allowedTypes = getStepTypesForMode(mode).map((option) => option.value);

  if (mode === 'number') {
    if (step.type === 'numericOperation') {
      return step.operation ?? 'add';
    }

    return step.type === 'noop' && Boolean(step.source) ? 'noop' : '';
  }

  if (mode === 'text') {
    if (step.type === 'noop') {
      return textSourceAction ?? '';
    }

    return allowedTypes.includes(step.type) ? step.type : '';
  }

  if (mode === 'date') {
    if (step.type === 'noop') {
      return step.source ? 'noop' : '';
    }

    return allowedTypes.includes(step.type) ? step.type : '';
  }

  if (mode === 'conversion') {
    return step.type !== 'noop' && allowedTypes.includes(step.type) ? step.type : '';
  }

  return allowedTypes.includes(step.type) ? step.type : '';
}

export function isVisibleStepActionConfigured(
  step: TransformStep,
  mode: TransformStepMode = step.mode ?? 'text',
  textSourceAction?: StepTextSourceAction,
) {
  return getVisibleStepAction(step, mode, textSourceAction) !== '';
}

export function getStepValueSourceOptions(
  inputColumns: InputColumn[],
  valueKind: StepValueKind,
  allowPreviousResult: boolean,
  explicitTextValueSource = false,
  config: StepValueSourceOptionsConfig = {},
  compatibilityRows?: InputRow[],
) {
  const isAllowed = (source: StepValueSourceKind) => !config.allowedSources || config.allowedSources.includes(source);
  const inputOptions = isAllowed('input')
    ? inputColumns.map((inputColumn) => ({ value: `input:${inputColumn.id}`, label: getInputColumnLabel(inputColumn) }))
    : [];
  const previousResultOptions = allowPreviousResult && isAllowed('previousResult')
    ? [{ value: 'previousResult', label: 'Usar resultado anterior' }]
    : [];
  const fixedTextOptions = isAllowed('fixedText')
    ? [{ value: 'fixedText', label: config.fixedTextLabel ?? (valueKind === 'number' ? 'Valor fijo' : valueKind === 'date' ? 'Fecha fija' : 'Texto fijo') }]
    : [];
  const pickerOptions = isAllowed('columnTextPicker')
    ? [{ value: 'columnTextPicker', label: config.columnTextPickerLabel ?? (valueKind === 'number' ? 'Elegir valor desde celda' : valueKind === 'date' ? 'Elegir fecha desde celda' : pickCellTextLabel) }]
    : [];

  if (valueKind === 'text' && !explicitTextValueSource) {
    return getStepSourceDropdownOptions(inputColumns, allowPreviousResult, true);
  }

  if (valueKind === 'text') {
    return [
      ...previousResultOptions,
      ...inputOptions,
      ...fixedTextOptions,
      ...pickerOptions,
    ];
  }

  const compatibleColumns = getCompatibleStepValueInputColumns(inputColumns, valueKind, compatibilityRows);

  return [
    ...previousResultOptions,
    ...(isAllowed('input') ? compatibleColumns.map((inputColumn) => ({ value: `input:${inputColumn.id}`, label: getInputColumnLabel(inputColumn) })) : []),
    ...fixedTextOptions,
    ...pickerOptions,
  ];
}

export function getCompatibleStepValueInputColumns(inputColumns: InputColumn[], valueKind: StepValueKind, compatibilityRows?: InputRow[]) {
  if (valueKind === 'text') {
    return inputColumns;
  }

  return inputColumns.filter((inputColumn) => {
    const values = compatibilityRows
      ? compatibilityRows.map((row) => String(row.values[inputColumn.id] ?? '').trim()).filter(Boolean)
      : inputColumn.sampleValues.map((value) => value.trim()).filter(Boolean);
    if (compatibilityRows) {
      return values.some(valueKind === 'number' ? isNumericPickerValue : isDatePickerValue);
    }

    return values.length === 0 || values.some(valueKind === 'number' ? isNumericPickerValue : isDatePickerValue);
  });
}

export function getColumnCompatibilityHint(valueKind: StepValueKind, totalColumns: number, compatibleColumns: number) {
  if (valueKind === 'text' || totalColumns === 0 || compatibleColumns === totalColumns) {
    return '';
  }

  if (compatibleColumns === 0) {
    return 'No hay columnas compatibles para esta operación.';
  }

  if (valueKind === 'number') {
    return 'No se muestran algunas columnas porque no contienen valores numéricos compatibles.';
  }

  return 'No se muestran algunas columnas porque Pandora no detectó valores de fecha compatibles.';
}

export function getNumericStepTypeFromSelection(value: NonNullable<TransformStep['operation']> | 'noop' | '') {
  return value === '' || value === 'noop' ? { type: 'noop' as const } : { type: 'numericOperation' as const, operation: value };
}

export function getTextStepActionOptions(_allowPreviousResult: boolean, allowConcat = true) {
  return [
    ...getStepTextSourceActionOptions(false),
    ...getStepTypesForMode('text', { allowConcat }).filter((option) => option.value !== 'noop'),
  ];
}

export function getConversionStepActionOptions() {
  return getStepTypesForMode('conversion').filter((option) => option.value !== 'noop');
}

export function getStepActionHelpText(action: string, _mode?: TransformStepMode) {
  if (action === 'extractNumber') {
    return 'Busca el primer número dentro del texto y usa ese número como resultado. Ejemplo: “Serie 304” → “304”.';
  }

  if (action === 'toNumber') {
    return 'Convierte valores numéricos escritos como texto. Si no puede convertirlos, conserva el valor original.';
  }

  if (action === 'toText') {
    return 'Trata el valor como texto para los siguientes pasos.';
  }

  if (action === 'removeIncludedPercentage') {
    return 'Calcula el valor antes de un porcentaje ya incluido. Ejemplo: 120 con 20% incluido → 100.';
  }

  return 'Elegí cómo se va a transformar esta información.';
}

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
  const visibleAction = getVisibleStepAction(step, mode, textSourceAction);
  const actionHelpText = getStepActionHelpText(visibleAction, mode);

  if (mode === 'number') {
    return (
      <Dropdown<NonNullable<TransformStep['operation']> | 'noop' | ''>
        className="compact recipeField"
        label="Acción"
        labelInfo={<InfoTooltip content={actionHelpText} />}
        value={visibleAction as NonNullable<TransformStep['operation']> | 'noop' | ''}
        options={[
          { value: 'noop', label: useValueAsIsLabel },
          ...numericOperationOptions,
        ]}
        placeholder="Seleccionar acción"
        scrollStrategy="close"
        onChange={(value) => {
          const selection = getNumericStepTypeFromSelection(value);
          onChange(selection.type, 'operation' in selection ? selection.operation : undefined);
        }}
      />
    );
  }

  const options = mode ? getStepTypesForMode(mode, { allowConcat }) : getStepTypeOptions({ allowConcat });
  const textOptions = getTextStepActionOptions(allowPreviousResultSource, allowConcat);
  const visibleOptions = mode === 'text' && onTextSourceAction
    ? textOptions
    : mode === 'conversion' ? getConversionStepActionOptions()
      : options;
  return (
    <div className="stepTypeFieldGroup">
      <Dropdown<StepTextAction>
        className="compact recipeField"
        label="Acción"
        labelInfo={<InfoTooltip content={actionHelpText} />}
        value={visibleAction as StepTextAction}
        options={visibleOptions}
        placeholder="Seleccionar acción"
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
      className="compact recipeField"
      label={operationTypeLabel}
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
  inputCompatibilityRows,
  allowPreviousResult,
  previousResultPreviewValue,
  previousResultDisplay,
  fixedTextInputType = 'text',
  fixedTextDateInputFormat = defaultDateInputFormat,
  fixedTextInputLabel,
  valueKind = 'text',
  dateValueValidator,
  columnTextPickerValueValidator,
  columnTextPickerEmptyLabel,
  columnTextPickerFilteredValuesHelp,
  explicitTextValueSource = false,
  hideFixedTextInput = false,
  hideSourceSelector = false,
  columnTextPickerOpen = false,
  limitColumnTextPickerToCompatibleColumns = true,
  sourceOptionsConfig,
  labelInfoText = 'Indica de donde sale el valor de este paso.',
  afterSourceSelector,
  onChange,
}: {
  label?: string;
  source: StepSource;
  inputColumns: InputColumn[];
  inputRows?: InputRow[];
  inputCompatibilityRows?: InputRow[];
  allowPreviousResult: boolean;
  previousResultPreviewValue?: string | null;
  previousResultDisplay?: PreviousResultDisplay | null;
  fixedTextInputType?: 'text' | 'number' | 'date';
  fixedTextDateInputFormat?: DateInputFormat;
  fixedTextInputLabel?: string;
  valueKind?: StepValueKind;
  dateValueValidator?: (value: string) => boolean;
  columnTextPickerValueValidator?: (value: string) => boolean;
  columnTextPickerEmptyLabel?: string;
  columnTextPickerFilteredValuesHelp?: string;
  explicitTextValueSource?: boolean;
  hideFixedTextInput?: boolean;
  hideSourceSelector?: boolean;
  columnTextPickerOpen?: boolean;
  limitColumnTextPickerToCompatibleColumns?: boolean;
  sourceOptionsConfig?: StepValueSourceOptionsConfig;
  labelInfoText?: string;
  afterSourceSelector?: ReactNode;
  onChange: (source: StepSource, context?: StepSourceChangeContext) => void;
}) {
  const [isColumnTextPickerOpen, setIsColumnTextPickerOpen] = useState(false);
  const [pickedColumnTextSourceIdentity, setPickedColumnTextSourceIdentity] = useState<string | null>(null);
  const safeSource = !allowPreviousResult && source.type === 'previousResult'
    ? { type: 'input' as const, inputColumnId: '' }
    : source;
  const effectiveColumnTextPickerOpen = columnTextPickerOpen || isColumnTextPickerOpen;
  const showPreviousResultField = !effectiveColumnTextPickerOpen && shouldShowPreviousResultSourceHelp(safeSource);
  const previousResultValue = previousResultDisplay?.value ?? previousResultPreviewValue ?? 'Valor dinámico';
  const previousResultHelpText = previousResultDisplay?.helpText ?? recipeEditorPreviousResultHelpText;
  const usesTypedValuePicker = valueKind === 'number' || valueKind === 'date';
  const canPickColumnText = valueKind === 'text';
  const isAllowedDateValue = dateValueValidator ?? isDatePickerValue;
  const pickerValueValidator = columnTextPickerValueValidator
    ?? (valueKind === 'number' ? isNumericPickerValue : valueKind === 'date' ? isAllowedDateValue : undefined);
  const hasInvalidDateSource = valueKind === 'date'
    && safeSource.type === 'fixedText'
    && Boolean(safeSource.value.trim())
    && !isAllowedDateValue(safeSource.value);
  const invalidDateSourceWarning = hasInvalidDateSource && safeSource.type === 'fixedText'
    ? `Este valor no parece una fecha válida. Valor guardado: ${safeSource.value}`
    : '';
  const sourceValue = effectiveColumnTextPickerOpen ? 'columnTextPicker' : getStepSourceDropdownValue(safeSource);
  const sourceOptions = usesTypedValuePicker || explicitTextValueSource
    ? getStepValueSourceOptions(inputColumns, valueKind, allowPreviousResult, explicitTextValueSource, sourceOptionsConfig, inputCompatibilityRows)
    : getStepSourceDropdownOptions(inputColumns, allowPreviousResult, canPickColumnText);
  const compatibleColumns = usesTypedValuePicker ? getCompatibleStepValueInputColumns(inputColumns, valueKind, inputCompatibilityRows) : inputColumns;
  const compatibilityHint = getColumnCompatibilityHint(valueKind, inputColumns.length, compatibleColumns.length);
  const pickerInputColumns = usesTypedValuePicker && limitColumnTextPickerToCompatibleColumns ? compatibleColumns : inputColumns;
  const sourceIdentity = safeSource.type === 'input'
    ? `${safeSource.type}:${safeSource.inputColumnId}`
    : safeSource.type === 'fixedText' ? `${safeSource.type}:${safeSource.value}` : safeSource.type;

  useEffect(() => {
    if (!columnTextPickerOpen && sourceIdentity !== pickedColumnTextSourceIdentity) {
      setIsColumnTextPickerOpen(false);
    }
  }, [columnTextPickerOpen, pickedColumnTextSourceIdentity, sourceIdentity, valueKind]);

  return (
    <>
      {!hideSourceSelector ? (
        <Dropdown
          className="compact recipeField"
          label={label}
          labelInfo={renderLabelInfo(labelInfoText, compatibilityHint)}
          value={sourceValue}
          options={sourceOptions}
          placeholder="Seleccionar fuente"
          scrollStrategy="close"
          onChange={(value) => {
            if (value === 'columnTextPicker') {
              if (valueKind === 'date') {
                setPickedColumnTextSourceIdentity('fixedText:');
                onChange({ type: 'fixedText', value: '' });
              }
              setIsColumnTextPickerOpen(true);
              return;
            }

            setIsColumnTextPickerOpen(false);
            onChange(getStepSourceFromDropdownValue(value, safeSource));
          }}
        />
      ) : null}
      {afterSourceSelector}

      {showPreviousResultField ? (
        <label className="field compact recipeField previousResultValueField">
          <span className="labelWithInfo">
            <span>Resultado anterior</span>
            <InfoTooltip content={previousResultHelpText.split('\n').map((line, index) => (
              <Fragment key={`${index}-${line}`}>
                {index > 0 ? <br /> : null}
                {line}
              </Fragment>
            ))} />
          </span>
          <input readOnly value={previousResultValue} placeholder="Sin valor disponible" />
        </label>
      ) : null}

      {effectiveColumnTextPickerOpen ? (
        <ColumnTextPicker
          inputColumns={pickerInputColumns}
          rows={inputRows}
          value={safeSource.type === 'fixedText' ? safeSource.value : ''}
          columnLabel={valueKind === 'number' ? 'Buscar valores en' : valueKind === 'date' ? 'Buscar fechas en' : undefined}
          columnLabelInfo={compatibilityHint ? <WarningTooltip content={compatibilityHint} ariaLabel="Aviso de compatibilidad" /> : undefined}
          valueLabel={valueKind === 'number' ? 'Valor encontrado' : valueKind === 'date' ? 'Fecha encontrada' : undefined}
          emptyLabel={columnTextPickerEmptyLabel ?? (valueKind === 'number' ? 'No hay valores numéricos disponibles' : valueKind === 'date' ? 'No hay fechas válidas disponibles' : 'No hay textos disponibles')}
          invalidOptionsLabel={columnTextPickerEmptyLabel}
          searchPlaceholder={valueKind === 'number' ? 'Buscar valor' : valueKind === 'date' ? 'Buscar fecha' : undefined}
          isValueAllowed={pickerValueValidator}
          filteredValuesHelp={columnTextPickerFilteredValuesHelp ?? (valueKind === 'date' ? 'Se omitieron valores que no parecen fechas válidas.' : undefined)}
          fieldClassName="recipeField"
          onSelect={(value) => {
            setPickedColumnTextSourceIdentity(`fixedText:${value}`);
            onChange(createFixedTextSourceFromColumnText(value), { origin: 'cellValuePicker' });
          }}
        />
      ) : hideSourceSelector && safeSource.type === 'input' ? (
        <Dropdown
          className="compact recipeField"
          label="Columna de entrada"
          labelInfo={usesTypedValuePicker && compatibilityHint ? <WarningTooltip content={compatibilityHint} ariaLabel="Aviso de compatibilidad" /> : undefined}
          value={safeSource.inputColumnId}
          options={(usesTypedValuePicker ? compatibleColumns : inputColumns).map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))}
          scrollStrategy="close"
          onChange={(inputColumnId) => onChange({ type: 'input', inputColumnId })}
        />
      ) : safeSource.type === 'fixedText' && !hideFixedTextInput ? (
        <label className="field compact recipeField">
          <span className="labelWithInfo">
            <span>{fixedTextInputLabel ?? (fixedTextInputType === 'date' ? 'Fecha fija' : fixedTextInputType === 'number' ? 'Valor fijo' : 'Texto fijo')}</span>
            <InfoTooltip content={fixedTextInputType === 'date' ? 'Fecha manual usada en este paso.' : fixedTextInputType === 'number' ? 'Número manual usado en este paso.' : 'Valor manual usado en este paso.'} />
            {invalidDateSourceWarning ? <WarningTooltip content={invalidDateSourceWarning} /> : null}
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

function isNumericPickerValue(value: string) {
  return Number.isFinite(Number(value.replace(',', '.')));
}

function isDatePickerValue(value: string) {
  return supportedDateInputFormats.some((format) => Boolean(parseDateValue(value, format)));
}

export function StepOperandFields({
  label,
  operand,
  inputColumns,
  allowPreviousResult,
  allowedTypes,
  emptyInputColumnsLabel = 'Sin columnas numéricas disponibles',
  compatibilityHint = '',
  onChange,
}: {
  label: string;
  operand: StepOperand;
  inputColumns: InputColumn[];
  allowPreviousResult: boolean;
  allowedTypes?: StepOperand['type'][];
  emptyInputColumnsLabel?: string;
  compatibilityHint?: string;
  onChange: (operand: StepOperand) => void;
}) {
  const safeOperand = !allowPreviousResult && operand.type === 'previousResult'
    ? { type: 'fixedText' as const, value: '0', numericFallback: 0 }
    : operand;

  return (
    <>
      <Dropdown<StepOperand['type']>
        className="compact recipeField"
        label={label}
        labelInfo={renderLabelInfo('Elige si el valor viene de una columna, un numero fijo o un paso previo.', compatibilityHint)}
        value={safeOperand.type}
        options={[
          ...(allowPreviousResult ? [{ value: 'previousResult' as const, label: 'Resultado del paso anterior' }] : []),
          { value: 'input' as const, label: 'Columna de entrada' },
          { value: 'fixedText' as const, label: 'Valor fijo' },
        ].filter((option) => !allowedTypes || allowedTypes.includes(option.value))}
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

          onChange({ type: 'fixedText', value: '' });
        }}
      />

      {safeOperand.type === 'input' ? (
        <InputColumnSelect
          label={`${label}: columna`}
          value={safeOperand.inputColumnId}
          inputColumns={inputColumns}
          emptyLabel={emptyInputColumnsLabel}
          compatibilityHint={compatibilityHint}
          disableWhenEmpty
          onChange={(inputColumnId) => onChange({ type: 'input', inputColumnId })}
        />
      ) : null}

      {safeOperand.type === 'fixedText' ? (
        <label className="field compact recipeField">
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
  emptyLabel = 'Sin columnas disponibles',
  disableWhenEmpty = false,
  compatibilityHint = '',
  onChange,
}: {
  value: string;
  inputColumns: InputColumn[];
  label?: string;
  emptyLabel?: string;
  disableWhenEmpty?: boolean;
  compatibilityHint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Dropdown
      className="compact recipeField"
      label={label}
      labelInfo={renderLabelInfo('Elegí la columna del Excel que contiene este dato.', compatibilityHint)}
      value={disableWhenEmpty && inputColumns.length === 0 ? '' : value}
      options={inputColumns.length > 0 || !disableWhenEmpty
        ? [
            { value: '', label: 'Seleccionar columna' },
            ...inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) })),
          ]
        : [{ value: '', label: emptyLabel, disabled: true }]}
      disabled={disableWhenEmpty && inputColumns.length === 0}
      scrollStrategy="close"
      onChange={onChange}
    />
  );
}

function renderLabelInfo(helpText: ReactNode, compatibilityHint = '') {
  return (
    <>
      {compatibilityHint ? <WarningTooltip content={compatibilityHint} ariaLabel="Aviso de compatibilidad" /> : null}
      <InfoTooltip content={helpText} />
    </>
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
  const fieldClassName = isManualRangeCondition ? 'compact' : 'compact recipeField';

  return (
    <div className="transformConditionBlock conditionFieldsRow">
      <Dropdown<'always' | 'conditional'>
        className={fieldClassName}
        label={isManualRangeCondition ? 'Aplicar el valor' : 'Condición'}
        labelInfo={<InfoTooltip content={isManualRangeCondition
          ? 'El rango puede incluir filas de título o separación. Esta condición define en qué filas se escribe realmente el valor.'
          : 'Elige si este paso se aplica siempre o solo en algunos casos.'} />}
        value={condition ? 'conditional' : 'always'}
        options={[
          { value: 'always', label: isManualRangeCondition ? 'Aplicar a todas sus filas' : 'Aplicar siempre' },
          { value: 'conditional', label: isManualRangeCondition ? 'Aplicar sólo a filas que cumplan condición' : 'Aplicar solo si...' },
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
          className={fieldClassName}
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
          className={fieldClassName}
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
        <label className={`field ${fieldClassName}`}>
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
