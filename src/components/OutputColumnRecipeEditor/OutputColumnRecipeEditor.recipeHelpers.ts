import {
  defaultDateInputFormat,
  defaultDateInvalidFallback,
  defaultDateOutputFormat,
} from '../../domain/import/dateOperations';
import { createManualRangeRecipe, describeManualRangeStepSummary } from '../../domain/import/manualRangeModel';
import { parseNumericValue } from '../../domain/import/numericOperations';
import type {
  ConcatPart,
  InputColumn,
  OutputColumn,
  OutputRecipe,
  RecipePart,
  StepOperand,
  StepSource,
  TransformCondition,
  TransformStep,
  TransformStepMode,
  TransformStepType,
  CustomValueMode as PersistedCustomValueMode,
} from '../../types/import';
import { previousResultSourceLabel } from './OutputColumnRecipeEditor.actionDefinitions';
import { valueSourceLabel } from './OutputColumnRecipeEditor.constants';
import { getStepTypesForMode } from './OutputColumnRecipeEditor.optionHelpers';

export type EditableCustomRecipe = Extract<OutputRecipe, { type: 'combine' }> | Extract<OutputRecipe, { type: 'manualRange' }>;
export type CustomValueMode = '' | PersistedCustomValueMode;
export type ValueConstructionMode = '' | 'steps' | 'concat';
export type RecipeStudioMode = 'takeValue' | 'fixedText' | 'compose' | 'ranges' | 'advanced';

export const outputRecipeTypeOptions: Array<{ value: OutputRecipe['type']; label: string }> = [
  { value: 'direct', label: 'Directa desde entrada' },
  { value: 'fixedText', label: 'Texto fijo' },
  { value: 'combine', label: 'Crear valor personalizado' },
];

export const valueConstructionOptions: Array<{ value: Exclude<ValueConstructionMode, ''>; label: string }> = [
  { value: 'steps', label: 'Un valor con pasos' },
  { value: 'concat', label: 'Concatenar / unir partes' },
];

export function getOutputRecipeTypeOptions(recipe: OutputRecipe) {
  return recipe.type === 'empty'
    ? [{ value: 'empty' as const, label: 'Sin valor' }, ...outputRecipeTypeOptions]
    : outputRecipeTypeOptions;
}

export function getRecipeEditorModalRecipe(recipe: OutputRecipe, draftRecipe: EditableCustomRecipe | null) {
  return recipe.type === 'combine' || recipe.type === 'manualRange' ? draftRecipe ?? recipe : null;
}

export function getRecipeStudioMode(recipe: OutputRecipe): RecipeStudioMode {
  if (recipe.type === 'direct') {
    return 'takeValue';
  }

  if (recipe.type === 'fixedText') {
    return 'fixedText';
  }

  if (recipe.type === 'manualRange') {
    return 'ranges';
  }

  if (recipe.type !== 'combine') {
    return 'advanced';
  }

  if (hasConfiguredManualRangeStep(recipe)) {
    return 'ranges';
  }

  if (getCustomValueMode(recipe) === 'concat' || hasConfiguredConcatStep(recipe)) {
    return 'compose';
  }

  const simplePart = getSimpleInputPart(recipe);
  const firstSource = getFirstStepSource(recipe);
  const hasSingleTextPart = recipe.parts.length === 1 && recipe.parts[0]?.type === 'text';
  if (firstSource?.type === 'fixedText' || hasSingleTextPart) {
    return 'fixedText';
  }

  if (simplePart.inputColumnId || firstSource?.type === 'input') {
    return 'takeValue';
  }

  return 'advanced';
}

export function applyRecipeEditorDraft(column: OutputColumn, draftRecipe: EditableCustomRecipe | null): OutputColumn {
  return draftRecipe ? { ...column, recipe: draftRecipe } : column;
}

export function clearManualRangeValues(recipe: Extract<OutputRecipe, { type: 'manualRange' }>): Extract<OutputRecipe, { type: 'manualRange' }> {
  return { ...recipe, ranges: [] };
}

export function hasRecipeEditorDraftChanges(originalRecipe: EditableCustomRecipe, draftRecipe: EditableCustomRecipe | null) {
  return Boolean(draftRecipe) && JSON.stringify(originalRecipe) !== JSON.stringify(draftRecipe);
}

export function getOutputRecipeTypeSelectorValue(recipe: OutputRecipe): Exclude<OutputRecipe['type'], 'manualRange'> {
  return recipe.type === 'manualRange' ? 'combine' : recipe.type;
}

export function buildRecipeForSelectedType(
  type: OutputRecipe['type'],
  column: OutputColumn,
  activeInputColumns: InputColumn[],
): OutputRecipe {
  if (type === 'direct') {
    return { type: 'direct', inputColumnId: getDirectInputColumnId(column, activeInputColumns) };
  }

  if (type === 'fixedText') {
    return { type: 'fixedText', value: '' };
  }

  if (type === 'combine') {
    return {
      type: 'combine',
      parts: [],
      separator: '',
    };
  }

  if (type === 'manualRange') {
    return createManualRangeRecipe();
  }

  return { type: 'empty' };
}

export function getCustomValueMode(recipe: Extract<OutputRecipe, { type: 'combine' }>): CustomValueMode {
  if (recipe.customMode) {
    return recipe.customMode;
  }

  if (recipe.parts.length === 0 && (recipe.steps ?? []).length === 0) {
    return '';
  }

  if (isSimpleInputRecipe(recipe)) {
    const steps = recipe.steps ?? [];
    if (steps.length > 0 && steps.some((step) => getStepMode(step) === 'number')) {
      return 'number';
    }

    if (steps.length > 0) {
      return 'text';
    }
  }

  return 'concat';
}

export function isCustomValueConfigured(recipe: Extract<OutputRecipe, { type: 'combine' }>, modeOverride?: CustomValueMode) {
  const mode = modeOverride ?? getCustomValueMode(recipe);

  if (mode === '') {
    return false;
  }

  if (mode === 'number' || mode === 'text') {
    const hasBaseSource = Boolean(getSimpleInputPart(recipe).inputColumnId || getFirstStepSource(recipe) || hasConfiguredManualRangeStep(recipe));
    return Boolean(recipe.steps?.[0] && (hasBaseSource || (mode === 'number' && hasConfiguredNumericStepOperands(recipe))));
  }

  return (
    recipe.parts.length > 0 &&
    recipe.parts.every((part) => part.type === 'text' || Boolean(part.inputColumnId))
  ) || hasConfiguredConcatStep(recipe);
}

export function getFirstStepSource(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return recipe.steps?.[0]?.source;
}

export function hasConfiguredConcatStep(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return (recipe.steps ?? []).some((step) => step.type === 'concat' && (step.parts ?? []).length > 0);
}

export function hasConfiguredNumericStepOperands(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return (recipe.steps ?? []).some((step) => step.type === 'numericOperation' && (step.leftOperand || step.rightOperand));
}

export function hasConfiguredManualRangeStep(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return (recipe.steps ?? []).some((step) => step.type === 'manualRange' && (step.ranges ?? []).length > 0);
}

export function canPreviewNumericValue(recipe: Extract<OutputRecipe, { type: 'combine' }>, sampleInputValues?: Record<string, string>) {
  const part = getSimpleInputPart(recipe);
  const firstStepSource = getFirstStepSource(recipe);
  if ((recipe.steps ?? []).some((step) => step.type === 'numericOperation' && (step.leftOperand || step.rightOperand))) {
    return true;
  }

  if (!sampleInputValues || (!part.inputColumnId && !firstStepSource)) {
    return true;
  }

  const firstStep = recipe.steps?.[0];
  if (firstStep?.type === 'noop' || firstStep?.type === 'extractNumber' || firstStep?.type === 'toText' || (firstStep && isTextStepType(firstStep.type))) {
    return true;
  }

  if (firstStepSource?.type === 'fixedText') {
    return parseNumericValue(firstStepSource.value) !== null;
  }

  const inputColumnId = firstStepSource?.type === 'input' ? firstStepSource.inputColumnId : part.inputColumnId;
  return parseNumericValue(sampleInputValues[inputColumnId]) !== null;
}

export function createCustomValueRecipeForMode(mode: CustomValueMode, current: Extract<OutputRecipe, { type: 'combine' }>): Extract<OutputRecipe, { type: 'combine' }> {
  if (mode === '') {
    return { type: 'combine', parts: [], separator: '' };
  }

  if (mode === 'number') {
    return buildSimpleCustomValueRecipe('number', getSimpleInputPart(current).inputColumnId, current.steps?.[0] ?? createNoopStep(), current);
  }

  if (mode === 'text') {
    return buildSimpleCustomValueRecipe('text', getSimpleInputPart(current).inputColumnId, current.steps?.[0] ?? createNoopStep(), current);
  }

  return {
    ...current,
    customMode: 'concat',
    separator: current.separator ?? '',
    steps: current.steps ?? [],
  };
}

export function getVisibleRecipeSteps(recipe: Extract<OutputRecipe, { type: 'combine' }>, modeOverride?: CustomValueMode): TransformStep[] {
  const mode = modeOverride ?? getCustomValueMode(recipe);

  if (isStepBasedConcatRecipe(recipe)) {
    return ensureAtLeastOneStep(recipe.steps ?? [], 'text');
  }

  if (mode === 'concat') {
    return ensureAtLeastOneStep([
      createConcatStepFromLegacyRecipe(recipe),
      ...(recipe.steps ?? []),
    ], 'text');
  }

  return ensureAtLeastOneStep(recipe.steps ?? [], getDefaultStepModeForRecipe(recipe, mode));
}

function ensureAtLeastOneStep(steps: TransformStep[], fallbackMode: TransformStepMode) {
  return steps.length > 0 ? steps : [createNoopStep(fallbackMode)];
}

export function getDefaultStepModeForRecipe(recipe: Extract<OutputRecipe, { type: 'combine' }>, modeOverride?: CustomValueMode): TransformStepMode {
  const mode = modeOverride ?? getCustomValueMode(recipe);
  if (mode === 'number') {
    return 'number';
  }

  return 'text';
}

function isStepBasedConcatRecipe(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return recipe.parts.length === 0 && (recipe.steps ?? []).some((step) => step.type === 'concat');
}

function createConcatStepFromLegacyRecipe(recipe: Extract<OutputRecipe, { type: 'combine' }>): TransformStep {
  return {
    id: recipe.parts[0]?.id ? `concat-${recipe.parts[0].id}` : crypto.randomUUID(),
    mode: 'text',
    type: 'concat',
    parts: getConcatPartsFromRecipeParts(recipe.parts, recipe.separator),
    applyToEmptyValues: false,
  };
}

export function getConcatPartsFromRecipeParts(parts: RecipePart[], globalSeparator?: string): ConcatPart[] {
  return parts.map((part, index) => {
    const previousPart = parts[index - 1];
    return {
      id: part.id,
      source: getConcatPartFromRecipePart(part).source,
      ...(index > 0 ? { separatorBefore: previousPart?.separatorAfter ?? globalSeparator ?? '' } : {}),
      ...(part.steps ? { steps: part.steps } : {}),
    };
  });
}

export function getConcatPartFromRecipePart(part: RecipePart): ConcatPart {
  return {
    id: part.id,
    source: part.type === 'input'
      ? { type: 'input', inputColumnId: part.inputColumnId }
      : { type: 'fixedText', value: part.value },
    ...(part.steps ? { steps: part.steps } : {}),
  };
}

export function getRecipePartFromConcatPart(part: ConcatPart): RecipePart {
  if (part.source.type === 'input') {
    return {
      id: part.id,
      type: 'input',
      inputColumnId: part.source.inputColumnId,
      ...(part.steps ? { steps: part.steps } : {}),
    };
  }

  if (part.source.type === 'fixedText') {
    return {
      id: part.id,
      type: 'text',
      value: part.source.value,
      ...(part.steps ? { steps: part.steps } : {}),
    };
  }

  return {
    id: part.id,
    type: 'text',
    value: part.source.type === 'rangeText' ? part.source.selectedText : '',
    steps: part.steps ?? [createNoopStep('text')],
  };
}

export function getSafeSelectedConcatPartId(parts: ConcatPart[], selectedPartId: string | null) {
  if (parts.some((part) => part.id === selectedPartId)) {
    return selectedPartId;
  }

  return parts[0]?.id ?? null;
}

export function getNextSelectedConcatPartIdAfterRemove(
  parts: ConcatPart[],
  removedPartId: string,
  selectedPartId: string | null,
) {
  if (selectedPartId !== removedPartId) {
    return getSafeSelectedConcatPartId(parts.filter((part) => part.id !== removedPartId), selectedPartId);
  }

  const removedIndex = parts.findIndex((part) => part.id === removedPartId);
  const nextParts = parts.filter((part) => part.id !== removedPartId);
  return nextParts[removedIndex]?.id ?? nextParts[removedIndex - 1]?.id ?? nextParts[0]?.id ?? null;
}

export function normalizeConcatPartsAfterReorder(parts: ConcatPart[]) {
  const [firstPart, secondPart, ...restParts] = parts;
  if (!firstPart?.separatorBefore || !secondPart || secondPart.separatorBefore) {
    return parts;
  }

  return [
    omitSeparatorBefore(firstPart),
    { ...secondPart, separatorBefore: firstPart.separatorBefore },
    ...restParts,
  ];
}

export function updateConcatPartSteps(parts: ConcatPart[], partId: string, steps: TransformStep[]) {
  return parts.map((part) => (part.id === partId ? { ...part, steps } : part));
}

export function updateConcatPartInList(parts: ConcatPart[], partId: string, patch: Partial<ConcatPart>): ConcatPart[] {
  return parts.map((part) => (part.id === partId ? { ...part, ...patch } : part));
}

export function addConcatPartToList(parts: ConcatPart[], part: ConcatPart): ConcatPart[] {
  return [...parts, part];
}

export function removeConcatPartFromList(
  parts: ConcatPart[],
  partId: string,
  { keepAtLeastOne = false }: { keepAtLeastOne?: boolean } = {},
): ConcatPart[] {
  if (keepAtLeastOne && parts.length <= 1) {
    return parts;
  }

  return parts.filter((part) => part.id !== partId);
}

export function reorderConcatParts(parts: ConcatPart[], orderedPartIds: string[]): ConcatPart[] {
  const partsById = new Map(parts.map((part) => [part.id, part]));
  const movedParts = orderedPartIds.map((id) => partsById.get(id)).filter((part): part is ConcatPart => Boolean(part));
  const remainingParts = parts.filter((part) => !orderedPartIds.includes(part.id));
  return [...movedParts, ...remainingParts];
}

export function updateConcatPartPrimarySource(part: ConcatPart, source: StepSource, steps?: TransformStep[]): ConcatPart {
  return {
    ...part,
    source,
    ...(steps ? { steps } : {}),
  };
}

function omitSeparatorBefore(part: ConcatPart): ConcatPart {
  const { separatorBefore: _separatorBefore, ...nextPart } = part;
  return nextPart;
}

export function describeConcatPartSource(part: ConcatPart, inputColumns: InputColumn[]) {
  const manualRangeStep = findManualRangeStep(part.steps ?? []);

  if (manualRangeStep) {
    return describeManualRangeStepSummary(manualRangeStep, inputColumns);
  }

  const { source } = part;

  if (source.type === 'previousResult') {
    return previousResultSourceLabel;
  }

  if (source.type === 'fixedText') {
    return `Texto fijo "${source.value || ''}"`;
  }

  if (source.type === 'input') {
    const inputColumn = inputColumns.find((column) => column.id === source.inputColumnId);
    return inputColumn ? getInputColumnSummary(inputColumn) : 'Columna de entrada';
  }

  return 'Columna de entrada';
}

function findManualRangeStep(steps: TransformStep[]): TransformStep | undefined {
  for (const step of steps) {
    if (step.type === 'manualRange') {
      return step;
    }

    if (step.type === 'concat') {
      const nestedStep = (step.parts ?? []).reduce<TransformStep | undefined>(
        (foundStep, part) => foundStep ?? findManualRangeStep(part.steps ?? []),
        undefined,
      );

      if (nestedStep) {
        return nestedStep;
      }
    }
  }

  return undefined;
}

export function getVisibleConcatPartPrimaryStep(steps: TransformStep[]) {
  return steps[0] ?? createNoopStep('text');
}

export function updateConcatPartPrimaryStep(steps: TransformStep[], patch: Partial<TransformStep>) {
  const primaryStep = getVisibleConcatPartPrimaryStep(steps);
  return [{ ...primaryStep, ...patch }, ...steps.slice(1)];
}

export function appendConcatPartAdditionalStep(steps: TransformStep[]): TransformStep[] {
  const nextStep = createNoopStep('text');
  return steps.length === 0
    ? [getVisibleConcatPartPrimaryStep(steps), nextStep]
    : [...steps, nextStep];
}

export function createDefaultConcatPart(index: number, preferPreviousResult = false): ConcatPart {
  return {
    id: crypto.randomUUID(),
    source: preferPreviousResult ? { type: 'previousResult' } : { type: 'input', inputColumnId: '' },
    ...(index > 0 ? { separatorBefore: '' } : {}),
  };
}

export function buildStepBasedCustomValueRecipe(
  current: Extract<OutputRecipe, { type: 'combine' }>,
  steps: TransformStep[],
  fallbackMode: TransformStepMode,
): Extract<OutputRecipe, { type: 'combine' }> {
  const firstStep = steps[0];

  if (firstStep?.type === 'concat') {
    return {
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [firstStep],
    };
  }

  const inferredMode = inferCustomModeFromSteps(steps, fallbackMode);
  const firstStepInputColumnId = firstStep?.source?.type === 'input'
    ? firstStep.source.inputColumnId
    : undefined;
  return buildSimpleCustomValueRecipeWithSteps(
    inferredMode,
    firstStepInputColumnId ?? getSimpleInputPart(current).inputColumnId,
    steps,
    current,
  );
}

function inferCustomModeFromSteps(steps: TransformStep[], fallbackMode: TransformStepMode): 'number' | 'text' {
  if (steps.some((step) => getStepMode(step, fallbackMode) === 'number' || step.type === 'numericOperation')) {
    return 'number';
  }

  return 'text';
}

export function createRecipeForConstructionMode(mode: ValueConstructionMode, current: Extract<OutputRecipe, { type: 'combine' }>): Extract<OutputRecipe, { type: 'combine' }> {
  if (mode === '') {
    return { type: 'combine', parts: [], separator: '' };
  }

  if (mode === 'concat') {
    if (current.customMode === 'concat') {
      return { ...current, customMode: 'concat', separator: current.separator ?? '' };
    }

    return { type: 'combine', customMode: 'concat', parts: [], separator: '', steps: [] };
  }

  if (current.customMode === 'number' || current.customMode === 'text') {
    return current;
  }

  return buildSimpleCustomValueRecipeWithSteps('text', '', [createNoopStep('text')], current);
}

export function buildSimpleCustomValueRecipe(
  mode: 'number' | 'text',
  inputColumnId: string,
  step: TransformStep,
  current?: Extract<OutputRecipe, { type: 'combine' }>,
): Extract<OutputRecipe, { type: 'combine' }> {
  return buildSimpleCustomValueRecipeWithSteps(mode, inputColumnId, [step], current);
}

export function buildSimpleCustomValueRecipeWithSteps(
  mode: 'number' | 'text',
  inputColumnId: string,
  steps: TransformStep[],
  current?: Extract<OutputRecipe, { type: 'combine' }>,
): Extract<OutputRecipe, { type: 'combine' }> {
  const existingPart = current?.parts.find((part) => part.type === 'input');
  const nextSteps = steps.map((step, index) => ({
    ...step,
    id: step.id || current?.steps?.[index]?.id || crypto.randomUUID(),
    mode: getStepMode(step, mode),
  }));

  return {
    type: 'combine',
    customMode: mode,
    parts: [{
      id: existingPart?.id ?? crypto.randomUUID(),
      type: 'input',
      inputColumnId,
    }],
    separator: '',
    steps: nextSteps,
  };
}

export function getSimpleInputPart(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  const part = recipe.parts.find((item) => item.type === 'input');
  return part?.type === 'input' ? part : { id: crypto.randomUUID(), type: 'input' as const, inputColumnId: '' };
}

function createNumericOperationStep(operation: NonNullable<TransformStep['operation']> = 'add'): TransformStep {
  return {
    id: crypto.randomUUID(),
    mode: 'number',
    type: 'numericOperation',
    operation,
    amount: 10,
    rounding: 2,
    applyToEmptyValues: false,
  };
}

export function createNoopStep(modeHint: TransformStepMode = 'text'): TransformStep {
  return {
    id: crypto.randomUUID(),
    mode: modeHint,
    type: 'noop',
    applyToEmptyValues: false,
  };
}

function createTextOperationStep(type: TransformStepType, condition?: TransformCondition, stepIndex = 0): TransformStep {
  if (type === 'noop') {
    return {
      id: crypto.randomUUID(),
      mode: 'text',
      type,
      ...(condition ? { condition } : {}),
      applyToEmptyValues: false,
    };
  }

  if (type === 'concat') {
    return {
      id: crypto.randomUUID(),
      mode: 'text',
      type: 'concat',
      parts: [createDefaultConcatPart(0, stepIndex > 0)],
      condition,
      applyToEmptyValues: false,
    };
  }

  if (type === 'formatDate') {
    return {
      id: crypto.randomUUID(),
      mode: 'date',
      type,
      dateInputFormat: defaultDateInputFormat,
      dateOutputFormat: defaultDateOutputFormat,
      dateInvalidFallback: defaultDateInvalidFallback,
      dateInvalidFallbackText: '',
      condition,
      applyToEmptyValues: false,
    };
  }

  if (type === 'manualRange') {
    return createManualRangeStep(condition);
  }

  return {
    id: crypto.randomUUID(),
    mode: inferStepModeFromType(type),
    type,
    ...(shouldDefaultTextTransformToPreviousResult(type, stepIndex) ? { source: { type: 'previousResult' as const } } : {}),
    value: '',
    searchValue: '',
    replaceValue: '',
    condition,
    applyToEmptyValues: false,
  };
}

function createManualRangeStep(condition?: TransformCondition): TransformStep {
  return {
    id: crypto.randomUUID(),
    mode: 'manualRange',
    type: 'manualRange',
    ranges: [],
    condition,
    applyToEmptyValues: false,
  };
}

export function replaceStepType(
  step: TransformStep,
  type: TransformStepType,
  mode: TransformStepMode,
  operation?: NonNullable<TransformStep['operation']>,
  stepIndex = 0,
): Partial<TransformStep> {
  if (type === 'numericOperation') {
    if (step.type === 'numericOperation') {
      return {
        operation: operation ?? step.operation ?? 'add',
        mode,
      };
    }

    return {
      ...createNumericOperationStep(operation),
      id: step.id,
      mode,
      condition: step.condition,
      applyToEmptyValues: step.applyToEmptyValues,
    };
  }

  if (type === 'manualRange') {
    return {
      ...createManualRangeStep(step.condition),
      id: step.id,
      mode,
      applyToEmptyValues: step.applyToEmptyValues,
    };
  }

  return {
    ...createTextOperationStep(type, step.condition, stepIndex),
    id: step.id,
    mode,
    applyToEmptyValues: step.applyToEmptyValues,
  };
}

function shouldDefaultTextTransformToPreviousResult(type: TransformStepType, stepIndex: number) {
  return stepIndex > 0 && [
    'trim',
    'uppercase',
    'lowercase',
    'addPrefix',
    'addSuffix',
    'removeText',
    'replaceText',
  ].includes(type);
}

export function replaceWholeStep(
  steps: TransformStep[],
  id: string,
  nextStep: TransformStep,
) {
  return steps.map((step) => (step.id === id ? nextStep : step));
}

export function replaceWholeStepForAction(
  step: TransformStep,
  type: TransformStepType,
  mode: TransformStepMode,
  operation?: NonNullable<TransformStep['operation']>,
  stepIndex = 0,
): TransformStep {
  if (type === 'noop' && (mode === 'date' || mode === 'number')) {
    return {
      id: step.id,
      mode,
      type,
      source: step.type === 'noop' && step.source ? step.source : { type: 'fixedText', value: '' },
      ...(step.condition ? { condition: step.condition } : {}),
      applyToEmptyValues: step.applyToEmptyValues ?? false,
    };
  }

  if (
    step.type === type
    && getStepMode(step, mode) === mode
    && (type !== 'numericOperation' || step.operation === (operation ?? step.operation ?? 'add'))
  ) {
    return { ...step, mode };
  }

  if (type === 'numericOperation') {
    return {
      ...createNumericOperationStep(operation),
      id: step.id,
      mode,
      condition: step.condition,
      applyToEmptyValues: step.applyToEmptyValues ?? false,
    };
  }

  if (type === 'manualRange') {
    return {
      ...createManualRangeStep(step.condition),
      id: step.id,
      mode,
      applyToEmptyValues: step.applyToEmptyValues ?? false,
    };
  }

  return {
    ...createTextOperationStep(type, step.condition, stepIndex),
    id: step.id,
    mode,
    applyToEmptyValues: step.applyToEmptyValues ?? false,
  };
}

export function replaceWholeStepForMode(
  step: TransformStep,
  mode: TransformStepMode,
  stepIndex = 0,
): TransformStep {
  const currentMode = getStepMode(step);
  if (currentMode === mode && isStepAllowedForMode(step.type, mode)) {
    return { ...step, mode };
  }

  if (mode === 'manualRange') {
    return {
      ...createManualRangeStep(step.condition),
      id: step.id,
      applyToEmptyValues: step.applyToEmptyValues ?? false,
    };
  }

  if (isStepAllowedForMode(step.type, mode) && step.type !== 'noop') {
    return replaceWholeStepForAction(step, step.type, mode, step.operation, stepIndex);
  }

  return createNoopStepFromStep(step, mode);
}

export function normalizeStepsForMode(steps: TransformStep[], fallbackMode: TransformStepMode): TransformStep[] {
  return steps.map((step) => {
    const mode = getStepMode(step, fallbackMode);
    return isStepAllowedForMode(step.type, mode) ? { ...step, mode } : createNoopStepFromStep(step, mode);
  });
}

function isStepAllowedForMode(type: TransformStepType, mode: TransformStepMode) {
  return getStepTypesForMode(mode).some((stepType) => stepType.value === type);
}

export function getVisibleLeftOperand(step: TransformStep, stepSource: StepSource): StepOperand {
  if (step.leftOperand) {
    return step.leftOperand;
  }

  return stepSourceToOperand(stepSource);
}

export function getVisibleRightOperand(step: TransformStep): StepOperand {
  if (step.rightOperand) {
    return step.rightOperand;
  }

  const amount = Number(step.amount ?? 0);
  return {
    type: 'fixedText',
    value: String(step.amount ?? 0),
    ...(Number.isFinite(amount) ? { numericFallback: amount } : {}),
  };
}

function stepSourceToOperand(source: StepSource): StepOperand {
  if (source.type === 'previousResult') {
    return { type: 'previousResult' };
  }

  if (source.type === 'input') {
    return { type: 'input', inputColumnId: source.inputColumnId };
  }

  if (source.type === 'rangeText') {
    return {
      type: 'rangeText',
      inputColumnId: source.inputColumnId,
      selectedText: source.selectedText,
      numericFallback: Number(source.selectedText),
    };
  }

  return {
    type: 'fixedText',
    value: source.value,
    numericFallback: Number(source.value),
  };
}

export function shouldShowTextSourceFields(type: TransformStepType) {
  return [
    'noop',
    'trim',
    'uppercase',
    'lowercase',
    'addPrefix',
    'addSuffix',
    'removeText',
    'replaceText',
    'extractNumber',
    'toNumber',
    'toText',
    'formatDate',
  ].includes(type);
}

export function getTextStepSourceLabel(type: TransformStepType) {
  if (type === 'trim') {
    return 'Valor a limpiar';
  }

  if (type === 'uppercase' || type === 'lowercase') {
    return 'Valor a convertir';
  }

  if (type === 'addPrefix' || type === 'addSuffix' || type === 'removeText' || type === 'replaceText') {
    return 'Valor base';
  }

  if (type === 'extractNumber') {
    return 'Valor del que extraer número';
  }

  if (type === 'toNumber' || type === 'toText') {
    return 'Valor a convertir';
  }

  if (type === 'formatDate') {
    return 'Fecha a formatear';
  }

  return valueSourceLabel;
}

export function changeStepMode(step: TransformStep, mode: TransformStepMode): Partial<TransformStep> {
  if (mode === 'manualRange') {
    if (step.type === 'manualRange') {
      return { mode };
    }

    return {
      ...createManualRangeStep(step.condition),
      id: step.id,
      applyToEmptyValues: step.applyToEmptyValues ?? false,
    };
  }

  return isStepAllowedForMode(step.type, mode) ? { mode } : createNoopStepFromStep(step, mode);
}

function createNoopStepFromStep(step: TransformStep, mode: TransformStepMode): TransformStep {
  return {
    id: step.id,
    mode,
    type: 'noop',
    condition: step.condition,
    applyToEmptyValues: step.applyToEmptyValues ?? false,
  };
}

export function getStepMode(step: TransformStep, fallbackMode: TransformStepMode = 'text'): TransformStepMode {
  return normalizeStepMode(step.mode) ?? (step.type === 'noop' ? fallbackMode : inferStepModeFromType(step.type));
}

function normalizeStepMode(mode?: string): TransformStepMode | undefined {
  return mode === 'text' || mode === 'number' || mode === 'conversion' || mode === 'date' || mode === 'manualRange' ? mode : undefined;
}

export function inferStepModeFromType(type: TransformStepType): TransformStepMode {
  if (type === 'manualRange') {
    return 'manualRange';
  }

  if (type === 'numericOperation') {
    return 'number';
  }

  if (type === 'extractNumber' || type === 'toNumber' || type === 'toText') {
    return 'conversion';
  }

  if (type === 'formatDate') {
    return 'date';
  }

  return 'text';
}

export function getInputColumnSummary(inputColumn: InputColumn) {
  const name = (inputColumn.alias || inputColumn.header || '').trim();

  if (name && name !== inputColumn.columnLetter) {
    return `Columna ${inputColumn.columnLetter} (${name})`;
  }

  return `Columna ${inputColumn.columnLetter}`;
}

function isSimpleInputRecipe(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return recipe.parts.length === 1 && recipe.parts[0]?.type === 'input' && (recipe.steps ?? []).length > 0;
}

function isTextStepType(type: TransformStepType) {
  return ['trim', 'uppercase', 'lowercase', 'addPrefix', 'addSuffix', 'removeText', 'replaceText', 'toText'].includes(type);
}

function getDirectInputColumnId(column: OutputColumn, inputColumns: InputColumn[]) {
  if (column.recipe.type === 'direct' && column.recipe.inputColumnId) {
    return column.recipe.inputColumnId;
  }

  return inputColumns[0]?.id ?? '';
}
