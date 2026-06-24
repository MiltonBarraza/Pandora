import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import type { InputColumn, StepSource } from '../../types/import';
import type { DropdownOption } from '../ui/Dropdown/Dropdown';

export type ValueSourceAction =
  | 'useFixedText'
  | 'useInputColumn'
  | 'pickColumnText'
  | 'useRangeText'
  | 'usePreviousResult';

export type VariableSourceDropdownValue =
  | 'previousResult'
  | 'fixedText'
  | 'rangeText'
  | 'columnTextPicker'
  | `input:${string}`;

export const valueSourceActionLabels: Record<ValueSourceAction, string> = {
  useFixedText: 'Usar texto fijo',
  useInputColumn: 'Usar columna de entrada',
  pickColumnText: 'Elegir texto desde columna',
  useRangeText: 'Texto encontrado en el rango',
  usePreviousResult: 'Usar resultado anterior',
};

export const previousResultSourceLabel = 'Resultado del paso anterior';
export const previousResultShortSourceLabel = 'Resultado anterior';
export const rangeTextSourceLabel = 'Texto encontrado en el rango';

export function getValueSourceActionOptions({
  allowRangeText = false,
  allowPreviousResult = false,
}: {
  allowRangeText?: boolean;
  allowPreviousResult?: boolean;
} = {}): Array<{ value: ValueSourceAction; label: string }> {
  return [
    { value: 'useInputColumn', label: valueSourceActionLabels.useInputColumn },
    { value: 'useFixedText', label: valueSourceActionLabels.useFixedText },
    { value: 'pickColumnText', label: valueSourceActionLabels.pickColumnText },
    ...(allowRangeText ? [{ value: 'useRangeText' as const, label: valueSourceActionLabels.useRangeText }] : []),
    ...(allowPreviousResult ? [{ value: 'usePreviousResult' as const, label: valueSourceActionLabels.usePreviousResult }] : []),
  ];
}

export function getValueSourceAction(source: StepSource, columnTextPickerOpen = false): ValueSourceAction {
  if (columnTextPickerOpen) return 'pickColumnText';
  if (source.type === 'fixedText') return 'useFixedText';
  if (source.type === 'rangeText') return 'useRangeText';
  if (source.type === 'previousResult') return 'usePreviousResult';
  return 'useInputColumn';
}

export function getSourceForValueSourceAction(
  action: ValueSourceAction,
  currentSource: StepSource,
  inputColumns: InputColumn[],
): StepSource {
  if (action === 'usePreviousResult') return { type: 'previousResult' };
  if (action === 'useInputColumn') {
    return currentSource.type === 'input'
      ? currentSource
      : { type: 'input', inputColumnId: inputColumns[0]?.id ?? '' };
  }

  if (action === 'useRangeText') {
    return currentSource.type === 'rangeText'
      ? currentSource
      : { type: 'rangeText', inputColumnId: inputColumns[0]?.id ?? '', selectedText: '' };
  }

  return currentSource.type === 'fixedText' ? currentSource : { type: 'fixedText', value: '' };
}

export function getVariableSourceDropdownValue(source: StepSource): VariableSourceDropdownValue | '' {
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

export function getVariableSourceDropdownOptions(
  inputColumns: InputColumn[],
  {
    allowPreviousResult = false,
    allowColumnTextPicker = true,
    allowRangeText = false,
    rangeTextFirst = false,
    previousResultLabel = previousResultSourceLabel,
  }: {
    allowPreviousResult?: boolean;
    allowColumnTextPicker?: boolean;
    allowRangeText?: boolean;
    rangeTextFirst?: boolean;
    previousResultLabel?: string;
  } = {},
): DropdownOption<VariableSourceDropdownValue>[] {
  const columnTextPickerOption: DropdownOption<VariableSourceDropdownValue>[] = allowColumnTextPicker
    ? [{ value: 'columnTextPicker', label: valueSourceActionLabels.pickColumnText }]
    : [];
  const rangeTextOption: DropdownOption<VariableSourceDropdownValue>[] = allowRangeText
    ? [{ value: 'rangeText', label: rangeTextSourceLabel }]
    : [];
  const previousResultOption: DropdownOption<VariableSourceDropdownValue>[] = allowPreviousResult
    ? [{ value: 'previousResult', label: previousResultLabel }]
    : [];
  const inputColumnOptions: DropdownOption<VariableSourceDropdownValue>[] = inputColumns.map((inputColumn) => ({
    value: `input:${inputColumn.id}`,
    label: getInputColumnLabel(inputColumn),
  }));

  return [
    ...previousResultOption,
    ...(rangeTextFirst ? rangeTextOption : columnTextPickerOption),
    ...(rangeTextFirst ? columnTextPickerOption : rangeTextOption),
    ...inputColumnOptions,
  ];
}

export function getSourceFromVariableDropdownValue(
  value: string,
  currentSource: StepSource,
  { defaultRangeTextInputColumnId = '' }: { defaultRangeTextInputColumnId?: string } = {},
): StepSource {
  if (value === 'previousResult') {
    return { type: 'previousResult' };
  }

  if (value === 'fixedText') {
    return { type: 'fixedText', value: currentSource.type === 'fixedText' ? currentSource.value : '' };
  }

  if (value === 'rangeText') {
    return currentSource.type === 'rangeText'
      ? currentSource
      : { type: 'rangeText', inputColumnId: defaultRangeTextInputColumnId, selectedText: '' };
  }

  if (value.startsWith('input:')) {
    return { type: 'input', inputColumnId: value.slice('input:'.length) };
  }

  return currentSource;
}

export function shouldShowValueSourceSelector(source: StepSource, { hidden = false }: { hidden?: boolean } = {}) {
  return !hidden && source.type !== 'fixedText';
}
