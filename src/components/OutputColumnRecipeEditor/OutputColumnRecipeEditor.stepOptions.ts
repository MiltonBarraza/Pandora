import { parseDateValue, supportedDateInputFormats } from '../../domain/import/dateOperations';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { manualRangeValueSourceOptions } from '../../domain/import/manualRangeModel';
import type { InputColumn, InputRow, NumericOperation, StepOperand, TransformStep, TransformStepMode } from '../../types/import';
import type { DropdownOption } from '../ui/Dropdown/Dropdown';
import {
  cellValuePickerActionLabels,
  getRecipeStepActionLabel,
  getRecipeStepModeLabel,
  previousResultFieldLabel,
  previousResultActionLabel,
  previousResultSourceLabel,
  recipeStepActionLabels,
} from './OutputColumnRecipeEditor.actionDefinitions';
import {
  getAllowedStepActions,
  getAllowedStepModes,
  getAllowedTextTransformerSourceActions,
  getStepEditorContextFacts,
  isTextTransformerAction,
  type StepEditorContext,
  type VisibleStepAction,
} from './OutputColumnRecipeEditor.stepPolicy';
import {
  getStepSourceDropdownOptions,
  getStepTypeOptions,
  getStepTypesForMode,
  numericOperationOptions,
  type StepTextAction,
} from './OutputColumnRecipeEditor.optionHelpers';
import type { StepValueKind, StepValueSourceOptionsConfig } from './OutputColumnRecipeEditor.StepFields';

export type StepEditorActionOptionValue = Exclude<VisibleStepAction, 'unconfigured'> | NumericOperation;
export type StepValueSourceKind = 'previousResult' | 'input' | 'fixedText' | 'columnTextPicker';

export type LegacyStepTypeSelectOptionsInput = {
  mode?: TransformStepMode;
  allowConcat?: boolean;
  hasTextSourceAction?: boolean;
};

export function getStepModeOptionsForContext(context: StepEditorContext) {
  return getAllowedStepModes(context).map((mode) => ({ value: mode, label: getRecipeStepModeLabel(mode) }));
}

export function getStepActionOptionsForContext(
  mode: TransformStepMode,
  context: StepEditorContext,
  visibleAction: VisibleStepAction,
): Array<{ value: StepEditorActionOptionValue; label: string }> {
  const actions = getAllowedStepActions(mode, context)
    .filter((action) => action !== 'unconfigured');
  const actionsWithCurrent = includeCurrentVisibleAction(actions, visibleAction);

  if (mode === 'number' && actions.includes('numericOperation')) {
    return [
      ...actionsWithCurrent
        .filter((action) => action !== 'numericOperation')
        .map((action) => ({ value: action as Exclude<VisibleStepAction, 'unconfigured'>, label: getRecipeStepActionLabel(action as Exclude<VisibleStepAction, 'unconfigured'>) })),
      ...numericOperationOptions,
    ];
  }

  return actionsWithCurrent.map((action) => ({ value: action as Exclude<VisibleStepAction, 'unconfigured'>, label: getRecipeStepActionLabel(action as Exclude<VisibleStepAction, 'unconfigured'>) }));
}

export function getStepSourceOptionsConfigForStep(step: TransformStep, context: StepEditorContext): StepValueSourceOptionsConfig | undefined {
  const contextFacts = getStepEditorContextFacts(context);
  if (contextFacts.isFollowUpStep && shouldShowTextSourceFieldsForOptions(step.type)) {
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
    ? [{ value: 'previousResult', label: previousResultActionLabel }]
    : [];
  const fixedTextOptions = isAllowed('fixedText')
    ? [{ value: 'fixedText', label: config.fixedTextLabel ?? (valueKind === 'number' ? 'Valor fijo' : valueKind === 'date' ? 'Fecha fija' : 'Texto fijo') }]
    : [];
  const pickerOptions = isAllowed('columnTextPicker')
    ? [{ value: 'columnTextPicker', label: config.columnTextPickerLabel ?? (valueKind === 'number' ? cellValuePickerActionLabels.number : valueKind === 'date' ? cellValuePickerActionLabels.date : cellValuePickerActionLabels.text) }]
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

export function getCompatibleStepValueInputColumns(
  inputColumns: InputColumn[],
  valueKind: StepValueKind,
  compatibilityRows?: InputRow[],
) {
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

export function getStepOperandTypeOptions(
  allowPreviousResult: boolean,
  allowedTypes?: StepOperand['type'][],
) {
  return [
    ...(allowPreviousResult ? [{ value: 'previousResult' as const, label: previousResultSourceLabel }] : []),
    { value: 'input' as const, label: 'Columna de entrada' },
    { value: 'fixedText' as const, label: 'Valor fijo' },
  ].filter((option) => !allowedTypes || allowedTypes.includes(option.value));
}

export function getLegacyNumericStepActionOptions() {
  return [
    { value: 'noop' as const, label: recipeStepActionLabels.useValueAsIs },
    ...numericOperationOptions,
  ];
}

export function getLegacyTextStepActionOptions(_allowPreviousResult: boolean, allowConcat = true): Array<{ value: StepTextAction; label: string }> {
  return [
    { value: 'useInputColumn', label: recipeStepActionLabels.useInputColumn },
    { value: 'useFixedText', label: recipeStepActionLabels.useFixedText },
    { value: 'pickColumnText', label: recipeStepActionLabels.pickColumnText },
    ...getStepTypesForMode('text', { allowConcat }).filter((option) => option.value !== 'noop'),
  ];
}

export function getLegacyConversionStepActionOptions() {
  return getStepTypesForMode('conversion').filter((option) => option.value !== 'noop');
}

export function getLegacyStepTypeSelectOptions({
  mode,
  allowConcat = true,
  hasTextSourceAction = false,
}: LegacyStepTypeSelectOptionsInput): Array<{ value: StepTextAction; label: string }> {
  if (mode === 'text' && hasTextSourceAction) {
    return getLegacyTextStepActionOptions(false, allowConcat);
  }

  if (mode === 'conversion') {
    return getLegacyConversionStepActionOptions();
  }

  return mode ? getStepTypesForMode(mode, { allowConcat }) : getStepTypeOptions({ allowConcat });
}

export function getInputColumnOptions(
  inputColumns: InputColumn[],
  emptyLabel: string,
  options: { includeBlankOption?: boolean; blankLabel?: string } = {},
): DropdownOption[] {
  if (inputColumns.length === 0) {
    return [{ value: '', label: emptyLabel }];
  }

  return [
    ...(options.includeBlankOption ? [{ value: '', label: options.blankLabel ?? 'Seleccionar' }] : []),
    ...inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) })),
  ];
}

export function getRangeValueSourceDropdownOptions(inputColumns: InputColumn[]) {
  return [
    ...manualRangeValueSourceOptions.filter((option) => option.value !== 'input' && option.value !== 'fixedText'),
    { value: 'columnTextPicker' as const, label: recipeStepActionLabels.pickColumnText },
    ...inputColumns.map((inputColumn) => ({ value: `input:${inputColumn.id}` as const, label: getInputColumnLabel(inputColumn) })),
  ];
}

export function getRangeValueConcatPartSourceDropdownOptions(inputColumns: InputColumn[]) {
  return [
    { value: 'previousResult' as const, label: previousResultFieldLabel },
    { value: 'columnTextPicker' as const, label: recipeStepActionLabels.pickColumnText },
    { value: 'rangeText' as const, label: recipeStepActionLabels.useRangeText },
    ...inputColumns.map((inputColumn) => ({ value: `input:${inputColumn.id}` as const, label: getInputColumnLabel(inputColumn) })),
  ];
}

function includeCurrentVisibleAction(actions: VisibleStepAction[], visibleAction: VisibleStepAction): VisibleStepAction[] {
  if (visibleAction === 'unconfigured' || actions.includes(visibleAction)) {
    return actions;
  }

  return [visibleAction, ...actions];
}

function getFollowUpSourceTypes(source: TransformStep['source']): StepValueSourceOptionsConfig['allowedSources'] {
  return [
    'previousResult',
    ...(source?.type === 'input' ? ['input' as const] : []),
    ...(source?.type === 'fixedText' ? ['fixedText' as const] : []),
  ];
}

function shouldShowTextSourceFieldsForOptions(type: TransformStep['type']) {
  return [
    'noop',
    'trim',
    'uppercase',
    'lowercase',
    'addPrefix',
    'addSuffix',
    'removeText',
    'replaceText',
    'formatDate',
    'extractNumber',
    'toNumber',
    'toText',
  ].includes(type);
}

function isNumericPickerValue(value: string) {
  return Number.isFinite(Number(value.replace(',', '.')));
}

function isDatePickerValue(value: string) {
  return supportedDateInputFormats.some((format) => Boolean(parseDateValue(value, format)));
}
