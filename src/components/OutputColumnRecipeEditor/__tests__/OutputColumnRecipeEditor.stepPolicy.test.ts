import { describe, expect, it } from 'vitest';
import type { InputRow, StepSource, TransformStep } from '../../../types/import';
import {
  createCanonicalSourceForAction,
  createCanonicalStepForAction,
  createStepEditorContext,
  getAllowedSourceActions,
  getAllowedTextTransformerSourceActions,
  getAllowedStepActions,
  getAllowedStepModes,
  getStepEditorContextFacts,
  getStepRowsForCellPicker,
  getStepRowsForNumericOperandCompatibility,
  getStepRowsForSourceCompatibility,
  getStepRowsForTypedActionCompatibility,
  getVisibleStepAction,
  isVisibleStepActionConfigured,
  normalizeStepForContext,
  replaceStepActionWithSource,
  shouldAllowPreviousResultSource,
  stepEditorPolicy,
  type StepEditorContext,
} from '../OutputColumnRecipeEditor.stepPolicy';

const idFactory = () => 'step-id';
const inputColumnId = 'input-name';

function context(kind: StepEditorContext['kind'], stepIndex = 0): StepEditorContext {
  return { kind, stepIndex, defaultInputColumnId: inputColumnId, idFactory };
}

function noop(source?: StepSource): TransformStep {
  return {
    id: 'noop',
    mode: 'text',
    type: 'noop',
    ...(source ? { source } : {}),
  };
}

describe('step editor policy', () => {
  it('creates normalized context facts for normal steps', () => {
    const firstStep = createStepEditorContext({
      kind: 'normal',
      defaultInputColumnId: inputColumnId,
      idFactory,
    });
    const followUpStep = createStepEditorContext({
      kind: 'normal',
      stepIndex: 1,
      defaultInputColumnId: inputColumnId,
      sourceActionOverride: 'pickColumnText',
      idFactory,
    });

    expect(firstStep).toEqual({
      kind: 'normal',
      stepIndex: 0,
      defaultInputColumnId: inputColumnId,
      idFactory,
    });
    expect(getStepEditorContextFacts(firstStep)).toMatchObject({
      contextKind: 'normal',
      stepIndex: 0,
      isFirstStep: true,
      isFollowUpStep: false,
      isRangeContext: false,
      isConcatContext: false,
      isRangeConcatContext: false,
      allowManualRange: true,
      allowConcat: true,
      allowPreviousResult: false,
      allowRangeText: false,
      allowsResultOverwriteActions: false,
      cellPickerScope: 'global',
    });
    expect(getStepEditorContextFacts(followUpStep)).toMatchObject({
      contextKind: 'normal',
      stepIndex: 1,
      isFirstStep: false,
      isFollowUpStep: true,
      allowPreviousResult: true,
      allowsResultOverwriteActions: true,
      cellPickerScope: 'global',
    });
  });

  it('creates context facts for concat, range and range concat paths', () => {
    expect(getStepEditorContextFacts(createStepEditorContext({ kind: 'concat' }))).toMatchObject({
      contextKind: 'concat',
      isRangeContext: false,
      isConcatContext: true,
      isRangeConcatContext: false,
      allowManualRange: false,
      allowConcat: false,
      allowRangeText: false,
      cellPickerScope: 'global',
    });
    expect(getStepEditorContextFacts(createStepEditorContext({ kind: 'range' }))).toMatchObject({
      contextKind: 'range',
      isRangeContext: true,
      isConcatContext: false,
      isRangeConcatContext: false,
      allowManualRange: false,
      allowConcat: true,
      allowRangeText: true,
      cellPickerScope: 'range',
    });
    expect(getStepEditorContextFacts(createStepEditorContext({ kind: 'rangeConcat' }))).toMatchObject({
      contextKind: 'rangeConcat',
      isRangeContext: true,
      isConcatContext: true,
      isRangeConcatContext: true,
      allowManualRange: false,
      allowConcat: false,
      allowRangeText: true,
      cellPickerScope: 'range',
    });
  });

  it('keeps row policy for compatibility and cell picker paths', () => {
    const allRows: InputRow[] = [{ rowNumber: 1, values: { name: 'Ana', amount: '10' } }];
    const rangeRows: InputRow[] = [{ rowNumber: 5, values: { name: 'Beto', amount: '20' } }];

    expect(getStepRowsForCellPicker({ manualRangeRows: allRows })).toBe(allRows);
    expect(getStepRowsForSourceCompatibility({ manualRangeRows: allRows })).toBeUndefined();
    expect(getStepRowsForSourceCompatibility({ manualRangeRows: allRows, inputCompatibilityRows: rangeRows })).toBe(rangeRows);
    expect(getStepRowsForTypedActionCompatibility({ manualRangeRows: allRows })).toBe(allRows);
    expect(getStepRowsForTypedActionCompatibility({ manualRangeRows: allRows, inputCompatibilityRows: rangeRows })).toBe(rangeRows);
    expect(getStepRowsForNumericOperandCompatibility({ manualRangeRows: allRows })).toEqual({
      rows: allRows,
      includeSampleValues: true,
    });
    expect(getStepRowsForNumericOperandCompatibility({ manualRangeRows: allRows, inputCompatibilityRows: rangeRows })).toEqual({
      rows: rangeRows,
      includeSampleValues: false,
    });
  });

  it('keeps visible text actions by editor path', () => {
    expect(getAllowedStepActions('text', createStepEditorContext({ kind: 'normal' }))).toEqual([
      'useInputColumn',
      'useFixedText',
      'pickColumnText',
      'trim',
      'uppercase',
      'lowercase',
      'addPrefix',
      'addSuffix',
      'removeText',
      'replaceText',
      'concat',
    ]);
    expect(getAllowedStepActions('text', createStepEditorContext({ kind: 'concat' }))).toEqual([
      'useInputColumn',
      'useFixedText',
      'pickColumnText',
      'trim',
      'uppercase',
      'lowercase',
      'addPrefix',
      'addSuffix',
      'removeText',
      'replaceText',
    ]);
    expect(getAllowedStepActions('text', createStepEditorContext({ kind: 'range' }))).toEqual([
      'useInputColumn',
      'useFixedText',
      'pickColumnText',
      'useRangeText',
      'trim',
      'uppercase',
      'lowercase',
      'addPrefix',
      'addSuffix',
      'removeText',
      'replaceText',
      'concat',
    ]);
    expect(getAllowedStepActions('text', createStepEditorContext({ kind: 'rangeConcat' }))).toEqual([
      'useInputColumn',
      'useFixedText',
      'pickColumnText',
      'useRangeText',
      'trim',
      'uppercase',
      'lowercase',
      'addPrefix',
      'addSuffix',
      'removeText',
      'replaceText',
    ]);
  });

  it('defines allowed modes by context', () => {
    expect(stepEditorPolicy(context('normal')).allowManualRange).toBe(true);
    expect(getAllowedStepModes(context('normal'))).toContain('manualRange');
    expect(getAllowedStepModes(context('concat'))).not.toContain('manualRange');
    expect(getAllowedStepModes(context('range'))).not.toContain('manualRange');
    expect(getAllowedStepModes(context('rangeConcat'))).not.toContain('manualRange');
  });

  it('allows concat only where nesting is valid', () => {
    expect(stepEditorPolicy(context('normal')).allowConcat).toBe(true);
    expect(stepEditorPolicy(context('range')).allowConcat).toBe(true);
    expect(stepEditorPolicy(context('concat')).allowConcat).toBe(false);
    expect(stepEditorPolicy(context('rangeConcat')).allowConcat).toBe(false);
    expect(getAllowedStepActions('text', context('normal'))).toContain('concat');
    expect(getAllowedStepActions('text', context('range'))).toContain('concat');
    expect(getAllowedStepActions('text', context('concat'))).not.toContain('concat');
    expect(getAllowedStepActions('text', context('rangeConcat'))).not.toContain('concat');
  });

  it('allows previousResult only after a previous step exists', () => {
    expect(stepEditorPolicy(context('normal', 0)).allowPreviousResult).toBe(false);
    expect(stepEditorPolicy(context('normal', 1)).allowPreviousResult).toBe(true);
    expect(stepEditorPolicy(context('concat', 0)).allowPreviousResult).toBe(false);
    expect(stepEditorPolicy(context('concat', 1)).allowPreviousResult).toBe(true);
    expect(stepEditorPolicy(context('rangeConcat', 0)).allowPreviousResult).toBe(false);
    expect(stepEditorPolicy(context('rangeConcat', 1)).allowPreviousResult).toBe(true);
    expect(getAllowedSourceActions(noop(), context('normal', 0))).not.toContain('usePreviousResult');
    expect(getAllowedSourceActions(noop(), context('normal', 1))).toContain('usePreviousResult');
  });

  it('allows previousResult through one policy helper for normal, concat and range concat contexts', () => {
    expect(shouldAllowPreviousResultSource(context('normal', 0))).toBe(false);
    expect(shouldAllowPreviousResultSource(context('normal', 1))).toBe(true);
    expect(shouldAllowPreviousResultSource(context('rangeConcat', 0))).toBe(false);
    expect(shouldAllowPreviousResultSource(context('rangeConcat', 1))).toBe(true);
    expect(shouldAllowPreviousResultSource(createStepEditorContext({
      kind: 'concat',
      allowPreviousResultSource: false,
    }))).toBe(false);
    expect(shouldAllowPreviousResultSource(createStepEditorContext({
      kind: 'concat',
      allowPreviousResultSource: true,
    }))).toBe(true);
  });

  it('keeps unconfigured separate from use value as is', () => {
    expect(getVisibleStepAction(noop(), context('normal'))).toBe('unconfigured');
    expect(isVisibleStepActionConfigured(noop(), context('normal'))).toBe(false);
    expect(getVisibleStepAction(noop({ type: 'input', inputColumnId }), context('normal'))).toBe('useInputColumn');
    expect(getVisibleStepAction({ id: 'n', mode: 'number', type: 'noop' }, context('normal'))).toBe('unconfigured');
    expect(getVisibleStepAction({
      id: 'n',
      mode: 'number',
      type: 'noop',
      source: { type: 'input', inputColumnId },
    }, context('normal'))).toBe('useNumberInputColumn');
    expect(getVisibleStepAction({
      id: 'd',
      mode: 'date',
      type: 'noop',
      source: { type: 'input', inputColumnId },
    }, context('normal'))).toBe('useDateInputColumn');
  });

  it('creates canonical text source steps', () => {
    expect(replaceStepActionWithSource(noop(), 'useFixedText', context('normal'))).toMatchObject({
      id: 'noop',
      mode: 'text',
      type: 'noop',
      source: { type: 'fixedText', value: '' },
    });
    expect(replaceStepActionWithSource(noop(), 'useInputColumn', context('normal'))).toMatchObject({
      source: { type: 'input', inputColumnId },
    });
    expect(createCanonicalSourceForAction('useRangeText', context('range'))).toEqual({
      type: 'rangeText',
      inputColumnId,
      selectedText: '',
    });
  });

  it('keeps found text as picker action when override says picker', () => {
    const selectedTextStep = noop({ type: 'fixedText', value: 'P-1' });
    expect(getVisibleStepAction(selectedTextStep, context('normal'))).toBe('useFixedText');
    expect(getVisibleStepAction(selectedTextStep, {
      ...context('normal'),
      sourceActionOverride: 'pickColumnText',
    })).toBe('pickColumnText');
  });

  it('allows valid sources for uppercase and lowercase actions', () => {
    const upper = replaceStepActionWithSource(noop(), 'uppercase', context('normal'));
    const lower = replaceStepActionWithSource(noop(), 'lowercase', context('normal', 1));
    expect(upper).toMatchObject({ mode: 'text', type: 'uppercase', source: { type: 'input', inputColumnId } });
    expect(lower).toMatchObject({ mode: 'text', type: 'lowercase', source: { type: 'previousResult' } });
  });

  it('uses previous result by default for follow-up text transformers while preserving legacy sources', () => {
    expect(getAllowedTextTransformerSourceActions({
      type: 'uppercase',
      source: { type: 'input', inputColumnId },
    }, context('normal', 0))).toEqual(['useInputColumn']);

    expect(getAllowedTextTransformerSourceActions({
      type: 'uppercase',
      source: { type: 'previousResult' },
    }, context('normal', 1))).toEqual(['usePreviousResult']);

    expect(getAllowedTextTransformerSourceActions({
      type: 'uppercase',
      source: { type: 'input', inputColumnId },
    }, context('normal', 1))).toEqual(['usePreviousResult', 'useInputColumn']);
  });

  it('preserves fixed text sources for existing text transformer recipes', () => {
    expect(getVisibleStepAction({
      id: 'legacy',
      mode: 'text',
      type: 'uppercase',
      source: { type: 'fixedText', value: 'manual' },
    }, context('normal'))).toBe('uppercase');

    expect(getAllowedTextTransformerSourceActions({
      type: 'uppercase',
      source: { type: 'fixedText', value: 'manual' },
    }, context('normal'))).toEqual(['useInputColumn', 'useFixedText']);
    expect(getAllowedTextTransformerSourceActions({
      type: 'uppercase',
      source: { type: 'fixedText', value: 'manual' },
    }, context('normal', 1))).toEqual(['usePreviousResult', 'useFixedText']);
  });

  it('creates numeric operations without stale text props', () => {
    const staleTextStep: TransformStep = {
      id: 'stale',
      mode: 'text',
      type: 'replaceText',
      source: { type: 'fixedText', value: 'abc' },
      value: 'x',
      searchValue: 'a',
      replaceValue: 'b',
    };
    const numericStep = replaceStepActionWithSource(staleTextStep, 'numericOperation', context('normal'));
    expect(numericStep).toMatchObject({
      id: 'stale',
      mode: 'number',
      type: 'numericOperation',
      operation: 'add',
      amount: 10,
      source: { type: 'input', inputColumnId },
    });
    expect(numericStep).not.toHaveProperty('value');
    expect(numericStep).not.toHaveProperty('searchValue');
    expect(numericStep).not.toHaveProperty('replaceValue');
    expect(numericStep).not.toHaveProperty('dateInputFormat');
  });

  it('creates useful value-as-is sources for number and date', () => {
    expect(getAllowedStepActions('number', context('normal'))).toEqual([
      'useNumberInputColumn',
      'useFixedNumber',
      'pickNumberCell',
      'numericFormula',
      'numericOperation',
    ]);
    expect(getAllowedStepActions('date', context('normal'))).toEqual([
      'useDateInputColumn',
      'useFixedDate',
      'pickDateCell',
      'formatDate',
    ]);
    expect(getAllowedStepActions('text', context('normal', 1))).toEqual([
      'usePreviousResult',
      'trim',
      'uppercase',
      'lowercase',
      'addPrefix',
      'addSuffix',
      'removeText',
      'replaceText',
      'concat',
    ]);
    expect(getAllowedStepActions('number', context('normal', 1))).toEqual(['usePreviousResult', 'numericFormula', 'numericOperation']);
    expect(getAllowedStepActions('date', context('normal', 1))).toEqual(['usePreviousResult', 'formatDate']);
    expect(createCanonicalStepForAction('number', 'useValueAsIs', context('normal'))).toMatchObject({
      mode: 'number',
      type: 'noop',
      source: { type: 'input', inputColumnId },
    });
    expect(createCanonicalStepForAction('date', 'useValueAsIs', context('normal'))).toMatchObject({
      mode: 'date',
      type: 'noop',
      source: { type: 'input', inputColumnId },
    });
    expect(createCanonicalStepForAction('number', 'useFixedNumber', context('normal'))).toMatchObject({
      mode: 'number',
      type: 'noop',
      source: { type: 'fixedText', value: '' },
    });
    expect(createCanonicalStepForAction('number', 'pickNumberCell', context('normal'))).toMatchObject({
      mode: 'number',
      type: 'noop',
      source: { type: 'fixedText', value: '' },
    });
    expect(createCanonicalStepForAction('date', 'useFixedDate', context('normal'))).toMatchObject({
      mode: 'date',
      type: 'noop',
      source: { type: 'fixedText', value: '' },
    });
    expect(createCanonicalStepForAction('date', 'pickDateCell', context('normal'))).toMatchObject({
      mode: 'date',
      type: 'noop',
      source: { type: 'fixedText', value: '' },
    });
  });

  it('allows previous result as numeric source only after the first step', () => {
    expect(createCanonicalStepForAction('number', 'numericOperation', context('normal', 0))).toMatchObject({
      mode: 'number',
      type: 'numericOperation',
      source: { type: 'input', inputColumnId },
    });
    expect(createCanonicalStepForAction('number', 'numericOperation', context('normal', 1))).toMatchObject({
      mode: 'number',
      type: 'numericOperation',
      source: { type: 'previousResult' },
    });
  });

  it('creates format date without stale text or number props', () => {
    const staleNumberStep: TransformStep = {
      id: 'date',
      mode: 'number',
      type: 'numericOperation',
      operation: 'multiply',
      amount: 2,
      value: 'old',
      searchValue: 'old',
      replaceValue: 'new',
    };
    const dateStep = replaceStepActionWithSource(staleNumberStep, 'formatDate', context('normal'));
    expect(dateStep).toMatchObject({
      id: 'date',
      mode: 'date',
      type: 'formatDate',
      source: { type: 'input', inputColumnId },
      dateInputFormat: 'DD/MM/YYYY',
      dateOutputFormat: 'YYYY-MM-DD',
    });
    expect(dateStep).not.toHaveProperty('value');
    expect(dateStep).not.toHaveProperty('searchValue');
    expect(dateStep).not.toHaveProperty('replaceValue');
    expect(dateStep).not.toHaveProperty('operation');
    expect(dateStep).not.toHaveProperty('amount');
  });

  it('cleans incompatible props across text/date/number transitions', () => {
    const dateStep = replaceStepActionWithSource(noop(), 'formatDate', context('normal'));
    const textStep = replaceStepActionWithSource(dateStep, 'replaceText', context('normal'));
    const numberStep = replaceStepActionWithSource(textStep, 'numericOperation', context('normal'));
    const backToText = replaceStepActionWithSource(numberStep, 'useFixedText', context('normal'));

    expect(textStep).toMatchObject({ mode: 'text', type: 'replaceText', searchValue: '', replaceValue: '' });
    expect(textStep).not.toHaveProperty('dateInputFormat');
    expect(numberStep).toMatchObject({ mode: 'number', type: 'numericOperation' });
    expect(numberStep).not.toHaveProperty('searchValue');
    expect(backToText).toMatchObject({ mode: 'text', type: 'noop', source: { type: 'fixedText', value: '' } });
    expect(backToText).not.toHaveProperty('operation');
  });

  it('turns action back into unconfigured without keeping stale source', () => {
    const configured = replaceStepActionWithSource(noop(), 'useFixedText', context('normal'));
    const unconfigured = replaceStepActionWithSource(configured, 'unconfigured', context('normal'));
    expect(unconfigured).toMatchObject({ mode: 'text', type: 'noop' });
    expect(unconfigured).not.toHaveProperty('source');
  });

  it('normalizes disallowed manualRange and nested concat by context', () => {
    const rangeStep: TransformStep = { id: 'range', mode: 'manualRange', type: 'manualRange', ranges: [] };
    const concatStep: TransformStep = { id: 'concat', mode: 'text', type: 'concat', parts: [] };

    expect(normalizeStepForContext(rangeStep, context('normal'))).toMatchObject({ type: 'manualRange' });
    expect(normalizeStepForContext(rangeStep, context('concat'))).toMatchObject({ type: 'noop' });
    expect(normalizeStepForContext(rangeStep, context('rangeConcat'))).toMatchObject({ type: 'noop' });
    expect(normalizeStepForContext(concatStep, context('range'))).toMatchObject({ type: 'concat' });
    expect(normalizeStepForContext(concatStep, context('rangeConcat'))).toMatchObject({ type: 'noop' });
  });

  it('filters nested manualRange and concat steps inside concat parts', () => {
    const concatStep: TransformStep = {
      id: 'concat',
      mode: 'text',
      type: 'concat',
      parts: [{
        id: 'part',
        source: { type: 'input', inputColumnId },
        steps: [
          { id: 'range', mode: 'manualRange', type: 'manualRange', ranges: [] },
          { id: 'inner-concat', mode: 'text', type: 'concat', parts: [] },
          { id: 'upper', mode: 'text', type: 'uppercase', source: { type: 'input', inputColumnId } },
        ],
      }],
    };
    const normalized = normalizeStepForContext(concatStep, context('normal'));
    expect(normalized.parts?.[0]?.steps?.map((step) => step.type)).toEqual(['noop', 'noop', 'uppercase']);
  });

  it('preserves previous result sources on concat parts', () => {
    const concatStep: TransformStep = {
      id: 'concat',
      mode: 'text',
      type: 'concat',
      parts: [
        { id: 'previous', source: { type: 'previousResult' } },
        { id: 'input', source: { type: 'input', inputColumnId } },
      ],
    };

    const normalized = normalizeStepForContext(concatStep, context('range'));

    expect(normalized.parts?.[0]?.source).toEqual({ type: 'previousResult' });
    expect(normalized.parts?.[1]?.source).toEqual({ type: 'input', inputColumnId });
  });
});
