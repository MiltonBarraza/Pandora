import {
  defaultDateInputFormat,
  defaultDateInvalidFallback,
  defaultDateOutputFormat,
} from '../../domain/import/dateOperations';
import type { ConcatPart, StepSource, TransformStep, TransformStepMode, TransformStepType } from '../../types/import';

export type StepEditorContextKind = 'normal' | 'concat' | 'range' | 'rangeConcat';
export type StepSourceAction = 'useInputColumn' | 'useFixedText' | 'pickColumnText' | 'usePreviousResult' | 'useRangeText';
export type VisibleStepAction = 'unconfigured' | 'useValueAsIs' | StepSourceAction | Exclude<TransformStepType, 'noop'>;

export type StepEditorContext = {
  kind: StepEditorContextKind;
  stepIndex?: number;
  partIndex?: number;
  defaultInputColumnId?: string;
  sourceActionOverride?: StepSourceAction;
  idFactory?: () => string;
};

export type StepEditorPolicy = {
  allowManualRange: boolean;
  allowConcat: boolean;
  allowPreviousResult: boolean;
  allowRangeText: boolean;
  allowNestedRanges: boolean;
  isConcatPart: boolean;
  isRangeValueEditor: boolean;
  stepIndex: number;
};

const textTransformActions: Array<Exclude<TransformStepType, 'noop' | 'manualRange' | 'numericOperation' | 'formatDate' | 'extractNumber' | 'toNumber' | 'toText'>> = [
  'trim',
  'uppercase',
  'lowercase',
  'addPrefix',
  'addSuffix',
  'removeText',
  'replaceText',
  'concat',
];

const conversionActions: Array<Extract<VisibleStepAction, 'extractNumber' | 'toNumber' | 'toText'>> = ['extractNumber', 'toNumber', 'toText'];

export function stepEditorPolicy(context: StepEditorContext): StepEditorPolicy {
  const stepIndex = context.stepIndex ?? 0;
  const isConcatPart = context.kind === 'concat' || context.kind === 'rangeConcat';
  const isRangeValueEditor = context.kind === 'range' || context.kind === 'rangeConcat';

  return {
    allowManualRange: context.kind === 'normal',
    allowConcat: context.kind === 'normal' || context.kind === 'range',
    allowPreviousResult: stepIndex > 0,
    allowRangeText: isRangeValueEditor,
    allowNestedRanges: false,
    isConcatPart,
    isRangeValueEditor,
    stepIndex,
  };
}

export function getAllowedStepModes(context: StepEditorContext): TransformStepMode[] {
  const policy = stepEditorPolicy(context);
  return [
    'text',
    'number',
    'conversion',
    'date',
    ...(policy.allowManualRange ? ['manualRange' as const] : []),
  ];
}

export function getAllowedStepActions(mode: TransformStepMode, context: StepEditorContext): VisibleStepAction[] {
  const policy = stepEditorPolicy(context);

  if (mode === 'manualRange') {
    return policy.allowManualRange ? ['manualRange'] : [];
  }

  if (mode === 'number') {
    return ['useValueAsIs', 'numericOperation'];
  }

  if (mode === 'date') {
    return ['useValueAsIs', 'formatDate'];
  }

  if (mode === 'conversion') {
    return conversionActions;
  }

  return [
    ...getAllowedSourceActions({ mode: 'text', type: 'noop' }, context),
    ...textTransformActions.filter((action) => action !== 'concat' || policy.allowConcat),
  ];
}

export function getAllowedSourceActions(step: Pick<TransformStep, 'mode' | 'type' | 'source'>, context: StepEditorContext): StepSourceAction[] {
  const policy = stepEditorPolicy(context);
  const mode = getStepModeForPolicy(step, step.mode ?? 'text');
  const actions: StepSourceAction[] = ['useInputColumn', 'useFixedText', 'pickColumnText'];

  if (policy.allowRangeText && mode !== 'number' && mode !== 'date') {
    actions.push('useRangeText');
  }

  if (policy.allowPreviousResult) {
    actions.push('usePreviousResult');
  }

  return actions;
}

export function getVisibleStepAction(step: TransformStep, context: StepEditorContext): VisibleStepAction {
  const policy = stepEditorPolicy(context);
  const mode = getStepModeForPolicy(step);

  if (!getAllowedStepModes(context).includes(mode)) {
    return 'unconfigured';
  }

  if (step.type === 'noop') {
    if (!step.source) {
      return 'unconfigured';
    }

    if (!isSourceAllowedForContext(step.source, mode, policy)) {
      return 'unconfigured';
    }

    if (mode === 'text') {
      return getSourceAction(step.source, context) ?? 'unconfigured';
    }

    return 'useValueAsIs';
  }

  if (step.type === 'manualRange') {
    return policy.allowManualRange ? 'manualRange' : 'unconfigured';
  }

  if (step.type === 'concat') {
    return policy.allowConcat ? 'concat' : 'unconfigured';
  }

  if (!getAllowedStepActions(mode, context).includes(step.type)) {
    return 'unconfigured';
  }

  return step.type;
}

export function isVisibleStepActionConfigured(step: TransformStep, context: StepEditorContext) {
  return getVisibleStepAction(step, context) !== 'unconfigured';
}

export function createCanonicalStepForMode(mode: TransformStepMode, context: StepEditorContext): TransformStep {
  if (!getAllowedStepModes(context).includes(mode)) {
    return createCanonicalStepForMode('text', context);
  }

  if (mode === 'manualRange') {
    return {
      id: createStepId(context),
      mode: 'manualRange',
      type: 'manualRange',
      ranges: [],
      applyToEmptyValues: false,
    };
  }

  return {
    id: createStepId(context),
    mode,
    type: 'noop',
    applyToEmptyValues: false,
  };
}

export function createCanonicalStepForAction(
  mode: TransformStepMode,
  action: VisibleStepAction | 'noop',
  context: StepEditorContext,
): TransformStep {
  return buildCanonicalStep(mode, action, context, createStepId(context));
}

export function replaceStepActionWithSource(
  step: TransformStep,
  action: VisibleStepAction | 'noop',
  context: StepEditorContext,
): TransformStep {
  const mode = action === 'manualRange'
    ? 'manualRange'
    : action === 'numericOperation' ? 'number'
      : action === 'formatDate' ? 'date'
        : isConversionAction(action) ? 'conversion'
          : getStepModeForPolicy(step);
  const nextStep = buildCanonicalStep(mode, action, { ...context, sourceActionOverride: undefined }, step.id);

  return {
    ...nextStep,
    ...(step.condition ? { condition: step.condition } : {}),
    applyToEmptyValues: step.applyToEmptyValues ?? false,
  };
}

export function normalizeStepForContext(step: TransformStep, context: StepEditorContext): TransformStep {
  const visibleAction = getVisibleStepAction(step, context);
  if (visibleAction === 'unconfigured') {
    return createCanonicalStepForMode(getFirstAllowedMode(getStepModeForPolicy(step), context), {
      ...context,
      idFactory: () => step.id,
    });
  }

  const nextStep = replaceStepActionWithSource(step, visibleAction, context);

  if (step.type === 'addPrefix' || step.type === 'addSuffix' || step.type === 'removeText') {
    return { ...nextStep, value: step.value ?? '' };
  }

  if (step.type === 'replaceText') {
    return { ...nextStep, searchValue: step.searchValue ?? '', replaceValue: step.replaceValue ?? '' };
  }

  if (step.type === 'numericOperation') {
    return {
      ...nextStep,
      operation: step.operation ?? 'add',
      amount: step.amount ?? 10,
      ...(step.leftOperand ? { leftOperand: normalizeSourceForContext(step.leftOperand, 'number', stepEditorPolicy(context)) } : {}),
      ...(step.rightOperand ? { rightOperand: normalizeSourceForContext(step.rightOperand, 'number', stepEditorPolicy(context)) } : {}),
      rounding: step.rounding ?? 2,
    };
  }

  if (step.type === 'formatDate') {
    return {
      ...nextStep,
      dateInputFormat: step.dateInputFormat ?? defaultDateInputFormat,
      dateOutputFormat: step.dateOutputFormat ?? defaultDateOutputFormat,
      dateInvalidFallback: step.dateInvalidFallback ?? defaultDateInvalidFallback,
      dateInvalidFallbackText: step.dateInvalidFallbackText ?? '',
    };
  }

  if (step.type === 'concat') {
    return {
      ...nextStep,
      parts: (step.parts?.length ? step.parts : createDefaultConcatParts(context)).map((part) => normalizeConcatPartForContext(part, context)),
    };
  }

  if (step.type === 'manualRange') {
    return {
      ...nextStep,
      ranges: step.ranges ?? [],
      ...(step.manualRangeCondition ? { manualRangeCondition: step.manualRangeCondition } : {}),
    };
  }

  return nextStep;
}

export function createCanonicalSourceForAction(action: StepSourceAction, context: StepEditorContext): StepSource {
  const policy = stepEditorPolicy(context);
  if (action === 'usePreviousResult' && policy.allowPreviousResult) {
    return { type: 'previousResult' };
  }

  if (action === 'useRangeText' && policy.allowRangeText) {
    return { type: 'rangeText', inputColumnId: context.defaultInputColumnId ?? '', selectedText: '' };
  }

  if (action === 'useInputColumn') {
    return { type: 'input', inputColumnId: context.defaultInputColumnId ?? '' };
  }

  return { type: 'fixedText', value: '' };
}

export function isStepSourceAction(action: VisibleStepAction | 'noop'): action is StepSourceAction {
  return ['useInputColumn', 'useFixedText', 'pickColumnText', 'usePreviousResult', 'useRangeText'].includes(action);
}

function buildCanonicalStep(
  mode: TransformStepMode,
  action: VisibleStepAction | 'noop',
  context: StepEditorContext,
  id: string,
): TransformStep {
  const policy = stepEditorPolicy(context);
  if (action === 'unconfigured') {
    return { ...createCanonicalStepForMode(getFirstAllowedMode(mode, context), { ...context, idFactory: () => id }), id };
  }

  if (isStepSourceAction(action)) {
    const source = createCanonicalSourceForAction(action, context);
    return { id, mode: 'text', type: 'noop', source, applyToEmptyValues: false };
  }

  if (action === 'useValueAsIs' || action === 'noop') {
    return {
      id,
      mode,
      type: 'noop',
      source: createDefaultSourceForMode(mode, context),
      applyToEmptyValues: false,
    };
  }

  if (action === 'manualRange') {
    return policy.allowManualRange
      ? { id, mode: 'manualRange', type: 'manualRange', ranges: [], applyToEmptyValues: false }
      : createCanonicalStepForMode('text', { ...context, idFactory: () => id });
  }

  if (action === 'concat') {
    return policy.allowConcat
      ? { id, mode: 'text', type: 'concat', parts: createDefaultConcatParts(context), applyToEmptyValues: false }
      : createCanonicalStepForMode('text', { ...context, idFactory: () => id });
  }

  if (action === 'numericOperation') {
    return {
      id,
      mode: 'number',
      type: 'numericOperation',
      source: createDefaultSourceForMode('number', context),
      operation: 'add',
      amount: 10,
      rounding: 2,
      applyToEmptyValues: false,
    };
  }

  if (action === 'formatDate') {
    return {
      id,
      mode: 'date',
      type: 'formatDate',
      source: createDefaultSourceForMode('date', context),
      dateInputFormat: defaultDateInputFormat,
      dateOutputFormat: defaultDateOutputFormat,
      dateInvalidFallback: defaultDateInvalidFallback,
      dateInvalidFallbackText: '',
      applyToEmptyValues: false,
    };
  }

  if (action === 'extractNumber' || action === 'toNumber' || action === 'toText') {
    return {
      id,
      mode: 'conversion',
      type: action,
      source: createDefaultSourceForMode('conversion', context),
      applyToEmptyValues: false,
    };
  }

  if (action === 'addPrefix' || action === 'addSuffix' || action === 'removeText') {
    return {
      id,
      mode: 'text',
      type: action,
      source: createDefaultSourceForMode('text', context),
      value: '',
      applyToEmptyValues: false,
    };
  }

  if (action === 'replaceText') {
    return {
      id,
      mode: 'text',
      type: 'replaceText',
      source: createDefaultSourceForMode('text', context),
      searchValue: '',
      replaceValue: '',
      applyToEmptyValues: false,
    };
  }

  return {
    id,
    mode: 'text',
    type: action,
    source: createDefaultSourceForMode('text', context),
    applyToEmptyValues: false,
  };
}

function createDefaultSourceForMode(mode: TransformStepMode, context: StepEditorContext): StepSource {
  const policy = stepEditorPolicy(context);
  if (policy.allowPreviousResult) {
    return { type: 'previousResult' };
  }

  if (mode === 'number' || mode === 'date') {
    return context.defaultInputColumnId
      ? { type: 'input', inputColumnId: context.defaultInputColumnId }
      : { type: 'fixedText', value: '' };
  }

  return { type: 'input', inputColumnId: context.defaultInputColumnId ?? '' };
}

function getSourceAction(source: StepSource, context: StepEditorContext): StepSourceAction | undefined {
  const policy = stepEditorPolicy(context);
  if (context.sourceActionOverride && getAllowedSourceActions({ type: 'noop', source }, context).includes(context.sourceActionOverride)) {
    return context.sourceActionOverride;
  }

  if (source.type === 'previousResult') {
    return policy.allowPreviousResult ? 'usePreviousResult' : undefined;
  }

  if (source.type === 'rangeText') {
    return policy.allowRangeText ? 'useRangeText' : undefined;
  }

  if (source.type === 'fixedText') {
    return 'useFixedText';
  }

  return 'useInputColumn';
}

function normalizeSourceForContext<TSource extends StepSource>(source: TSource, mode: TransformStepMode, policy: StepEditorPolicy): TSource | StepSource {
  return isSourceAllowedForContext(source, mode, policy) ? source : { type: 'fixedText', value: '' };
}

function isSourceAllowedForContext(source: StepSource, mode: TransformStepMode, policy: StepEditorPolicy) {
  if (source.type === 'previousResult') {
    return policy.allowPreviousResult;
  }

  if (source.type === 'rangeText') {
    return policy.allowRangeText && mode !== 'number' && mode !== 'date';
  }

  return true;
}

function normalizeConcatPartForContext(part: ConcatPart, context: StepEditorContext): ConcatPart {
  const nestedContext: StepEditorContext = {
    ...context,
    kind: context.kind === 'range' ? 'rangeConcat' : 'concat',
    stepIndex: 0,
    sourceActionOverride: undefined,
  };

  return {
    ...part,
    source: normalizeSourceForContext(part.source, 'text', stepEditorPolicy(nestedContext)),
    steps: (part.steps ?? [])
      .map((step, stepIndex) => normalizeStepForContext(step, { ...nestedContext, stepIndex }))
      .filter((step) => step.type !== 'manualRange' && step.type !== 'concat'),
  };
}

function createDefaultConcatParts(context: StepEditorContext): ConcatPart[] {
  return [{
    id: createStepId(context),
    source: { type: 'input', inputColumnId: context.defaultInputColumnId ?? '' },
  }];
}

function getFirstAllowedMode(mode: TransformStepMode, context: StepEditorContext) {
  return getAllowedStepModes(context).includes(mode) ? mode : 'text';
}

function getStepModeForPolicy(step: Pick<TransformStep, 'mode' | 'type'>, fallbackMode: TransformStepMode = 'text'): TransformStepMode {
  if (step.mode === 'text' || step.mode === 'number' || step.mode === 'conversion' || step.mode === 'date' || step.mode === 'manualRange') {
    return step.mode;
  }

  if (step.type === 'manualRange') return 'manualRange';
  if (step.type === 'numericOperation') return 'number';
  if (step.type === 'formatDate') return 'date';
  if (isConversionAction(step.type)) return 'conversion';
  return fallbackMode;
}

function isConversionAction(action: VisibleStepAction | 'noop' | TransformStepType): action is 'extractNumber' | 'toNumber' | 'toText' {
  return action === 'extractNumber' || action === 'toNumber' || action === 'toText';
}

function createStepId(context: StepEditorContext) {
  return context.idFactory?.() ?? crypto.randomUUID();
}
