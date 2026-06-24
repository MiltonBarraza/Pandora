import type { InputColumn, StepSource } from '../../types/import';
import { pickColumnTextLabel } from './OutputColumnRecipeEditor.constants';

export type ValueSourceAction = 'useFixedText' | 'useInputColumn' | 'pickColumnText' | 'usePreviousResult';
export type RangeValueSourceAction = ValueSourceAction | 'useRangeText';
export type SourceDropdownValue = 'previousResult' | 'fixedText' | 'rangeText' | `input:${string}` | '';

type ValueSourceActionOptions = {
  allowPreviousResult?: boolean;
  allowRangeText?: boolean;
};

type ValueSourceFieldVisibilityOptions = {
  columnTextPickerOpen?: boolean;
  hideFixedTextInput?: boolean;
  hideSourceSelector?: boolean;
};

type SourceForValueActionOptions = {
  rangeTextInputColumnId?: string;
};

type SourceDropdownOptions = {
  allowRangeText?: boolean;
};

export function getValueSourceActionOptions(
  options: ValueSourceActionOptions & { allowRangeText: true },
): Array<{ value: RangeValueSourceAction; label: string }>;
export function getValueSourceActionOptions(
  options?: ValueSourceActionOptions & { allowRangeText?: false },
): Array<{ value: ValueSourceAction; label: string }>;
export function getValueSourceActionOptions({
  allowPreviousResult = false,
  allowRangeText = false,
}: ValueSourceActionOptions = {}): Array<{ value: RangeValueSourceAction; label: string }> {
  return [
    { value: 'useInputColumn', label: 'Usar columna de entrada' },
    { value: 'useFixedText', label: 'Usar texto fijo' },
    { value: 'pickColumnText', label: pickColumnTextLabel },
    ...(allowRangeText ? [{ value: 'useRangeText' as const, label: 'Texto encontrado en el rango' }] : []),
    ...(allowPreviousResult ? [{ value: 'usePreviousResult' as const, label: 'Usar resultado anterior' }] : []),
  ];
}

export function isValueSourceAction(value: string): value is RangeValueSourceAction {
  return ['useFixedText', 'useInputColumn', 'pickColumnText', 'useRangeText', 'usePreviousResult'].includes(value);
}

export function isCommonValueSourceAction(value: string): value is ValueSourceAction {
  return value !== 'useRangeText' && isValueSourceAction(value);
}

export function getValueSourceAction(
  source: StepSource,
  options: Pick<ValueSourceActionOptions, 'allowRangeText'> & { allowRangeText: true; columnTextPickerOpen?: boolean },
): RangeValueSourceAction;
export function getValueSourceAction(
  source: StepSource,
  options?: Pick<ValueSourceActionOptions, 'allowRangeText'> & { allowRangeText?: false; columnTextPickerOpen?: boolean },
): ValueSourceAction;
export function getValueSourceAction(
  source: StepSource,
  { columnTextPickerOpen = false, allowRangeText = false }: Pick<ValueSourceActionOptions, 'allowRangeText'> & { columnTextPickerOpen?: boolean } = {},
): RangeValueSourceAction {
  return resolveValueSourceActionFromType(source.type, { columnTextPickerOpen, allowRangeText });
}

export function getValueSourceActionFromType(
  sourceType: StepSource['type'],
  options: Pick<ValueSourceActionOptions, 'allowRangeText'> & { allowRangeText: true; columnTextPickerOpen?: boolean },
): RangeValueSourceAction;
export function getValueSourceActionFromType(
  sourceType: StepSource['type'],
  options?: Pick<ValueSourceActionOptions, 'allowRangeText'> & { allowRangeText?: false; columnTextPickerOpen?: boolean },
): ValueSourceAction;
export function getValueSourceActionFromType(
  sourceType: StepSource['type'],
  { columnTextPickerOpen = false, allowRangeText = false }: Pick<ValueSourceActionOptions, 'allowRangeText'> & { columnTextPickerOpen?: boolean } = {},
): RangeValueSourceAction {
  return resolveValueSourceActionFromType(sourceType, { columnTextPickerOpen, allowRangeText });
}

function resolveValueSourceActionFromType(
  sourceType: StepSource['type'],
  { columnTextPickerOpen, allowRangeText }: { columnTextPickerOpen: boolean; allowRangeText: boolean },
): RangeValueSourceAction {
  if (columnTextPickerOpen) return 'pickColumnText';
  if (sourceType === 'fixedText') return 'useFixedText';
  if (sourceType === 'previousResult') return 'usePreviousResult';
  if (allowRangeText && sourceType === 'rangeText') return 'useRangeText';
  return 'useInputColumn';
}

export function getSourceForValueAction(
  action: RangeValueSourceAction,
  currentSource: StepSource,
  inputColumns: InputColumn[],
  { rangeTextInputColumnId = inputColumns[0]?.id ?? '' }: SourceForValueActionOptions = {},
): StepSource {
  if (action === 'usePreviousResult') {
    return { type: 'previousResult' };
  }

  if (action === 'useInputColumn') {
    return currentSource.type === 'input'
      ? currentSource
      : { type: 'input', inputColumnId: inputColumns[0]?.id ?? '' };
  }

  if (action === 'useRangeText') {
    return currentSource.type === 'rangeText'
      ? currentSource
      : { type: 'rangeText', inputColumnId: rangeTextInputColumnId, selectedText: '' };
  }

  return currentSource.type === 'fixedText' ? currentSource : { type: 'fixedText', value: '' };
}

export function getManualRangeSourceTypeForAction(
  action: RangeValueSourceAction,
): 'input' | 'fixedText' | 'rangeText' {
  if (action === 'useFixedText' || action === 'pickColumnText') return 'fixedText';
  if (action === 'useRangeText') return 'rangeText';
  return 'input';
}

export function getSourceDropdownValue(source: StepSource, { allowRangeText = false }: SourceDropdownOptions = {}): SourceDropdownValue {
  if (source.type === 'previousResult') return 'previousResult';
  if (source.type === 'fixedText') return 'fixedText';
  if (allowRangeText && source.type === 'rangeText') return 'rangeText';
  return source.inputColumnId ? `input:${source.inputColumnId}` : '';
}

export function getSourceFromDropdownValue(
  value: string,
  currentSource: StepSource,
  { allowRangeText = false }: SourceDropdownOptions = {},
): StepSource {
  if (value === 'previousResult') return { type: 'previousResult' };
  if (value === 'fixedText') {
    return currentSource.type === 'fixedText' ? currentSource : { type: 'fixedText', value: '' };
  }
  if (allowRangeText && value === 'rangeText') {
    return currentSource.type === 'rangeText'
      ? currentSource
      : { type: 'rangeText', inputColumnId: '', selectedText: '' };
  }
  if (value.startsWith('input:')) {
    return { type: 'input', inputColumnId: value.slice('input:'.length) };
  }
  return currentSource;
}

export function getValueSourceFieldVisibility(
  sourceType: StepSource['type'],
  {
    columnTextPickerOpen = false,
    hideFixedTextInput = false,
    hideSourceSelector = false,
  }: ValueSourceFieldVisibilityOptions = {},
) {
  return {
    showSourceSelector: !hideSourceSelector,
    showColumnTextPicker: columnTextPickerOpen,
    showInputColumnSelect: !columnTextPickerOpen && hideSourceSelector && sourceType === 'input',
    showFixedTextInput: !columnTextPickerOpen && sourceType === 'fixedText' && !hideFixedTextInput,
    showRangeTextFields: !columnTextPickerOpen && sourceType === 'rangeText',
  };
}
