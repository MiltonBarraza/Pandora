import {
  defaultDateInputFormat,
  formatDateValue,
  parseDateValue,
  supportedDateInputFormats,
  supportedDateOutputFormats,
} from '../../domain/import/dateOperations';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import type {
  ConditionOperator,
  DateInputFormat,
  DateInvalidFallback,
  DateOutputFormat,
  InputColumn,
  StepSource,
  TransformCondition,
  TransformStep,
  TransformStepMode,
  TransformStepType,
} from '../../types/import';
import type { DropdownOption } from '../ui/Dropdown/Dropdown';
import { pickCellTextLabel, useValueAsIsLabel } from './OutputColumnRecipeEditor.constants';

export const stepModeOptions: Array<{ value: TransformStepMode; label: string }> = [
  { value: 'text', label: 'Trabajar con texto' },
  { value: 'number', label: 'Trabajar con número' },
  { value: 'conversion', label: 'Conversión' },
  { value: 'date', label: 'Trabajar con fechas' },
  { value: 'manualRange', label: 'Trabajar con rangos' },
];

export function getStepModeOptions({ allowManualRange = true }: { allowManualRange?: boolean } = {}) {
  return allowManualRange ? stepModeOptions : stepModeOptions.filter((option) => option.value !== 'manualRange');
}

export function getDatePickerValue(value: string, inputFormat: DateInputFormat = defaultDateInputFormat) {
  const parsedAsIso = parseDateValue(value, 'YYYY-MM-DD');
  if (parsedAsIso) {
    return formatDateValue(parsedAsIso, 'YYYY-MM-DD');
  }

  const parsedWithInputFormat = parseDateValue(value, inputFormat);
  return parsedWithInputFormat ? formatDateValue(parsedWithInputFormat, 'YYYY-MM-DD') : '';
}

export function getStepSourceDropdownValue(source: StepSource) {
  if (source.type === 'previousResult') {
    return 'previousResult';
  }

  if (source.type === 'fixedText') {
    return 'fixedText';
  }

  return source.inputColumnId ? `input:${source.inputColumnId}` : '';
}

export function getStepSourceDropdownOptions(inputColumns: InputColumn[], allowPreviousResult: boolean, allowColumnTextPicker = true): DropdownOption[] {
  return [
    ...(allowPreviousResult ? [{ value: 'previousResult', label: 'Resultado del paso anterior' }] : []),
    ...(allowColumnTextPicker ? [{ value: 'columnTextPicker', label: pickCellTextLabel }] : []),
    ...inputColumns.map((inputColumn) => ({ value: `input:${inputColumn.id}`, label: getInputColumnLabel(inputColumn) })),
  ];
}

export function getStepSourceFromDropdownValue(value: string, currentSource: StepSource): StepSource {
  if (value === 'previousResult') {
    return { type: 'previousResult' };
  }

  if (value === 'fixedText') {
    return { type: 'fixedText', value: currentSource.type === 'fixedText' ? currentSource.value : '' };
  }

  if (value.startsWith('input:')) {
    return { type: 'input', inputColumnId: value.slice('input:'.length) };
  }

  return currentSource;
}

export function shouldShowPreviousResultSourceHelp(source: StepSource) {
  return source.type === 'previousResult';
}

const stepTypes: Array<{ value: TransformStepType; label: string }> = [
  { value: 'noop', label: useValueAsIsLabel },
  { value: 'trim', label: 'Limpiar espacios' },
  { value: 'uppercase', label: 'Convertir a mayúsculas' },
  { value: 'lowercase', label: 'Convertir a minúsculas' },
  { value: 'addPrefix', label: 'Agregar prefijo' },
  { value: 'addSuffix', label: 'Agregar sufijo' },
  { value: 'removeText', label: 'Quitar texto' },
  { value: 'replaceText', label: 'Reemplazar texto' },
  { value: 'manualRange', label: 'Trabajar con rangos' },
  { value: 'concat', label: 'Concatenar' },
  { value: 'extractNumber', label: 'Usar número del texto' },
  { value: 'toNumber', label: 'Convertir a número' },
  { value: 'toText', label: 'Convertir a texto' },
  { value: 'formatDate', label: 'Formatear fecha' },
  { value: 'numericOperation', label: 'Operación numérica' },
];

const textStepTypes = stepTypes.filter((stepType) => [
  'noop',
  'trim',
  'uppercase',
  'lowercase',
  'addPrefix',
  'addSuffix',
  'removeText',
  'replaceText',
  'concat',
].includes(stepType.value));

export type StepTextSourceAction = 'useFixedText' | 'useInputColumn' | 'pickColumnText' | 'usePreviousResult';
export type StepTextAction = TransformStepType | StepTextSourceAction;

export function getStepTextSourceActionOptions(allowPreviousResult: boolean): Array<{ value: StepTextSourceAction; label: string }> {
  return [
    { value: 'useInputColumn', label: 'Usar columna de entrada' },
    { value: 'useFixedText', label: 'Usar texto fijo' },
    { value: 'pickColumnText', label: pickCellTextLabel },
    ...(allowPreviousResult ? [{ value: 'usePreviousResult' as const, label: 'Usar resultado anterior' }] : []),
  ];
}

export function isStepTextSourceAction(value: StepTextAction): value is StepTextSourceAction {
  return ['useFixedText', 'useInputColumn', 'pickColumnText', 'usePreviousResult'].includes(value);
}

export function getStepTextSourceAction(source: StepSource, columnTextPickerOpen = false): StepTextSourceAction {
  if (columnTextPickerOpen) return 'pickColumnText';
  if (source.type === 'fixedText') return 'useFixedText';
  if (source.type === 'previousResult') return 'usePreviousResult';
  return 'useInputColumn';
}

export function getStepSourceForTextAction(action: StepTextSourceAction, currentSource: StepSource, inputColumns: InputColumn[]): StepSource {
  if (action === 'usePreviousResult') return { type: 'previousResult' };
  if (action === 'useInputColumn') {
    return currentSource.type === 'input'
      ? currentSource
      : { type: 'input', inputColumnId: inputColumns[0]?.id ?? '' };
  }

  return currentSource.type === 'fixedText' ? currentSource : { type: 'fixedText', value: '' };
}

const dateStepTypes = stepTypes.filter((stepType) => [
  'noop',
  'formatDate',
].includes(stepType.value));

const numberStepTypes = stepTypes.filter((stepType) => [
  'noop',
  'numericOperation',
].includes(stepType.value));

const conversionStepTypes = stepTypes.filter((stepType) => [
  'noop',
  'extractNumber',
  'toNumber',
  'toText',
].includes(stepType.value));

export function getStepTypeOptions({ allowConcat = true }: { allowConcat?: boolean } = {}) {
  return allowConcat ? stepTypes : stepTypes.filter((stepType) => stepType.value !== 'concat');
}

export function getStepTypesForMode(mode: TransformStepMode, { allowConcat = true }: { allowConcat?: boolean } = {}) {
  if (mode === 'manualRange') {
    return stepTypes.filter((stepType) => stepType.value === 'manualRange');
  }

  if (mode === 'number') {
    return numberStepTypes;
  }

  if (mode === 'conversion') {
    return conversionStepTypes;
  }

  if (mode === 'date') {
    return dateStepTypes;
  }

  return allowConcat ? textStepTypes : textStepTypes.filter((stepType) => stepType.value !== 'concat');
}

export const conditionOperators: Array<{ value: ConditionOperator; label: string }> = [
  { value: 'isEmpty', label: 'Esta vacio' },
  { value: 'isNotEmpty', label: 'No esta vacio' },
  { value: 'contains', label: 'Contiene' },
  { value: 'notContains', label: 'No contiene' },
  { value: 'equals', label: 'Es igual a' },
  { value: 'notEquals', label: 'No es igual a' },
  { value: 'startsWith', label: 'Empieza con' },
  { value: 'endsWith', label: 'Termina con' },
  { value: 'greaterThan', label: 'Mayor que' },
  { value: 'greaterThanOrEqual', label: 'Mayor o igual que' },
  { value: 'lessThan', label: 'Menor que' },
  { value: 'lessThanOrEqual', label: 'Menor o igual que' },
  { value: 'numericEquals', label: 'Igual numérico' },
  { value: 'numericNotEquals', label: 'Distinto numérico' },
];

const numericOperationLabels: Record<NonNullable<TransformStep['operation']>, string> = {
  add: 'Sumar valor',
  subtract: 'Restar valor',
  multiply: 'Multiplicar por',
  divide: 'Dividir por',
  addPercentage: 'Sumar %',
  subtractPercentage: 'Restar %',
  removeIncludedPercentage: 'Quitar % incluido',
};

export const numericOperationOptions = Object.entries(numericOperationLabels).map(([value, label]) => ({
  value: value as NonNullable<TransformStep['operation']>,
  label,
}));

export const dateInputFormatOptions: Array<{ value: DateInputFormat; label: string }> = supportedDateInputFormats.map((format) => ({
  value: format,
  label: getDateInputFormatLabel(format),
}));

export const dateOutputFormatOptions: Array<{ value: DateOutputFormat; label: string }> = supportedDateOutputFormats.map((format) => ({
  value: format,
  label: getDateOutputFormatLabel(format),
}));

export const dateInvalidFallbackOptions: Array<{ value: DateInvalidFallback; label: string }> = [
  { value: 'empty', label: 'Dejar vacío' },
  { value: 'original', label: 'Mantener valor original' },
  { value: 'fixedText', label: 'Usar texto fijo' },
];

function getDateInputFormatLabel(format: DateInputFormat) {
  const labels: Record<DateInputFormat, string> = {
    'DD/MM/YYYY': 'DD/MM/AAAA',
    'D/M/YYYY': 'D/M/AAAA',
    'YYYY-MM-DD': 'AAAA-MM-DD',
    'MM/DD/YYYY': 'MM/DD/AAAA',
    'M/D/YYYY': 'M/D/AAAA',
    'DD-MM-YYYY': 'DD-MM-AAAA',
    'YYYY/MM/DD': 'AAAA/MM/DD',
    'DD/MM/YY': 'DD/MM/AA',
    'D/M/YY': 'D/M/AA',
    'MM/DD/YY': 'MM/DD/AA',
    'M/D/YY': 'M/D/AA',
  };

  return labels[format];
}

function getDateOutputFormatLabel(format: DateOutputFormat) {
  const labels: Record<DateOutputFormat, string> = {
    'DD/MM/YYYY': 'DD/MM/AAAA',
    'YYYY-MM-DD': 'AAAA-MM-DD',
    'MM/DD/YYYY': 'MM/DD/AAAA',
    'DD-MM-YYYY': 'DD-MM-AAAA',
    'YYYY/MM/DD': 'AAAA/MM/DD',
  };

  return labels[format];
}

export function createDefaultCondition(inputColumns: InputColumn[]): TransformCondition {
  return {
    target: 'input',
    columnId: inputColumns[0]?.id ?? '',
    operator: 'isNotEmpty',
    value: '',
    valueType: 'text',
  };
}

export function normalizeConditionToInput(condition: TransformCondition, inputColumns: InputColumn[]): TransformCondition {
  return {
    ...condition,
    target: 'input',
    columnId: inputColumns.some((column) => column.id === condition.columnId)
      ? condition.columnId
      : inputColumns[0]?.id ?? '',
  };
}

export function conditionNeedsValue(operator: ConditionOperator) {
  return operator !== 'isEmpty' && operator !== 'isNotEmpty';
}

export function isNumericConditionOperator(operator: ConditionOperator) {
  return [
    'greaterThan',
    'greaterThanOrEqual',
    'lessThan',
    'lessThanOrEqual',
    'numericEquals',
    'numericNotEquals',
  ].includes(operator);
}

export function updateStep(steps: TransformStep[], id: string, patch: Partial<TransformStep>) {
  return steps.map((step) => (step.id === id ? { ...step, ...patch } : step));
}

export function getSimpleStepValue(steps: TransformStep[], type: 'addPrefix' | 'addSuffix') {
  return steps.find((step) => step.type === type)?.value ?? '';
}

export function setSimpleStep(steps: TransformStep[], type: 'addPrefix' | 'addSuffix', value: string): TransformStep[] {
  const nextSteps = steps.filter((step) => step.type !== type);
  if (value === '') {
    return nextSteps;
  }

  const nextStep: TransformStep = {
    id: crypto.randomUUID(),
    type,
    value,
  };

  return type === 'addPrefix' ? [nextStep, ...nextSteps] : [...nextSteps, nextStep];
}

export function parseRounding(value: string): TransformStep['rounding'] {
  if (value === 'none') {
    return 'none';
  }

  if (value === '0') {
    return 0;
  }

  if (value === '4') {
    return 4;
  }

  return 2;
}
