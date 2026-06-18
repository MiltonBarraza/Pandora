import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { buildProcessedRows } from '../../../domain/import/outputModel';
import type { InputColumn, InputRow, OutputColumn, OutputRecipe } from '../../../types/import';
import { addManualRangeValue, createManualRangeRecipe, createDefaultManualRangeValue, describeManualRangeCondition, describeManualRangeStepSummary, duplicateManualRangeValue, generateManualRangesFromTexts, getManualRangeCountLabel, getManualRangeFixedTextValue, getManualRangeInputSource, getManualRangeRangeTextHelpText, getManualRangeRangeTextSource, getManualRangeRowCount, getManualRangeRowCountFromInputs, getManualRangeSelectedTextOptions, getManualRangeTextOptions, getManualRangeValueSourceType, hasInvalidManualRange, hasOverlappingManualRanges, manualRangeRecipeToStepPatch, manualRangeStepToRecipe, manualRangeValueSourceOptions, parseManualRangeRowInput, removeManualRangeValue, sortManualRangesByStart, updateManualRangeCondition, updateManualRangeFixedTextValue, updateManualRangeInputValue, updateManualRangeRangeTextValue, updateManualRangeValue, updateManualRangeValueRecipeSteps, updateManualRangeValueSourceType } from '../../../domain/import/manualRangeModel';
import { applyRecipeEditorDraft, buildCombinePreview, buildCustomValuePreview, buildManualRangeAwarePreview, buildManualRangeRecipePreview, buildRecipeForSelectedType, buildSimpleCustomValueRecipe, changeStepMode, createCustomValueRecipeForMode, createDefaultConcatPart, createRecipeForConstructionMode, dateInputFormatOptions, dateOutputFormatOptions, describeCombineParts, describeConcatPartSource, getConstructorAdjustmentLabels, getConstructorAdjustmentsSummary, getConstructorPartsSummary, getCustomValuePartsDisplayLabel, getCustomValuePartsDisplaySummary, getNextSelectedConcatPartIdAfterRemove, getOutputRecipeTypeSelectorValue, getPreviousStepPreviewValue, getRecipeEditorModalRecipe, getSafeSelectedConcatPartId, getSimpleStepValue, getStepMode, getStepSourceDropdownOptions, getStepSourceDropdownValue, getStepSourceFromDropdownValue, getStepTypesForMode, getTextStepSourceLabel, getVisibleConcatPartPrimaryStep, getVisibleLeftOperand, getVisibleRecipeSteps, getVisibleRightOperand, hasRecipeEditorDraftChanges, inferStepModeFromType, normalizeConcatPartsAfterReorder, normalizeStepsForMode, numericOperationOptions, outputRecipeTypeOptions, recipeEditorAdditionalStepLabel, recipeEditorDiscardChangesMessage, recipeEditorDiscardChangesTitle, recipeEditorModalApplyLabel, recipeEditorModalCancelLabel, recipeEditorModalPendingApplyText, recipeEditorPreviousResultHelpText, setSimpleStep, shouldShowPreviousResultSourceHelp, shouldShowStepTypeSelectForStep, shouldShowTextSourceFields, stepModeOptions, updateConcatPartPrimaryStep, updateConcatPartSteps, updateStep, valueConstructionOptions } from '../OutputColumnRecipeEditor';
import { getRangeValueConcatPartSourceDropdownOptions, getRangeValueSourceDropdownOptions, getRangeValueSourceSelection, RangeValueEditor, rangeValueModeOptions, rangeValueStepTypes } from '../RangeValueEditor';

const inputColumns: InputColumn[] = [
  {
    id: 'input-code',
    columnIndex: 0,
    columnLetter: 'A',
    label: 'Codigo',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
  {
    id: 'input-name',
    columnIndex: 3,
    columnLetter: 'D',
    label: 'D',
    header: 'Nombre',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
  {
    id: 'input-pack',
    columnIndex: 5,
    columnLetter: 'F',
    label: 'F',
    header: 'Envase',
    alias: 'Presentacion',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
  {
    id: 'input-price',
    columnIndex: 39,
    columnLetter: 'AN',
    label: 'AN',
    header: 'Precio',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
];

const manualRangeRows: InputRow[] = [
  { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': '20L' } },
  { rowNumber: 9, values: { 'input-name': '', 'input-pack': '10L' } },
  { rowNumber: 10, values: { 'input-name': 'RODILLO SIMIL LANA', 'input-pack': '5L' } },
];

function renderRangeValueEditor(range: Parameters<typeof RangeValueEditor>[0]['range']) {
  vi.stubGlobal('document', { body: {} });
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  try {
    return renderToStaticMarkup(
      <RangeValueEditor
        range={range}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        onValueSourceTypeChange={() => undefined}
        onFixedTextChange={() => undefined}
        onInputColumnChange={() => undefined}
        onRangeTextChange={() => undefined}
        onStepsChange={() => undefined}
      />,
    );
  } finally {
    consoleError.mockRestore();
  }
}

const combineColumn: OutputColumn = {
  id: 'output-code',
  label: 'Codigo',
  order: 0,
  enabled: true,
  recipe: {
    type: 'combine',
    parts: [{ id: 'part-code', type: 'input', inputColumnId: 'input-code' }],
    steps: [{ id: 'suffix', type: 'addSuffix', value: 'lts' }],
  },
};

function expectedRangeTextValueRecipe(inputColumnId: string, selectedText: string) {
  return {
    source: { type: 'rangeText' as const, inputColumnId, selectedText },
    steps: [],
  };
}

describe('buildRecipeForSelectedType', () => {
  it('drops hidden steps when switching from combine to direct', () => {
    expect(buildRecipeForSelectedType('direct', combineColumn, inputColumns)).toEqual({
      type: 'direct',
      inputColumnId: 'input-code',
    });
  });

  it('drops hidden steps when switching from combine to fixed text', () => {
    expect(buildRecipeForSelectedType('fixedText', combineColumn, inputColumns)).toEqual({
      type: 'fixedText',
      value: '',
    });
  });

  it('drops hidden steps when switching from combine to empty', () => {
    expect(buildRecipeForSelectedType('empty', combineColumn, inputColumns)).toEqual({
      type: 'empty',
    });
  });

  it('does not create default parts when switching to custom value', () => {
    expect(buildRecipeForSelectedType('combine', combineColumn, inputColumns)).toEqual({
      type: 'combine',
      parts: [],
      separator: '',
    });
  });

  it('creates a manual range recipe when switching to work with ranges', () => {
    expect(buildRecipeForSelectedType('manualRange', combineColumn, inputColumns)).toEqual({
      type: 'manualRange',
      ranges: [],
    });
  });
});

describe('constructor helpers', () => {
  it('keeps work with ranges out of the main recipe type selector', () => {
    expect(outputRecipeTypeOptions.map((option) => option.value)).toEqual(['direct', 'empty', 'fixedText', 'combine']);
    expect(outputRecipeTypeOptions.map((option) => option.label)).not.toContain('Trabajar con rangos');
  });

  it('shows existing manual range recipes as custom values in the main selector', () => {
    expect(getOutputRecipeTypeSelectorValue({ type: 'manualRange', ranges: [] })).toBe('combine');
    expect(stepModeOptions).toContainEqual({ value: 'manualRange', label: 'Trabajar con rangos' });
  });

  it('uses confirm/cancel modal copy without auto-apply semantics', () => {
    expect(recipeEditorModalPendingApplyText).toBe('Los cambios se aplican al confirmar.');
    expect(recipeEditorModalCancelLabel).toBe('Cancelar');
    expect(recipeEditorModalApplyLabel).toBe('Aplicar');
  });

  it('uses draft recipe inside the modal without changing the persisted column until apply', () => {
    const draftRecipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      parts: [],
      separator: '',
      steps: [{ id: 'draft', type: 'addPrefix', value: 'DRAFT-' }],
    };

    expect(getRecipeEditorModalRecipe(combineColumn.recipe, null)).toBe(combineColumn.recipe);
    expect(getRecipeEditorModalRecipe(combineColumn.recipe, draftRecipe)).toBe(draftRecipe);
    expect(applyRecipeEditorDraft(combineColumn, null)).toBe(combineColumn);
    expect(applyRecipeEditorDraft(combineColumn, draftRecipe)).toEqual({
      ...combineColumn,
      recipe: draftRecipe,
    });
  });

  it('uses draft manual range recipe inside the modal and applies it on save', () => {
    const manualRangeColumn: OutputColumn = {
      id: 'output-comment',
      label: 'Comentario',
      order: 0,
      enabled: true,
      recipe: {
        type: 'manualRange',
        ranges: [
          { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Original' },
        ],
      },
    };
    const draftRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Editado' },
      ],
      condition: { inputColumnId: 'input-code', operator: 'isNotEmpty' },
    };

    expect(getRecipeEditorModalRecipe(manualRangeColumn.recipe, null)).toBe(manualRangeColumn.recipe);
    expect(getRecipeEditorModalRecipe(manualRangeColumn.recipe, draftRecipe)).toBe(draftRecipe);
    expect(applyRecipeEditorDraft(manualRangeColumn, draftRecipe)).toEqual({
      ...manualRangeColumn,
      recipe: draftRecipe,
    });
  });

  it('previews manual range modal draft recipes before applying them', () => {
    const originalRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: { source: { type: 'fixedText', value: 'Original' }, steps: [] },
      }],
    };
    const draftRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: {
          source: { type: 'fixedText', value: '' },
          steps: [{
            id: 'concat',
            mode: 'text',
            type: 'concat',
            parts: [
              { id: 'range-text', source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' } },
              { id: 'separator', source: { type: 'fixedText', value: ' - ' } },
              { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' } },
            ],
          }],
        },
      }],
    };

    expect(getRecipeEditorModalRecipe(originalRecipe, draftRecipe)).toBe(draftRecipe);
    expect(buildManualRangeRecipePreview(originalRecipe, manualRangeRows)).toBe('Fila 8: Original');
    expect(buildManualRangeRecipePreview(draftRecipe, manualRangeRows)).toBe('Fila 8: PINCELES SERIE 304 - 20L');
    expect(applyRecipeEditorDraft({
      id: 'output-comment',
      label: 'Comentario',
      order: 0,
      enabled: true,
      recipe: originalRecipe,
    }, null).recipe).toBe(originalRecipe);
  });

  it('previews manual range drafts using real row numbers instead of internal row indexes', () => {
    const draftRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: {
          source: { type: 'fixedText', value: '' },
          steps: [{
            id: 'concat',
            mode: 'text',
            type: 'concat',
            parts: [
              { id: 'range-text', source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' } },
              { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' } },
            ],
          }],
        },
      }],
    };
    const rowsWithRealNumbers: InputRow[] = [
      { rowNumber: 1, values: { 'input-name': 'Fuera', 'input-pack': 'NO' } },
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': 'VIR 1' } },
    ];

    expect(buildManualRangeRecipePreview(draftRecipe, rowsWithRealNumbers)).toBe('Fila 8: PINCELES SERIE 304VIR 1');
    expect(buildManualRangeRecipePreview(draftRecipe, [{ rowNumber: 1, values: { 'input-name': 'Fuera', 'input-pack': 'NO' } }])).toBeNull();
    expect(buildManualRangeRecipePreview(draftRecipe, [], { 'input-name': 'PINCELES SERIE 304', 'input-pack': 'VIR 1' })).toBe('Fila 8: PINCELES SERIE 304VIR 1');
  });

  it('applies generated manual ranges from a concat part into the final recipe', () => {
    let nextId = 1;
    const column: OutputColumn = {
      id: 'output-title',
      label: 'Titulo',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'concat',
        parts: [],
        separator: '',
        steps: [{
          id: 'concat-step',
          type: 'concat',
          parts: [
            {
              id: 'range-part',
              source: { type: 'fixedText', value: '' },
              steps: [{ id: 'range-step', type: 'manualRange', ranges: [] }],
            },
            {
              id: 'pack-part',
              source: { type: 'input', inputColumnId: 'input-pack' },
              separatorBefore: ' - ',
            },
          ],
        }],
      },
    };
    const rows: InputRow[] = [
      { rowNumber: 42, values: { 'input-name': 'RODILLO SIMIL LANA', 'input-pack': '12' } },
      { rowNumber: 43, values: { 'input-name': '', 'input-pack': '13' } },
      { rowNumber: 44, values: { 'input-name': 'RODILLO ANTIGOTA', 'input-pack': '14' } },
    ];
    const generatedRanges = generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 42,
      endRowNumber: 44,
      mode: 'untilNextText',
      idFactory: () => `generated-${nextId++}`,
    });

    if (column.recipe.type !== 'combine' || column.recipe.steps?.[0]?.type !== 'concat') {
      throw new Error('Expected concat step recipe');
    }

    const concatStep = column.recipe.steps[0];
    const rangePart = concatStep.parts?.[0];
    if (!rangePart) {
      throw new Error('Expected range part');
    }

    const nextRangeSteps = updateConcatPartPrimaryStep(rangePart.steps ?? [], manualRangeRecipeToStepPatch({
      type: 'manualRange',
      ranges: generatedRanges,
    }));
    const nextParts = updateConcatPartSteps(concatStep.parts ?? [], rangePart.id, nextRangeSteps);
    const draftRecipe: Extract<OutputRecipe, { type: 'combine' }> = {
      ...column.recipe,
      steps: updateStep(column.recipe.steps ?? [], concatStep.id, { parts: nextParts }),
    };
    const appliedColumn = applyRecipeEditorDraft(column, draftRecipe);
    const [processedRow] = buildProcessedRows([rows[0]], [appliedColumn]);

    if (appliedColumn.recipe.type !== 'combine') {
      throw new Error('Expected applied combine recipe');
    }

    const appliedRanges = appliedColumn.recipe.steps?.[0]?.parts?.[0]?.steps?.[0]?.ranges ?? [];
    expect(appliedRanges).toEqual([
      {
        id: 'generated-1',
        startRowNumber: 42,
        endRowNumber: 43,
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'RODILLO SIMIL LANA'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO SIMIL LANA' },
      },
      {
        id: 'generated-2',
        startRowNumber: 44,
        endRowNumber: 44,
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'RODILLO ANTIGOTA'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO ANTIGOTA' },
      },
    ]);
    expect(processedRow.outputValues['output-title']).toBe('RODILLO SIMIL LANA - 12');
  });

  it('preserves manual range valueRecipe when applying a concat part edit', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [{
        id: 'concat-step',
        type: 'concat',
        parts: [{
          id: 'range-part',
          source: { type: 'previousResult' },
          steps: [{ id: 'range-step', type: 'manualRange', ranges: [] }],
        }],
      }],
    };
    const rangeRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: { source: { type: 'fixedText', value: 'Promo' }, steps: [] },
        valueSource: { type: 'fixedText', value: 'Promo' },
      }],
    };
    const concatStep = recipe.steps?.[0];
    const rangePart = concatStep?.parts?.[0];

    if (!concatStep || !rangePart) {
      throw new Error('Expected concat range part');
    }

    const nextRangeSteps = updateConcatPartPrimaryStep(rangePart.steps ?? [], manualRangeRecipeToStepPatch(rangeRecipe));
    const nextParts = updateConcatPartSteps(concatStep.parts ?? [], rangePart.id, nextRangeSteps);
    const nextRecipe = {
      ...recipe,
      steps: updateStep(recipe.steps ?? [], concatStep.id, { parts: nextParts }),
    };

    expect(nextRecipe.steps?.[0].parts?.[0].steps?.[0].ranges?.[0]).toEqual(rangeRecipe.ranges[0]);
  });

  it('preserves manual range input valueRecipe steps when applying a concat part edit', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [{
        id: 'concat-step',
        type: 'concat',
        parts: [{
          id: 'range-part',
          source: { type: 'previousResult' },
          steps: [{ id: 'range-step', type: 'manualRange', ranges: [] }],
        }],
      }],
    };
    const rangeRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: {
          source: { type: 'input', inputColumnId: 'input-name' },
          steps: [{
            id: 'range-concat',
            mode: 'text',
            type: 'concat',
            parts: [
              { id: 'previous', source: { type: 'previousResult' } },
              { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' }, separatorBefore: ' ' },
            ],
          }],
        },
      }],
    };
    const concatStep = recipe.steps?.[0];
    const rangePart = concatStep?.parts?.[0];

    if (!concatStep || !rangePart) {
      throw new Error('Expected concat range part');
    }

    const nextRangeSteps = updateConcatPartPrimaryStep(rangePart.steps ?? [], manualRangeRecipeToStepPatch(rangeRecipe));
    const nextParts = updateConcatPartSteps(concatStep.parts ?? [], rangePart.id, nextRangeSteps);
    const nextRecipe = {
      ...recipe,
      steps: updateStep(recipe.steps ?? [], concatStep.id, { parts: nextParts }),
    };

    expect(nextRecipe.steps?.[0].parts?.[0].steps?.[0].ranges?.[0]).toEqual(rangeRecipe.ranges[0]);
  });

  it('detects draft changes before discarding the modal editor', () => {
    const originalRecipe = combineColumn.recipe as Extract<OutputRecipe, { type: 'combine' }>;
    const sameDraft = structuredClone(originalRecipe);
    const changedDraft: Extract<OutputRecipe, { type: 'combine' }> = {
      ...sameDraft,
      steps: [{ id: 'draft-change', type: 'addPrefix', value: 'DRAFT-' }],
    };

    expect(hasRecipeEditorDraftChanges(originalRecipe, null)).toBe(false);
    expect(hasRecipeEditorDraftChanges(originalRecipe, sameDraft)).toBe(false);
    expect(hasRecipeEditorDraftChanges(originalRecipe, changedDraft)).toBe(true);
    expect(recipeEditorDiscardChangesTitle).toBe('Descartar');
    expect(recipeEditorDiscardChangesMessage).toContain('Hay cambios sin aplicar');
  });

  it('uses clear presentation copy for part steps and previous result help', () => {
    expect(recipeEditorAdditionalStepLabel).toBe('Agregar paso');
    expect(recipeEditorAdditionalStepLabel).not.toBe('Agregar ajuste');
    expect(recipeEditorAdditionalStepLabel).not.toBe('Agregar otra transformación');
    expect(recipeEditorPreviousResultHelpText).toBe('Toma el valor que salió del paso anterior, no de la parte anterior.');
  });

  it('shows previous result help only when previous result is selected', () => {
    expect(shouldShowPreviousResultSourceHelp({ type: 'previousResult' })).toBe(true);
    expect(shouldShowPreviousResultSourceHelp({ type: 'input', inputColumnId: 'input-code' })).toBe(false);
    expect(shouldShowPreviousResultSourceHelp({ type: 'fixedText', value: 'AS4350' })).toBe(false);
  });

  it('maps unified source dropdown values to step sources', () => {
    expect(getStepSourceDropdownValue({ type: 'previousResult' })).toBe('previousResult');
    expect(getStepSourceDropdownValue({ type: 'fixedText', value: 'Manual' })).toBe('fixedText');
    expect(getStepSourceDropdownValue({ type: 'input', inputColumnId: 'input-code' })).toBe('input:input-code');
    expect(getStepSourceDropdownValue({ type: 'input', inputColumnId: '' })).toBe('');

    expect(getStepSourceFromDropdownValue('previousResult', { type: 'input', inputColumnId: 'input-code' })).toEqual({ type: 'previousResult' });
    expect(getStepSourceFromDropdownValue('fixedText', { type: 'fixedText', value: 'Manual' })).toEqual({ type: 'fixedText', value: 'Manual' });
    expect(getStepSourceFromDropdownValue('fixedText', { type: 'input', inputColumnId: 'input-code' })).toEqual({ type: 'fixedText', value: '' });
    expect(getStepSourceFromDropdownValue('input:input-name', { type: 'previousResult' })).toEqual({ type: 'input', inputColumnId: 'input-name' });
  });

  it('builds unified source dropdown options with input column labels', () => {
    expect(getStepSourceDropdownOptions(inputColumns.slice(0, 2), true)).toEqual([
      { value: 'previousResult', label: 'Resultado del paso anterior' },
      { value: 'fixedText', label: 'Texto fijo' },
      { value: 'input:input-code', label: 'A' },
      { value: 'input:input-name', label: 'D - Nombre' },
    ]);

    expect(getStepSourceDropdownOptions(inputColumns.slice(0, 1), false)).toEqual([
      { value: 'fixedText', label: 'Texto fijo' },
      { value: 'input:input-code', label: 'A' },
    ]);
  });

  it('builds an empty custom value recipe when no operation mode is selected', () => {
    expect(createCustomValueRecipeForMode('', {
      type: 'combine',
      parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
      steps: [{ id: 'numeric', type: 'numericOperation', operation: 'addPercentage', amount: 10 }],
    })).toEqual({ type: 'combine', parts: [], separator: '' });
  });

  it('builds and edits manual range recipes', () => {
    const emptyRecipe = createManualRangeRecipe();
    const withRange = addManualRangeValue(emptyRecipe);
    const rangeId = withRange.ranges[0].id;
    const withRows = updateManualRangeValue(withRange, rangeId, {
      startRowNumber: 8,
      endRowNumber: 13,
    });
    const edited = updateManualRangeFixedTextValue(withRows, rangeId, 'Cerda china mango amarillo');

    expect(emptyRecipe).toEqual({ type: 'manualRange', ranges: [] });
    expect(edited.ranges[0]).toMatchObject({
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: { source: { type: 'fixedText', value: 'Cerda china mango amarillo' }, steps: [] },
      valueSource: { type: 'fixedText', value: 'Cerda china mango amarillo' },
    });
    expect(getManualRangeFixedTextValue(edited.ranges[0])).toBe('Cerda china mango amarillo');
    expect(getManualRangeFixedTextValue({ id: 'legacy', startRowNumber: 1, endRowNumber: 1, value: 'Legacy' })).toBe('Legacy');
    expect(getManualRangeRowCount(edited.ranges[0])).toBe('6');
    expect(getManualRangeRowCount({ startRowNumber: 13, endRowNumber: 8 })).toBe('');
    expect(removeManualRangeValue(edited, rangeId).ranges).toEqual([]);
  });

  it('reads manual range fixed text from valueRecipe before legacy sources', () => {
    const range = {
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: { source: { type: 'fixedText' as const, value: 'Nuevo' }, steps: [] },
      valueSource: { type: 'fixedText' as const, value: 'Viejo' },
      value: 'Legacy',
    };

    expect(getManualRangeValueSourceType(range)).toBe('fixedText');
    expect(getManualRangeFixedTextValue(range)).toBe('Nuevo');
  });

  it('reads manual range range text from valueRecipe before legacy sources', () => {
    const range = {
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: {
        source: { type: 'rangeText' as const, inputColumnId: 'input-name', selectedText: 'Sinteplast' },
        steps: [],
      },
      valueSource: { type: 'fixedText' as const, value: 'Viejo' },
    };

    expect(getManualRangeValueSourceType(range)).toBe('rangeText');
    expect(getManualRangeRangeTextSource(range)).toEqual({
      type: 'rangeText',
      inputColumnId: 'input-name',
      selectedText: 'Sinteplast',
    });
  });

  it('reads manual range input sources from valueRecipe', () => {
    const range = {
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: {
        source: { type: 'input' as const, inputColumnId: 'input-name' },
        steps: [],
      },
      valueSource: { type: 'fixedText' as const, value: 'Viejo' },
    };

    expect(manualRangeValueSourceOptions).toContainEqual({ value: 'input', label: 'Columna de entrada' });
    expect(getManualRangeValueSourceType(range)).toBe('input');
    expect(getManualRangeInputSource(range)).toEqual({ type: 'input', inputColumnId: 'input-name' });
  });

  it('configures manual range text sources', () => {
    const emptyRecipe = createManualRangeRecipe();
    const withRange = addManualRangeValue(emptyRecipe);
    const rangeId = withRange.ranges[0].id;
    const rangeTextRecipe = updateManualRangeValueSourceType(withRange, rangeId, 'rangeText', inputColumns);
    const configured = updateManualRangeRangeTextValue(rangeTextRecipe, rangeId, {
      inputColumnId: 'input-name',
      selectedText: 'Sinteplast',
    });

    expect(manualRangeValueSourceOptions).toContainEqual({ value: 'rangeText', label: 'Texto encontrado en el rango' });
    expect(getManualRangeValueSourceType(configured.ranges[0])).toBe('rangeText');
    expect(getManualRangeRangeTextSource(configured.ranges[0])).toEqual({
      type: 'rangeText',
      inputColumnId: 'input-name',
      selectedText: 'Sinteplast',
    });
    expect(configured.ranges[0].valueRecipe).toEqual({
      source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Sinteplast' },
      steps: [],
    });
    expect(configured.ranges[0].valueSource).toEqual({
      type: 'rangeText',
      inputColumnId: 'input-name',
      selectedText: 'Sinteplast',
    });
    expect(configured.ranges[0]).not.toHaveProperty('value');
  });

  it('configures manual range input sources without legacy valueSource', () => {
    const emptyRecipe = createManualRangeRecipe();
    const withRange = addManualRangeValue(emptyRecipe);
    const rangeId = withRange.ranges[0].id;
    const inputRecipe = updateManualRangeValueSourceType(withRange, rangeId, 'input', inputColumns);
    const configured = updateManualRangeInputValue(inputRecipe, rangeId, 'input-name');

    expect(getManualRangeValueSourceType(configured.ranges[0])).toBe('input');
    expect(getManualRangeInputSource(configured.ranges[0])).toEqual({ type: 'input', inputColumnId: 'input-name' });
    expect(configured.ranges[0].valueRecipe).toEqual({
      source: { type: 'input', inputColumnId: 'input-name' },
      steps: [],
    });
    expect(configured.ranges[0]).not.toHaveProperty('valueSource');
    expect(configured.ranges[0]).not.toHaveProperty('value');
  });

  it('updates manual range value recipe transformations without changing the source', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [] },
      }],
    };

    const added = updateManualRangeValueRecipeSteps(recipe, 'range-8-13', [
      { id: 'trim-step', mode: 'text', type: 'trim' },
    ]);
    const edited = updateManualRangeValueRecipeSteps(added, 'range-8-13', [
      { id: 'trim-step', mode: 'text', type: 'uppercase' },
    ]);
    const removed = updateManualRangeValueRecipeSteps(edited, 'range-8-13', []);

    expect(added.ranges[0].valueRecipe).toEqual({
      source: { type: 'input', inputColumnId: 'input-name' },
      steps: [{ id: 'trim-step', mode: 'text', type: 'trim' }],
    });
    expect(edited.ranges[0].valueRecipe).toEqual({
      source: { type: 'input', inputColumnId: 'input-name' },
      steps: [{ id: 'trim-step', mode: 'text', type: 'uppercase' }],
    });
    expect(removed.ranges[0].valueRecipe).toEqual({
      source: { type: 'input', inputColumnId: 'input-name' },
      steps: [],
    });
  });

  it('creates valueRecipe steps from legacy sources and filters nested range operations', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueSource: { type: 'fixedText', value: ' Promo ' },
      }],
    };

    const updated = updateManualRangeValueRecipeSteps(recipe, 'range-8-13', [
      { id: 'trim-step', mode: 'text', type: 'trim' },
      { id: 'range-step', mode: 'manualRange', type: 'manualRange', ranges: [] },
      { id: 'concat-step', mode: 'text', type: 'concat', parts: [] },
    ]);

    expect(updated.ranges[0].valueRecipe).toEqual({
      source: { type: 'fixedText', value: ' Promo ' },
      steps: [
        { id: 'trim-step', mode: 'text', type: 'trim' },
        { id: 'concat-step', mode: 'text', type: 'concat', parts: [] },
      ],
    });
  });

  it('keeps concat valueRecipe steps and filters nested manual range part steps', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' }, steps: [] },
      }],
    };

    const updated = updateManualRangeValueRecipeSteps(recipe, 'range-8-13', [
      {
        id: 'concat-step',
        mode: 'text',
        type: 'concat',
        parts: [
          { id: 'previous', source: { type: 'previousResult' } },
          {
            id: 'input-pack',
            source: { type: 'input', inputColumnId: 'input-pack' },
            separatorBefore: ' ',
            steps: [
              { id: 'trim-pack', mode: 'text', type: 'trim' },
              { id: 'nested-range', mode: 'manualRange', type: 'manualRange', ranges: [] },
              { id: 'nested-concat', mode: 'text', type: 'concat', parts: [] },
            ],
          },
        ],
      },
      { id: 'range-step', mode: 'manualRange', type: 'manualRange', ranges: [] },
    ]);

    expect(updated.ranges[0].valueRecipe?.steps).toEqual([
      {
        id: 'concat-step',
        mode: 'text',
        type: 'concat',
        parts: [
          { id: 'previous', source: { type: 'previousResult' }, steps: [] },
          {
            id: 'input-pack',
            source: { type: 'input', inputColumnId: 'input-pack' },
            separatorBefore: ' ',
            steps: [{ id: 'trim-pack', mode: 'text', type: 'trim' }],
          },
        ],
      },
    ]);
  });

  it('offers concat but not manual ranges inside range value transformations', () => {
    expect(rangeValueModeOptions.map((option) => option.value)).not.toContain('manualRange');
    expect(Object.values(rangeValueStepTypes).flat().map((option) => option.value)).not.toContain('manualRange');
    expect(rangeValueStepTypes.text.map((option) => option.value)).toContain('concat');
  });

  it('renders range values as a mini operation editor instead of separate value and transformations blocks', () => {
    const markup = renderRangeValueEditor({
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [] },
    });

    expect(markup).not.toContain('Valor del rango');
    expect(markup).toContain('Tipo de operación');
    expect(markup).toContain('Qué quiero hacer');
    expect(markup).toContain('Desde donde toma el valor');
    expect(markup).toContain('D - Nombre');
    expect(markup).not.toMatch(/<span id="[^"]+">Columna de entrada<\/span>/);
    expect(markup).not.toMatch(/<span>Texto<\/span>/);
    expect(markup).not.toContain('Transformaciones del valor');
    expect(markup).not.toMatch(/>Valor<\/span>/);
  });

  it('builds a single range value source dropdown with base sources and input columns', () => {
    expect(getRangeValueSourceDropdownOptions(inputColumns).map((option) => option.label)).toEqual([
      'Texto fijo',
      'Texto encontrado en el rango',
      'A',
      'D - Nombre',
      'F - Presentacion',
      'AN - Precio',
    ]);
    expect(getRangeValueSourceDropdownOptions(inputColumns).map((option) => option.value)).toEqual([
      'fixedText',
      'rangeText',
      'input:input-code',
      'input:input-name',
      'input:input-pack',
      'input:input-price',
    ]);
  });

  it('maps range value source dropdown column selections to input sources', () => {
    expect(getRangeValueSourceSelection('input:input-name')).toEqual({
      type: 'inputColumn',
      inputColumnId: 'input-name',
    });
    expect(getRangeValueSourceSelection('fixedText')).toEqual({
      type: 'valueSourceType',
      value: 'fixedText',
    });
    expect(getRangeValueSourceSelection('rangeText')).toEqual({
      type: 'valueSourceType',
      value: 'rangeText',
    });
  });

  it('renders range text sources inside the range value operation editor', () => {
    const markup = renderRangeValueEditor({
      id: 'range-8-9',
      startRowNumber: 8,
      endRowNumber: 9,
      valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' }, steps: [] },
    });

    expect(markup).toContain('Desde donde toma el valor');
    expect(markup).toContain('Texto encontrado en el rango');
    expect(markup).toContain('Buscar textos en');
    expect(markup).toContain('Texto encontrado');
    expect(markup).toContain('PINCELES SERIE 304');
  });

  it('renders fixed text sources inside the range value operation editor', () => {
    const markup = renderRangeValueEditor({
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: { source: { type: 'fixedText', value: 'Promo especial' }, steps: [] },
    });

    expect(markup).toContain('Desde donde toma el valor');
    expect(markup).toContain('Texto fijo');
    expect(markup).toContain('Texto');
    expect(markup).toContain('Promo especial');
  });

  it('renders concat as the primary range value operation with its parts', () => {
    const markup = renderRangeValueEditor({
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: {
        source: { type: 'input', inputColumnId: 'input-name' },
        steps: [{
          id: 'range-concat',
          mode: 'text',
          type: 'concat',
          parts: [
            { id: 'previous', source: { type: 'previousResult' } },
            { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' }, separatorBefore: ' - ' },
            { id: 'fixed', source: { type: 'fixedText', value: 'OK' }, separatorBefore: ' ' },
          ],
        }],
      },
    });

    expect(markup).toContain('Qué quiero hacer');
    expect(markup).toContain('Concatenar');
    expect(markup).toContain('concatPartsWorkspace');
    expect(markup).toContain('concatPartsSidebar');
    expect(markup).toContain('concatPartSelectButton');
    expect(markup).toContain('Parte 1');
    expect(markup).toContain('Resultado anterior');
    expect(markup).toContain('F - Presentacion');
    expect(markup).toContain('OK');
    expect(markup).toContain('Desde donde toma el valor');
    expect(markup).not.toContain('Buscar textos en');
    expect(markup).not.toContain('Texto encontrado</span>');
    expect(markup).not.toMatch(/<span id="[^"]+">Fuente<\/span>/);
  });

  it('builds concat part source options for range values without the old source field label', () => {
    expect(getRangeValueConcatPartSourceDropdownOptions(inputColumns).map((option) => option.label)).toEqual([
      'Resultado anterior',
      'Texto fijo',
      'Texto encontrado en el rango',
      'A',
      'D - Nombre',
      'F - Presentacion',
      'AN - Precio',
    ]);
  });

  it('renders range text configuration inside concat range value parts', () => {
    const markup = renderRangeValueEditor({
      id: 'range-8-9',
      startRowNumber: 8,
      endRowNumber: 9,
      valueRecipe: {
        source: { type: 'fixedText', value: '' },
        steps: [{
          id: 'range-concat',
          mode: 'text',
          type: 'concat',
          parts: [
            { id: 'range-text-part', source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' } },
            { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' }, separatorBefore: ' - ' },
          ],
        }],
      },
    });

    expect(markup).toContain('Texto encontrado en el rango');
    expect(markup).toContain('Buscar textos en');
    expect(markup).toContain('Texto encontrado');
    expect(markup).toContain('PINCELES SERIE 304');
    expect(markup).not.toMatch(/<span id="[^"]+">Columna de entrada<\/span>/);
  });

  it('renders legacy manual range value fallbacks in the mini operation editor', () => {
    const fixedMarkup = renderRangeValueEditor({
      id: 'legacy-fixed',
      startRowNumber: 8,
      endRowNumber: 13,
      value: 'Legacy promo',
    });
    const rangeTextMarkup = renderRangeValueEditor({
      id: 'legacy-range-text',
      startRowNumber: 8,
      endRowNumber: 9,
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
    });

    expect(fixedMarkup).toContain('Texto fijo');
    expect(fixedMarkup).toContain('Legacy promo');
    expect(rangeTextMarkup).toContain('Texto encontrado en el rango');
    expect(rangeTextMarkup).toContain('PINCELES SERIE 304');
  });

  it('switches fixed text manual ranges to input sources without contradictory fallback state', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: { source: { type: 'fixedText', value: 'Promo' }, steps: [] },
        valueSource: { type: 'fixedText', value: 'Promo' },
      }],
    };

    const next = updateManualRangeValueSourceType(recipe, 'range-8-13', 'input', inputColumns);

    expect(next.ranges[0]).toEqual({
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-code' }, steps: [] },
    });
  });

  it('switches range text manual ranges to input sources without contradictory fallback state', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Sinteplast' }, steps: [] },
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Sinteplast' },
      }],
    };

    const next = updateManualRangeValueSourceType(recipe, 'range-8-13', 'input', inputColumns);

    expect(next.ranges[0]).toEqual({
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-code' }, steps: [] },
    });
  });

  it('falls back to old manual range value sources while rendering helpers', () => {
    expect(getManualRangeFixedTextValue({
      id: 'fixed',
      startRowNumber: 8,
      endRowNumber: 13,
      valueSource: { type: 'fixedText', value: 'Fallback fijo' },
    })).toBe('Fallback fijo');
    expect(getManualRangeRangeTextSource({
      id: 'range-text',
      startRowNumber: 8,
      endRowNumber: 13,
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Fallback rango' },
    })).toEqual({ type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Fallback rango' });
  });

  it('duplicates fixed text manual ranges with a new id', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueSource: { type: 'fixedText', value: 'Cerda china mango amarillo' },
      }],
    };

    const duplicated = duplicateManualRangeValue(recipe, 'range-8-13');

    expect(duplicated.ranges).toHaveLength(2);
    expect(duplicated.ranges[1]).toMatchObject({
      startRowNumber: 8,
      endRowNumber: 13,
      valueSource: { type: 'fixedText', value: 'Cerda china mango amarillo' },
    });
    expect(duplicated.ranges[1].id).not.toBe('range-8-13');
  });

  it('duplicates range text manual ranges with a new id', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueSource: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'PINCELES SERIE 304' },
      }],
    };

    const duplicated = duplicateManualRangeValue(recipe, 'range-8-13');

    expect(duplicated.ranges[1]).toMatchObject({
      startRowNumber: 8,
      endRowNumber: 13,
      valueSource: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'PINCELES SERIE 304' },
    });
    expect(duplicated.ranges[1].id).not.toBe('range-8-13');
  });

  it('edits a duplicated manual range without changing the original', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueSource: { type: 'fixedText', value: 'Original' },
      }],
    };
    const duplicated = duplicateManualRangeValue(recipe, 'range-8-13');
    const duplicateId = duplicated.ranges[1].id;
    const edited = updateManualRangeFixedTextValue(duplicated, duplicateId, 'Duplicado');

    expect(getManualRangeFixedTextValue(edited.ranges[0])).toBe('Original');
    expect(getManualRangeFixedTextValue(edited.ranges[1])).toBe('Duplicado');
  });

  it('sorts manual ranges by start and then end without losing ids or sources', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [
        { id: 'late', startRowNumber: 20, endRowNumber: 22, valueSource: { type: 'fixedText', value: 'Late' } },
        { id: 'wide', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Wide' } },
        { id: 'narrow', startRowNumber: 8, endRowNumber: 9, valueSource: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'Narrow' } },
      ],
    };

    expect(sortManualRangesByStart(recipe).ranges).toEqual([
      { id: 'narrow', startRowNumber: 8, endRowNumber: 9, valueSource: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'Narrow' } },
      { id: 'wide', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Wide' } },
      { id: 'late', startRowNumber: 20, endRowNumber: 22, valueSource: { type: 'fixedText', value: 'Late' } },
    ]);
  });

  it('uses the same helper for top and bottom add range actions', () => {
    const recipe = createManualRangeRecipe();
    const fromTopButton = addManualRangeValue(recipe);
    const fromBottomButton = addManualRangeValue(recipe);

    expect(fromTopButton.ranges).toHaveLength(1);
    expect(fromBottomButton.ranges).toHaveLength(1);
    expect(fromTopButton.ranges[0]).toMatchObject({ startRowNumber: 1, endRowNumber: 1 });
    expect(fromBottomButton.ranges[0]).toMatchObject({ startRowNumber: 1, endRowNumber: 1 });
  });

  it('generates manual ranges from found texts using real row numbers', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 12, values: { 'input-name': 'Fuera' } },
      { rowNumber: 42, values: { 'input-name': 'RODILLO SIMIL LANA' } },
      { rowNumber: 43, values: { 'input-name': '' } },
      { rowNumber: 44, values: { 'input-name': 'RODILLO ANTIGOTA' } },
      { rowNumber: 46, values: { 'input-name': 'RODILLOS PARA EPOXI' } },
      { rowNumber: 60, values: { 'input-name': 'Fuera final' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 42,
      endRowNumber: 50,
      mode: 'untilNextText',
      idFactory: () => `generated-${nextId++}`,
    })).toEqual([
      {
        id: 'generated-1',
        startRowNumber: 42,
        endRowNumber: 43,
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'RODILLO SIMIL LANA'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO SIMIL LANA' },
      },
      {
        id: 'generated-2',
        startRowNumber: 44,
        endRowNumber: 45,
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'RODILLO ANTIGOTA'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO ANTIGOTA' },
      },
      {
        id: 'generated-3',
        startRowNumber: 46,
        endRowNumber: 50,
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'RODILLOS PARA EPOXI'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLOS PARA EPOXI' },
      },
    ]);
  });

  it('generates manual ranges in single row mode', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 42, values: { 'input-name': 'RODILLO SIMIL LANA' } },
      { rowNumber: 44, values: { 'input-name': 'RODILLO ANTIGOTA' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 40,
      endRowNumber: 50,
      mode: 'singleRow',
      idFactory: () => `generated-${nextId++}`,
    })).toEqual([
      {
        id: 'generated-1',
        startRowNumber: 42,
        endRowNumber: 42,
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'RODILLO SIMIL LANA'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO SIMIL LANA' },
      },
      {
        id: 'generated-2',
        startRowNumber: 44,
        endRowNumber: 44,
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'RODILLO ANTIGOTA'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO ANTIGOTA' },
      },
    ]);
  });

  it('does not generate manual ranges when no texts are found', () => {
    const rows: InputRow[] = [
      { rowNumber: 42, values: { 'input-name': '' } },
      { rowNumber: 43, values: { 'input-name': '   ' } },
      { rowNumber: 44, values: { 'input-name': 'Fuera' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 42,
      endRowNumber: 43,
      mode: 'untilNextText',
    })).toEqual([]);
  });

  it('adds generated manual ranges without deleting existing ranges', () => {
    let nextId = 1;
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [
        { id: 'existing', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Existente' } },
      ],
    };
    const generatedRanges = generateManualRangesFromTexts([
      { rowNumber: 42, values: { 'input-name': 'RODILLO SIMIL LANA' } },
      { rowNumber: 44, values: { 'input-name': 'RODILLO ANTIGOTA' } },
    ], {
      inputColumnId: 'input-name',
      startRowNumber: 40,
      endRowNumber: 50,
      mode: 'untilNextText',
      idFactory: () => `generated-${nextId++}`,
    });
    const nextRecipe = { ...recipe, ranges: [...recipe.ranges, ...generatedRanges] };

    expect(nextRecipe.ranges).toEqual([
      { id: 'existing', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Existente' } },
      {
        id: 'generated-1',
        startRowNumber: 42,
        endRowNumber: 43,
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'RODILLO SIMIL LANA'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO SIMIL LANA' },
      },
      {
        id: 'generated-2',
        startRowNumber: 44,
        endRowNumber: 50,
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'RODILLO ANTIGOTA'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO ANTIGOTA' },
      },
    ]);
  });

  it('generates unique ids and rangeText sources for the selected column', () => {
    let nextId = 1;
    const generatedRanges = generateManualRangesFromTexts([
      { rowNumber: 42, values: { 'input-code': 'Ignorar', 'input-name': 'RODILLO SIMIL LANA' } },
      { rowNumber: 44, values: { 'input-code': 'Ignorar', 'input-name': 'RODILLO ANTIGOTA' } },
    ], {
      inputColumnId: 'input-name',
      startRowNumber: 40,
      endRowNumber: 50,
      mode: 'singleRow',
      idFactory: () => `generated-${nextId++}`,
    });

    expect(new Set(generatedRanges.map((range) => range.id)).size).toBe(generatedRanges.length);
    expect(generatedRanges.map((range) => range.valueSource)).toEqual([
      { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO SIMIL LANA' },
      { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO ANTIGOTA' },
    ]);
  });

  it('builds manual range text options from real row numbers', () => {
    const rows: InputRow[] = [
      { rowNumber: 2, values: { 'input-name': 'Fuera' } },
      { rowNumber: 8, values: { 'input-name': '  Sinteplast  ' } },
      { rowNumber: 9, values: { 'input-name': '' } },
      { rowNumber: 10, values: { 'input-name': 'Alba' } },
      { rowNumber: 11, values: { 'input-name': 'Sinteplast' } },
      { rowNumber: 20, values: { 'input-name': 'Fuera final' } },
    ];

    expect(getManualRangeTextOptions(rows, { startRowNumber: 8, endRowNumber: 11 }, 'input-name')).toEqual([
      'Sinteplast',
      'Alba',
    ]);
  });

  it('builds the same range text options for a direct manual range step', () => {
    const rows: InputRow[] = [
      { rowNumber: 7, values: { 'input-code': 'Fuera' } },
      { rowNumber: 8, values: { 'input-code': 'PINCELES SERIE 304' } },
      { rowNumber: 9, values: { 'input-code': 'Cerda china mango amarillo' } },
      { rowNumber: 13, values: { 'input-code': 'PINCELES SERIE 304' } },
      { rowNumber: 14, values: { 'input-code': 'Fuera final' } },
    ];
    const step = {
      id: 'range-step',
      type: 'manualRange' as const,
      ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13 }],
    };
    const range = manualRangeStepToRecipe(step).ranges[0];

    expect(getManualRangeTextOptions(rows, range, 'input-code')).toEqual([
      'PINCELES SERIE 304',
      'Cerda china mango amarillo',
    ]);
  });

  it('builds the same range text options for a manual range step inside a concat part', () => {
    const rows: InputRow[] = [
      { rowNumber: 7, values: { 'input-code': 'Fuera' } },
      { rowNumber: 8, values: { 'input-code': 'PINCELES SERIE 304' } },
      { rowNumber: 9, values: { 'input-code': 'Cerda china mango amarillo' } },
      { rowNumber: 13, values: { 'input-code': 'PINCELES SERIE 304' } },
      { rowNumber: 14, values: { 'input-code': 'Fuera final' } },
    ];
    const concatPart = {
      id: 'range-part',
      source: { type: 'previousResult' as const },
      steps: [{
        id: 'nested-range-step',
        type: 'manualRange' as const,
        ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13 }],
      }],
    };
    const rangeStep = getVisibleConcatPartPrimaryStep(concatPart.steps);
    const range = manualRangeStepToRecipe(rangeStep).ranges[0];

    expect(getManualRangeTextOptions(rows, range, 'input-code')).toEqual([
      'PINCELES SERIE 304',
      'Cerda china mango amarillo',
    ]);
  });

  it('keeps the selected range text option when it is not in current rows', () => {
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': 'Alba' } },
    ];
    const source = { type: 'rangeText' as const, inputColumnId: 'input-name', selectedText: 'Sinteplast' };

    expect(getManualRangeSelectedTextOptions(rows, { startRowNumber: 8, endRowNumber: 8 }, source)).toEqual([
      'Sinteplast',
      'Alba',
    ]);
  });

  it('describes missing range text setup states', () => {
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': '' } },
    ];

    expect(getManualRangeRangeTextHelpText(
      rows,
      { startRowNumber: 8, endRowNumber: 8 },
      { type: 'rangeText', inputColumnId: '', selectedText: '' },
    )).toBe('Elegí una columna para buscar textos.');
    expect(getManualRangeRangeTextHelpText(
      rows,
      { startRowNumber: 8, endRowNumber: 8 },
      { type: 'rangeText', inputColumnId: 'input-name', selectedText: '' },
    )).toBe('No se encontraron textos en este rango.');
  });

  it('shows legacy manual range values as fixed text when editing source type', () => {
    const legacyRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Legacy' },
      ],
    };
    const fixedTextRecipe = updateManualRangeValueSourceType(legacyRecipe, 'range-8-13', 'fixedText');

    expect(getManualRangeValueSourceType(legacyRecipe.ranges[0])).toBe('fixedText');
    expect(getManualRangeFixedTextValue(legacyRecipe.ranges[0])).toBe('Legacy');
    expect(fixedTextRecipe.ranges[0]).toMatchObject({
      valueSource: { type: 'fixedText', value: 'Legacy' },
    });
    expect(fixedTextRecipe.ranges[0]).not.toHaveProperty('value');
  });

  it('builds compact manual range summary labels', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Cerda china mango amarillo' },
      ],
      condition: { inputColumnId: 'input-code', operator: 'isNotEmpty' },
    };

    expect(getManualRangeCountLabel(recipe)).toBe('1 rango configurado');
    expect(describeManualRangeCondition(recipe, inputColumns)).toBe('A no está vacía');
    expect(describeManualRangeCondition({ type: 'manualRange', ranges: [] }, inputColumns)).toBe('Sin condición');
  });

  it('summarizes manual range steps without configured ranges', () => {
    expect(describeManualRangeStepSummary({ id: 'range-step', type: 'manualRange', ranges: [] }, inputColumns)).toBe('0 rangos');
  });

  it('summarizes manual range steps with one fixed text range', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Promo' } },
      ],
    }, inputColumns)).toBe('1 rango · texto fijo · 8-13');
  });

  it('summarizes manual range steps with several ranges and truncates the list', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Primero' } },
        { id: 'range-15-20', startRowNumber: 15, endRowNumber: 20, valueSource: { type: 'fixedText', value: 'Segundo' } },
        { id: 'range-22-26', startRowNumber: 22, endRowNumber: 26, valueSource: { type: 'fixedText', value: 'Tercero' } },
        { id: 'range-28-32', startRowNumber: 28, endRowNumber: 32, valueSource: { type: 'fixedText', value: 'Cuarto' } },
      ],
    }, inputColumns)).toBe('4 rangos · texto fijo · 8-13, 15-20, 22-26…');
  });

  it('summarizes manual range steps with an internal condition', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      manualRangeCondition: { inputColumnId: 'input-code', operator: 'isNotEmpty' },
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Promo' } },
      ],
    }, inputColumns)).toBe('1 rango · A no está vacía · texto fijo · 8-13');
  });

  it('summarizes manual range steps with range text source columns', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      ranges: [
        {
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
        },
      ],
    }, inputColumns)).toBe('1 rango · valores desde D - Nombre · 8-13');
  });

  it('summarizes manual range steps with input source columns', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      ranges: [
        {
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [] },
        },
      ],
    }, inputColumns)).toBe('1 rango · valores desde D - Nombre · 8-13');
  });

  it('summarizes manual range value recipe transformations without implying plain source values', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      ranges: [
        {
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'input', inputColumnId: 'input-name' },
            steps: [{ id: 'trim-step', mode: 'text', type: 'trim' }],
          },
        },
      ],
    }, inputColumns)).toBe('1 rango · valor personalizado · 8-13');
  });

  it('summarizes mixed manual range value sources safely', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Promo' } },
        {
          id: 'range-15-20',
          startRowNumber: 15,
          endRowNumber: 20,
          valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [] },
        },
      ],
    }, inputColumns)).toBe('2 rangos · valores mixtos · 8-13, 15-20');
  });

  it('handles manual range edge labels and warnings', () => {
    expect(getManualRangeCountLabel({ type: 'manualRange', ranges: [] })).toBe('0 rangos configurados');
    expect(getManualRangeRowCount({ startRowNumber: 0, endRowNumber: 8 })).toBe('');
    expect(getManualRangeRowCount({ startRowNumber: 8, endRowNumber: 7 })).toBe('');
    expect(hasInvalidManualRange({ startRowNumber: 8, endRowNumber: 7 })).toBe(true);
    expect(hasOverlappingManualRanges([
      { id: 'first', startRowNumber: 8, endRowNumber: 13, value: 'Primero' },
      { id: 'second', startRowNumber: 12, endRowNumber: 15, value: 'Segundo' },
    ])).toBe(true);
    expect(hasOverlappingManualRanges([
      { id: 'first', startRowNumber: 8, endRowNumber: 13, value: 'Primero' },
      { id: 'second', startRowNumber: 14, endRowNumber: 15, value: 'Segundo' },
      { id: 'invalid', startRowNumber: 20, endRowNumber: 19, value: 'Revisar' },
    ])).toBe(false);
  });

  it('treats manual range as a step payload for the normal custom value editor', () => {
    const step = {
      id: 'range-step',
      type: 'manualRange' as const,
      mode: 'text' as const,
      ranges: [{ id: 'range-8-9', startRowNumber: 8, endRowNumber: 9, value: 'Promo' }],
      manualRangeCondition: { inputColumnId: 'input-name', operator: 'isNotEmpty' as const },
    };

    const recipe = manualRangeStepToRecipe(step);

    expect(recipe).toEqual({
      type: 'manualRange',
      ranges: step.ranges,
      condition: step.manualRangeCondition,
    });
    expect(manualRangeRecipeToStepPatch(recipe)).toEqual({
      ranges: step.ranges,
      manualRangeCondition: step.manualRangeCondition,
    });
  });

  it('keeps manual range row inputs invalid while editing empty or invalid values', () => {
    expect(parseManualRangeRowInput('')).toBeUndefined();
    expect(parseManualRangeRowInput('abc')).toBeUndefined();
    expect(parseManualRangeRowInput('0')).toBeUndefined();
    expect(parseManualRangeRowInput('8')).toBe(8);
    expect(getManualRangeRowCountFromInputs('', '13')).toBe('');
    expect(getManualRangeRowCountFromInputs('8', '')).toBe('');
    expect(getManualRangeRowCountFromInputs('13', '8')).toBe('');
    expect(getManualRangeRowCountFromInputs('8', '13')).toBe('6');
  });

  it('configures and clears manual range conditions', () => {
    const recipe = createManualRangeRecipe();
    const withCondition = updateManualRangeCondition(recipe, {
      inputColumnId: 'input-code',
      operator: 'isNotEmpty',
    });

    expect(withCondition.condition).toEqual({
      inputColumnId: 'input-code',
      operator: 'isNotEmpty',
    });
    expect(updateManualRangeCondition(withCondition, null)).toEqual({
      type: 'manualRange',
      ranges: [],
    });
  });

  it('builds a numeric custom value with one input part and one numeric final step', () => {
    const recipe = buildSimpleCustomValueRecipe('number', 'input-price', {
      id: 'numeric',
      type: 'numericOperation',
      operation: 'addPercentage',
      amount: 10,
      rounding: 2,
    });

    expect(recipe).toMatchObject({
      type: 'combine',
      parts: [{ type: 'input', inputColumnId: 'input-price' }],
      steps: [{ type: 'numericOperation', operation: 'addPercentage', amount: 10 }],
    });
  });

  it('builds a text custom value with one input part and one text final step', () => {
    const recipe = buildSimpleCustomValueRecipe('text', 'input-pack', {
      id: 'suffix',
      type: 'addSuffix',
      value: 'lts',
    });

    expect(recipe).toMatchObject({
      type: 'combine',
      parts: [{ type: 'input', inputColumnId: 'input-pack' }],
      steps: [{ type: 'addSuffix', value: 'lts' }],
    });
  });

  it('does not show invented preview before custom value is configured', () => {
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '' }, { 'input-price': '100' })).toBe('Sin valores configurados');
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '' }, { 'input-price': '100' }, true)).toBe('Configura el Paso 1 para ver la vista previa.');
  });

  it('previews a top-level manual range step using a real row inside the range', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'PINCELES SERIE 304' }],
      }],
    };
    const rows: InputRow[] = [
      { rowNumber: 1, values: { 'input-code': 'Fuera' } },
      { rowNumber: 8, values: { 'input-code': 'Dentro' } },
    ];

    expect(buildCustomValuePreview(recipe, { 'input-code': 'Fuera' }, true, 'text', rows)).toBe('Fila 8: PINCELES SERIE 304');
  });

  it('previews a manual range input source using a real row inside the range', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [] },
        }],
      }],
    };
    const rows: InputRow[] = [
      { rowNumber: 1, values: { 'input-name': 'Fuera' } },
      { rowNumber: 8, values: { 'input-name': 'Sinteplast' } },
    ];

    expect(buildCustomValuePreview(recipe, { 'input-name': 'Fuera' }, true, 'text', rows)).toBe('Fila 8: Sinteplast');
  });

  it('previews manual range value recipe transformations over input sources', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'input', inputColumnId: 'input-name' },
            steps: [{ id: 'trim-step', mode: 'text', type: 'trim' }, { id: 'upper-step', mode: 'text', type: 'uppercase' }],
          },
        }],
      }],
    };

    expect(buildCustomValuePreview(recipe, undefined, true, 'text', [
      { rowNumber: 8, values: { 'input-name': '  Sinteplast  ' } },
    ])).toBe('Fila 8: SINTEPLAST');
  });

  it('previews manual range value recipe transformations over fixed and range text sources', () => {
    const fixedRecipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'fixedText', value: 'Promo' },
            steps: [{ id: 'suffix-step', mode: 'text', type: 'addSuffix', value: ' OK' }],
          },
        }],
      }],
    };
    const rangeTextRecipe: Extract<OutputRecipe, { type: 'combine' }> = {
      ...fixedRecipe,
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: '  Promo  ' },
            steps: [{ id: 'trim-step', mode: 'text', type: 'trim' }],
          },
        }],
      }],
    };
    const rows = [{ rowNumber: 8, values: { 'input-name': 'Sinteplast' } }];

    expect(buildCustomValuePreview(fixedRecipe, undefined, true, 'text', rows)).toBe('Fila 8: Promo OK');
    expect(buildCustomValuePreview(rangeTextRecipe, undefined, true, 'text', rows)).toBe('Fila 8: Promo');
  });

  it('previews manual range value recipe concat transformations using previous result and row inputs', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
            steps: [{
              id: 'concat-step',
              mode: 'text',
              type: 'concat',
              parts: [
                { id: 'previous', source: { type: 'previousResult' } },
                { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' }, separatorBefore: ' ' },
              ],
            }],
          },
        }],
      }],
    };

    expect(buildCustomValuePreview(recipe, undefined, true, 'text', [
      { rowNumber: 8, values: { 'input-pack': '12' } },
    ])).toBe('Fila 8: PINCELES SERIE 304 12');
  });

  it('previews manual range concat value recipes even when the base source is empty', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'fixedText', value: '' },
            steps: [{
              id: 'concat-step',
              mode: 'text',
              type: 'concat',
              parts: [
                { id: 'range-text', source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' } },
                { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' } },
              ],
            }],
          },
        }],
      }],
    };

    expect(buildCustomValuePreview(recipe, { 'input-name': 'Fuera', 'input-pack': 'NO' }, true, 'text', [
      { rowNumber: 1, values: { 'input-name': 'Fuera', 'input-pack': 'NO' } },
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': 'VIR 1' } },
    ])).toBe('Fila 8: PINCELES SERIE 304VIR 1');
  });

  it('previews a manual range nested inside concat using a real row inside the range', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [{
        id: 'concat',
        type: 'concat',
        mode: 'text',
        parts: [
          {
            id: 'range-part',
            source: { type: 'previousResult' },
            steps: [{
              id: 'range',
              type: 'manualRange',
              mode: 'text',
              ranges: [{
                id: 'range-8-13',
                startRowNumber: 8,
                endRowNumber: 13,
                valueSource: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'PINCELES SERIE 304' },
              }],
            }],
          },
          { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' }, separatorBefore: ' - ' },
        ],
      }],
    };
    const rows: InputRow[] = [
      { rowNumber: 1, values: { 'input-code': 'Fuera', 'input-pack': '99' } },
      { rowNumber: 8, values: { 'input-code': 'PINCELES SERIE 304', 'input-pack': '12' } },
    ];

    expect(buildCustomValuePreview(recipe, { 'input-code': 'Fuera', 'input-pack': '99' }, true, 'concat', rows)).toBe('Fila 8: PINCELES SERIE 304 - 12');
  });

  it('respects manual range internal conditions when choosing the preview row', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Con condicion' }],
        manualRangeCondition: { inputColumnId: 'input-pack', operator: 'isNotEmpty' },
      }],
    };
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-pack': '' } },
      { rowNumber: 9, values: { 'input-pack': '12' } },
    ];

    expect(buildManualRangeAwarePreview(recipe, rows)).toBe('Fila 9: Con condicion');
  });

  it('does not show misleading range previews when no real row matches', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'No usar' }],
      }],
    };

    expect(buildCustomValuePreview(recipe, { 'input-code': 'Fuera' }, true, 'text', [
      { rowNumber: 1, values: { 'input-code': 'Fuera' } },
    ])).toBe('Sin vista previa para los rangos configurados');
  });

  it('does not preview previous result for the first step', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [
        { id: 'upper', type: 'uppercase', source: { type: 'input', inputColumnId: 'input-code' } },
      ],
    };

    expect(getPreviousStepPreviewValue(recipe, { 'input-code': 'as4350' }, 0)).toBeNull();
  });

  it('previews the value generated before a later step', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [
        { id: 'upper', type: 'uppercase', source: { type: 'input', inputColumnId: 'input-code' } },
        {
          id: 'concat',
          mode: 'text',
          type: 'concat',
          parts: [
            { id: 'previous', source: { type: 'previousResult' } },
            { id: 'suffix', source: { type: 'fixedText', value: '-' } },
          ],
        },
      ],
    };

    expect(getPreviousStepPreviewValue(recipe, { 'input-code': 'as4350' }, 1)).toBe('AS4350');
  });

  it('respects previous step conditions when previewing previous result', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [
        {
          id: 'suffix',
          type: 'addSuffix',
          source: { type: 'input', inputColumnId: 'input-code' },
          value: '-OK',
          condition: {
            target: 'input',
            columnId: 'input-pack',
            operator: 'equals',
            value: 'aplicar',
          },
        },
        { id: 'upper', type: 'uppercase', source: { type: 'previousResult' } },
      ],
    };

    expect(getPreviousStepPreviewValue(recipe, { 'input-code': 'AS4350', 'input-pack': 'omitir' }, 1)).toBe('AS4350');
  });

  it('does not mutate recipe when previewing previous result', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [
        { id: 'suffix', type: 'addSuffix', source: { type: 'input', inputColumnId: 'input-code' }, value: '-' },
        { id: 'upper', type: 'uppercase', source: { type: 'previousResult' } },
      ],
    };
    const originalSteps = recipe.steps;
    const before = JSON.stringify(recipe);

    getPreviousStepPreviewValue(recipe, { 'input-code': 'AS4350' }, 1);

    expect(JSON.stringify(recipe)).toBe(before);
    expect(recipe.steps).toBe(originalSteps);
  });

  it('keeps concat mode selected with an empty combine recipe', () => {
    const recipe = createCustomValueRecipeForMode('concat', { type: 'combine', parts: [], separator: '' });

    expect(recipe).toEqual({
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [],
    });
    expect(buildCustomValuePreview(recipe, { 'input-price': '100' })).toBe('Agrega una parte para ver la vista previa.');
  });

  it('keeps value construction options separate from step modes', () => {
    expect(valueConstructionOptions.map((option) => option.value)).toEqual(['steps', 'concat']);
    expect(valueConstructionOptions.map((option) => option.value)).not.toContain('conversion');
    expect(stepModeOptions.map((option) => option.value)).toEqual(['text', 'number', 'conversion', 'date', 'manualRange']);
    expect(stepModeOptions.find((option) => option.value === 'date')?.label).toBe('Trabajar con fechas');
    expect(stepModeOptions.find((option) => option.value === 'manualRange')?.label).toBe('Trabajar con rangos');
    expect(stepModeOptions.map((option) => option.value)).not.toContain('concat');
  });

  it('maps construction modes to safe combine recipes', () => {
    expect(createRecipeForConstructionMode('steps', { type: 'combine', customMode: 'concat', parts: [], separator: '' })).toMatchObject({
      type: 'combine',
      customMode: 'text',
      parts: [{ type: 'input', inputColumnId: '' }],
      steps: [{ type: 'noop', mode: 'text' }],
    });

    expect(createRecipeForConstructionMode('concat', {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-name' }],
      steps: [{ id: 'noop', type: 'noop', mode: 'text' }],
    })).toEqual({
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [],
    });
  });

  it('does not inherit a concat part column when switching from concat to steps', () => {
    expect(createRecipeForConstructionMode('steps', {
      type: 'combine',
      customMode: 'concat',
      parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name' }],
      separator: '',
    })).toMatchObject({
      type: 'combine',
      customMode: 'text',
      parts: [{ type: 'input', inputColumnId: '' }],
      steps: [{ type: 'noop', mode: 'text' }],
    });
  });

  it('infers simple mixed-step recipes as a value with steps, not concat', () => {
    expect(buildCustomValuePreview(
      {
        type: 'combine',
        parts: [{ id: 'code', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [
          { id: 'extract', type: 'extractNumber' },
          { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 0 },
        ],
      },
      { 'input-code': 'hay 25 personas' },
      true,
    )).toBe('35');
  });

  it('starts text and number modes with a neutral step', () => {
    const textRecipe = createCustomValueRecipeForMode('text', { type: 'combine', parts: [], separator: '' });
    const numberRecipe = createCustomValueRecipeForMode('number', { type: 'combine', parts: [], separator: '' });

    expect(textRecipe.steps).toMatchObject([{ type: 'noop' }]);
    expect(numberRecipe.steps).toMatchObject([{ type: 'noop' }]);
  });

  it('filters step options by step mode', () => {
    expect(getStepTypesForMode('text').find((stepType) => stepType.value === 'noop')?.label).toBe('Usar valor tal cual');
    expect(getStepTypesForMode('text').map((stepType) => stepType.value)).toContain('addSuffix');
    expect(getStepTypesForMode('text').map((stepType) => stepType.value)).not.toContain('manualRange');
    expect(getStepTypesForMode('text').map((stepType) => stepType.value)).toContain('concat');
    expect(getStepTypesForMode('text').map((stepType) => stepType.value)).not.toContain('numericOperation');
    expect(getStepTypesForMode('number').map((stepType) => stepType.value)).toContain('numericOperation');
    expect(getStepTypesForMode('number').map((stepType) => stepType.value)).not.toContain('addSuffix');
    expect(getStepTypesForMode('conversion').map((stepType) => stepType.value)).toEqual(['noop', 'extractNumber', 'toNumber', 'toText']);
    expect(getStepTypesForMode('date').map((stepType) => stepType.value)).toEqual(['noop', 'formatDate']);
    expect(getStepTypesForMode('manualRange').map((stepType) => stepType.value)).toEqual(['manualRange']);
    expect(getStepTypesForMode('date').find((stepType) => stepType.value === 'formatDate')?.label).toBe('Formatear fecha');
  });

  it('shows manual range as an operation mode instead of a text action', () => {
    expect(stepModeOptions).toContainEqual({ value: 'manualRange', label: 'Trabajar con rangos' });
    expect(shouldShowStepTypeSelectForStep({ id: 'range-step', type: 'manualRange', ranges: [] })).toBe(false);
    expect(shouldShowStepTypeSelectForStep({ id: 'text-step', type: 'addSuffix', value: 'lts' })).toBe(true);
  });

  it('creates a manual range step when selecting the manual range operation mode', () => {
    expect(changeStepMode({ id: 'step-1', type: 'noop', mode: 'text' }, 'manualRange')).toMatchObject({
      id: 'step-1',
      mode: 'manualRange',
      type: 'manualRange',
      ranges: [],
    });
  });

  it('renders existing manual range steps as the manual range operation mode', () => {
    expect(getStepMode({ id: 'range-step', type: 'manualRange', ranges: [] })).toBe('manualRange');
    expect(inferStepModeFromType('manualRange')).toBe('manualRange');
  });

  it('exposes date input formats for real spreadsheet display values', () => {
    expect(dateInputFormatOptions.map((option) => option.value)).toContain('MM/DD/YY');
    expect(dateInputFormatOptions.map((option) => option.value)).toContain('M/D/YY');
    expect(dateInputFormatOptions.find((option) => option.value === 'DD/MM/YYYY')?.label).toBe('DD/MM/AAAA');
    expect(dateInputFormatOptions.find((option) => option.value === 'M/D/YYYY')?.label).toBe('M/D/AAAA');
    expect(dateInputFormatOptions.find((option) => option.value === 'MM/DD/YY')?.label).toBe('MM/DD/AA');
    expect(dateInputFormatOptions.find((option) => option.value === 'M/D/YY')?.label).toBe('M/D/AA');
    expect(dateOutputFormatOptions.map((option) => option.value)).toEqual([
      'DD/MM/YYYY',
      'YYYY-MM-DD',
      'MM/DD/YYYY',
      'DD-MM-YYYY',
      'YYYY/MM/DD',
    ]);
    expect(dateOutputFormatOptions.find((option) => option.value === 'YYYY-MM-DD')?.label).toBe('AAAA-MM-DD');
  });

  it('does not offer concat inside concat part transformations', () => {
    expect(getStepTypesForMode('text', { allowConcat: false }).map((stepType) => stepType.value)).toContain('uppercase');
    expect(getStepTypesForMode('text', { allowConcat: false }).map((stepType) => stepType.value)).not.toContain('concat');
  });

  it('shows a neutral integrated primary transform for concat parts without steps', () => {
    expect(getVisibleConcatPartPrimaryStep([])).toMatchObject({
      type: 'noop',
      mode: 'text',
    });
  });

  it('creates the first concat part step when editing the integrated transform', () => {
    expect(updateConcatPartPrimaryStep([], { type: 'uppercase', mode: 'text' })).toMatchObject([
      { type: 'uppercase', mode: 'text' },
    ]);
  });

  it('keeps additional concat part steps when updating the integrated transform', () => {
    expect(updateConcatPartPrimaryStep([
      { id: 'primary', type: 'trim' },
      { id: 'suffix', type: 'addSuffix', value: '!' },
    ], { type: 'uppercase', mode: 'text' })).toMatchObject([
      { id: 'primary', type: 'uppercase', mode: 'text' },
      { id: 'suffix', type: 'addSuffix', value: '!' },
    ]);
  });

  it('exposes real numeric operations without the numericOperation label for the number UI', () => {
    expect(numericOperationOptions.map((option) => option.label)).toEqual([
      'Sumar valor',
      'Restar valor',
      'Multiplicar por',
      'Dividir por',
      'Sumar %',
      'Restar %',
      'Quitar % incluido',
    ]);
    expect(numericOperationOptions.map((option) => option.label)).not.toContain('Operación numérica');
  });

  it('infers step mode from existing step type', () => {
    expect(inferStepModeFromType('addSuffix')).toBe('text');
    expect(inferStepModeFromType('numericOperation')).toBe('number');
    expect(inferStepModeFromType('extractNumber')).toBe('conversion');
    expect(inferStepModeFromType('formatDate')).toBe('date');
    expect(getStepMode({ id: 'noop', type: 'noop' }, 'number')).toBe('number');
  });

  it('keeps different modes in different steps', () => {
    const steps = normalizeStepsForMode([
      { id: 'suffix', type: 'addSuffix', mode: 'text', value: 'lts' },
      { id: 'numeric', type: 'numericOperation', mode: 'number', operation: 'addPercentage', amount: 10 },
    ], 'text');

    expect(steps).toMatchObject([
      { id: 'suffix', type: 'addSuffix', mode: 'text' },
      { id: 'numeric', type: 'numericOperation', mode: 'number' },
    ]);
  });

  it('resets only the changed incompatible step to noop', () => {
    expect(changeStepMode({ id: 'suffix', type: 'addSuffix', mode: 'text', value: 'lts' }, 'number')).toEqual({
      id: 'suffix',
      mode: 'number',
      type: 'noop',
      applyToEmptyValues: false,
    });
    expect(changeStepMode({ id: 'numeric', type: 'numericOperation', mode: 'number', operation: 'addPercentage', amount: 10 }, 'text')).toEqual({
      id: 'numeric',
      mode: 'text',
      type: 'noop',
      applyToEmptyValues: false,
    });
    expect(changeStepMode({ id: 'text', type: 'toText', mode: 'conversion' }, 'conversion')).toEqual({ mode: 'conversion' });
    expect(changeStepMode({ id: 'date', type: 'formatDate', mode: 'date' }, 'date')).toEqual({ mode: 'date' });
  });

  it('infers missing modes without forcing all steps to recipe mode', () => {
    expect(normalizeStepsForMode([
      { id: 'suffix', type: 'addSuffix', value: 'lts' },
      { id: 'numeric', type: 'numericOperation', operation: 'addPercentage', amount: 10 },
      { id: 'convert', type: 'toText' },
    ], 'text')).toMatchObject([
      { id: 'suffix', type: 'addSuffix', mode: 'text' },
      { id: 'numeric', type: 'numericOperation', mode: 'number' },
      { id: 'convert', type: 'toText', mode: 'conversion' },
    ]);
  });

  it('shows a neutral first step directly for an empty custom value recipe', () => {
    expect(getVisibleRecipeSteps({ type: 'combine', parts: [], separator: '' })).toMatchObject([
      { type: 'noop', mode: 'text' },
    ]);
  });

  it('adapts old concat recipes to a visible concat step without losing parts', () => {
    const steps = getVisibleRecipeSteps({
      type: 'combine',
      customMode: 'concat',
      parts: [
        {
          id: 'name',
          type: 'input',
          inputColumnId: 'input-name',
          separatorAfter: ' - ',
          steps: [{ id: 'trim', type: 'trim' }],
        },
        { id: 'fixed', type: 'text', value: 'OK' },
      ],
      separator: '',
      steps: [{ id: 'suffix', type: 'addSuffix', value: '!' }],
    });

    expect(steps).toMatchObject([
      {
        type: 'concat',
        mode: 'text',
        parts: [
          {
            id: 'name',
            source: { type: 'input', inputColumnId: 'input-name' },
            steps: [{ id: 'trim', type: 'trim' }],
          },
          {
            id: 'fixed',
            source: { type: 'fixedText', value: 'OK' },
            separatorBefore: ' - ',
          },
        ],
      },
      { id: 'suffix', type: 'addSuffix', value: '!' },
    ]);
  });

  it('creates safe default concat parts without separators on the first part', () => {
    const firstPart = createDefaultConcatPart(0);
    const secondPart = createDefaultConcatPart(1);
    const laterStepPart = createDefaultConcatPart(0, true);

    expect(firstPart).toMatchObject({
      source: { type: 'input', inputColumnId: '' },
    });
    expect(firstPart).not.toHaveProperty('separatorBefore');
    expect(secondPart).toMatchObject({
      source: { type: 'input', inputColumnId: '' },
      separatorBefore: '',
    });
    expect(laterStepPart).toMatchObject({
      source: { type: 'previousResult' },
    });
    expect(laterStepPart).not.toHaveProperty('separatorBefore');
  });

  it('keeps a valid selected concat part after add/remove flows', () => {
    const parts = [
      { id: 'first', source: { type: 'input' as const, inputColumnId: 'input-name' } },
      { id: 'second', source: { type: 'fixedText' as const, value: ' - ' }, separatorBefore: '' },
      { id: 'third', source: { type: 'input' as const, inputColumnId: 'input-pack' }, separatorBefore: '' },
    ];

    expect(getSafeSelectedConcatPartId(parts, 'second')).toBe('second');
    expect(getSafeSelectedConcatPartId(parts, 'missing')).toBe('first');
    expect(getNextSelectedConcatPartIdAfterRemove(parts, 'second', 'second')).toBe('third');
    expect(getNextSelectedConcatPartIdAfterRemove(parts, 'third', 'third')).toBe('second');
    expect(getNextSelectedConcatPartIdAfterRemove(parts, 'first', 'third')).toBe('third');
    expect(getNextSelectedConcatPartIdAfterRemove([{ id: 'only', source: { type: 'previousResult' as const } }], 'only', 'only')).toBeNull();
  });

  it('summarizes concat parts for the lateral list', () => {
    expect(describeConcatPartSource({ id: 'name', source: { type: 'input', inputColumnId: 'input-name' } }, inputColumns)).toBe('Columna D (Nombre)');
    expect(describeConcatPartSource({ id: 'fixed', source: { type: 'fixedText', value: ' - ' } }, inputColumns)).toBe('Texto fijo " - "');
    expect(describeConcatPartSource({ id: 'previous', source: { type: 'previousResult' } }, inputColumns)).toBe('Resultado del paso anterior');
  });

  it('summarizes manual range steps inside concat parts', () => {
    expect(describeConcatPartSource({
      id: 'range-part',
      source: { type: 'previousResult' },
      steps: [
        {
          id: 'range-step',
          type: 'manualRange',
          ranges: [
            {
              id: 'range-8-13',
              startRowNumber: 8,
              endRowNumber: 13,
              valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
            },
          ],
        },
      ],
    }, inputColumns)).toBe('1 rango · valores desde D - Nombre · 8-13');
  });

  it('preserves concat part steps when editing source-like fields', () => {
    const part = {
      id: 'name',
      source: { type: 'input' as const, inputColumnId: 'input-name' },
      separatorBefore: ' - ',
      steps: [{ id: 'upper', type: 'uppercase' as const }],
    };

    expect({ ...part, source: { type: 'fixedText' as const, value: 'Nombre' } }).toMatchObject({
      separatorBefore: ' - ',
      steps: [{ id: 'upper', type: 'uppercase' }],
    });
    expect({ ...part, separatorBefore: ' / ' }).toMatchObject({
      source: { type: 'input', inputColumnId: 'input-name' },
      steps: [{ id: 'upper', type: 'uppercase' }],
    });
  });

  it('does not invent a transformation for a neutral first step', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name' }],
          separator: '',
          steps: [{ id: 'noop', type: 'noop' }],
        },
        { 'input-name': 'latex iberia' },
      ),
    ).toBe('latex iberia');

    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [{ id: 'noop', type: 'noop' }],
        },
        { 'input-price': '100' },
      ),
    ).toBe('100');
  });

  it('shows numeric preview states without treating text as success', () => {
    const recipe = buildSimpleCustomValueRecipe('number', 'input-code', {
      id: 'numeric',
      type: 'numericOperation',
      operation: 'addPercentage',
      amount: 10,
      rounding: 2,
    });

    expect(buildCustomValuePreview(recipe, { 'input-code': 'ABC123' })).toBe('No se pudo calcular: valor no numérico.');
  });

  it('calculates numeric preview when sample value is currency', () => {
    const recipe = buildSimpleCustomValueRecipe('number', 'input-price', {
      id: 'numeric',
      type: 'numericOperation',
      operation: 'addPercentage',
      amount: 10,
      rounding: 2,
    });

    expect(buildCustomValuePreview(recipe, { 'input-price': '$ 43,138.09' })).toBe('47451.90');
  });

  it('previews text steps sequentially', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name' }],
          separator: '',
          steps: [
            { id: 'trim', type: 'trim' },
            { id: 'upper', type: 'uppercase' },
            { id: 'suffix', type: 'addSuffix', value: ' MATE' },
          ],
        },
        { 'input-name': ' latex iberia ' },
      ),
    ).toBe('LATEX IBERIA MATE');
  });

  it('labels text source fields by operation', () => {
    expect(shouldShowTextSourceFields('uppercase')).toBe(true);
    expect(shouldShowTextSourceFields('addSuffix')).toBe(true);
    expect(shouldShowTextSourceFields('replaceText')).toBe(true);
    expect(shouldShowTextSourceFields('formatDate')).toBe(true);
    expect(shouldShowTextSourceFields('numericOperation')).toBe(false);
    expect(shouldShowTextSourceFields('concat')).toBe(false);
    expect(getTextStepSourceLabel('uppercase')).toBe('Valor a convertir');
    expect(getTextStepSourceLabel('addSuffix')).toBe('Valor base');
    expect(getTextStepSourceLabel('replaceText')).toBe('Valor base');
    expect(getTextStepSourceLabel('formatDate')).toBe('Fecha a formatear');
  });

  it('previews date formatting using the processing engine', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'date', type: 'input', inputColumnId: 'input-date' }],
          separator: '',
          steps: [{
            id: 'format-date',
            mode: 'date',
            type: 'formatDate',
            dateInputFormat: 'DD/MM/YYYY',
            dateOutputFormat: 'YYYY-MM-DD',
          }],
        },
        { 'input-date': '01/06/2024' },
      ),
    ).toBe('2024-06-01');
  });

  it('previews real spreadsheet date display values with two digit years', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'date', type: 'input', inputColumnId: 'input-date' }],
          separator: '',
          steps: [{
            id: 'format-date',
            mode: 'date',
            type: 'formatDate',
            dateInputFormat: 'MM/DD/YY',
            dateOutputFormat: 'YYYY-MM-DD',
            dateInvalidFallback: 'fixedText',
            dateInvalidFallbackText: 'Esta bonito',
          }],
        },
        { 'input-date': '6/1/24' },
      ),
    ).toBe('2024-06-01');
  });

  it('updates date preview when output format changes', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'date', type: 'input', inputColumnId: 'input-date' }],
      separator: '',
      steps: [{
        id: 'format-date',
        mode: 'date',
        type: 'formatDate',
        dateInputFormat: 'MM/DD/YY',
        dateOutputFormat: 'YYYY-MM-DD',
      }],
    };

    expect(buildCustomValuePreview(recipe, { 'input-date': '6/1/24' })).toBe('2024-06-01');
    expect(buildCustomValuePreview({
      ...recipe,
      steps: [{ ...recipe.steps![0], dateOutputFormat: 'DD/MM/YYYY' }],
    }, { 'input-date': '6/1/24' })).toBe('01/06/2024');
  });

  it('applies fixed date fallback only when preview value is invalid', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'date', type: 'input', inputColumnId: 'input-date' }],
      separator: '',
      steps: [{
        id: 'format-date',
        mode: 'date',
        type: 'formatDate',
        dateInputFormat: 'MM/DD/YY',
        dateOutputFormat: 'YYYY-MM-DD',
        dateInvalidFallback: 'fixedText',
        dateInvalidFallbackText: 'Esta bonito',
      }],
    };

    expect(buildCustomValuePreview(recipe, { 'input-date': '6/1/24' })).toBe('2024-06-01');
    expect(buildCustomValuePreview(recipe, { 'input-date': '31/02/24' })).toBe('Esta bonito');
  });

  it('previews uppercase with an explicit input source', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
          separator: '',
          steps: [
            { id: 'upper', type: 'uppercase', source: { type: 'input', inputColumnId: 'input-name' } },
          ],
        },
        { 'input-code': 'abc', 'input-name': 'latex iberia' },
      ),
    ).toBe('LATEX IBERIA');
  });

  it('previews addSuffix with previous result source', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-name' }],
          separator: '',
          steps: [
            { id: 'trim', type: 'trim' },
            { id: 'suffix', type: 'addSuffix', source: { type: 'previousResult' }, value: ' MATE' },
          ],
        },
        { 'input-name': ' latex iberia ' },
      ),
    ).toBe('latex iberia MATE');
  });

  it('previews replaceText with an explicit input source', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
          separator: '',
          steps: [
            {
              id: 'replace',
              type: 'replaceText',
              source: { type: 'input', inputColumnId: 'input-name' },
              searchValue: 'LATEX',
              replaceValue: 'LÁTEX',
            },
          ],
        },
        { 'input-code': 'abc', 'input-name': 'PINTURA LATEX' },
      ),
    ).toBe('PINTURA LÁTEX');
  });

  it('previews numeric steps sequentially', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 2 },
            { id: 'percent', type: 'numericOperation', operation: 'addPercentage', amount: 20, rounding: 2 },
          ],
        },
        { 'input-price': '100' },
      ),
    ).toBe('132.00');
  });

  it('maps old amount-based numeric steps to visible fixed right operands', () => {
    const step = {
      id: 'add',
      type: 'numericOperation' as const,
      operation: 'add' as const,
      amount: 10,
    };

    expect(getVisibleLeftOperand(step, { type: 'input', inputColumnId: 'input-price' })).toEqual({
      type: 'input',
      inputColumnId: 'input-price',
    });
    expect(getVisibleRightOperand(step)).toEqual({
      type: 'fixedText',
      value: '10',
      numericFallback: 10,
    });
  });

  it('keeps configured numeric operands visible', () => {
    const step = {
      id: 'subtract',
      type: 'numericOperation' as const,
      leftOperand: { type: 'input' as const, inputColumnId: 'input-price' },
      rightOperand: { type: 'previousResult' as const },
      amount: 10,
    };

    expect(getVisibleLeftOperand(step, { type: 'previousResult' })).toEqual({ type: 'input', inputColumnId: 'input-price' });
    expect(getVisibleRightOperand(step)).toEqual({ type: 'previousResult' });
  });

  it('previews numeric operands preserving subtraction order', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            {
              id: 'previous-minus-input',
              type: 'numericOperation',
              operation: 'subtract',
              leftOperand: { type: 'previousResult' },
              rightOperand: { type: 'input', inputColumnId: 'input-code' },
              rounding: 0,
            },
          ],
        },
        { 'input-price': '100', 'input-code': '25' },
      ),
    ).toBe('75');

    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            {
              id: 'input-minus-previous',
              type: 'numericOperation',
              operation: 'subtract',
              leftOperand: { type: 'input', inputColumnId: 'input-code' },
              rightOperand: { type: 'previousResult' },
              rounding: 0,
            },
          ],
        },
        { 'input-price': '100', 'input-code': '25' },
      ),
    ).toBe('-75');
  });

  it('previews numeric operands with input plus input and division order', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            {
              id: 'add',
              type: 'numericOperation',
              operation: 'add',
              leftOperand: { type: 'input', inputColumnId: 'input-price' },
              rightOperand: { type: 'input', inputColumnId: 'input-code' },
              rounding: 0,
            },
          ],
        },
        { 'input-price': '100', 'input-code': '25' },
      ),
    ).toBe('125');

    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            {
              id: 'divide',
              type: 'numericOperation',
              operation: 'divide',
              leftOperand: { type: 'input', inputColumnId: 'input-price' },
              rightOperand: { type: 'input', inputColumnId: 'input-code' },
              rounding: 0,
            },
          ],
        },
        { 'input-price': '100', 'input-code': '25' },
      ),
    ).toBe('4');
  });

  it('previews numeric operands without requiring a legacy base column', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'empty-base', type: 'input', inputColumnId: '' }],
          separator: '',
          steps: [
            {
              id: 'add',
              type: 'numericOperation',
              operation: 'add',
              leftOperand: { type: 'input', inputColumnId: 'input-price' },
              rightOperand: { type: 'fixedText', value: '10', numericFallback: 10 },
              rounding: 2,
            },
          ],
        },
        { 'input-price': '100' },
      ),
    ).toBe('110.00');
  });

  it('previews numeric operands even when a stale customMode says text', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'empty-base', type: 'input', inputColumnId: '' }],
          separator: '',
          steps: [
            {
              id: 'add',
              mode: 'number',
              type: 'numericOperation',
              operation: 'add',
              leftOperand: { type: 'input', inputColumnId: 'input-price' },
              rightOperand: { type: 'fixedText', value: '10', numericFallback: 10 },
              rounding: 2,
            },
          ],
        },
        { 'input-price': '100' },
        true,
        'text',
      ),
    ).toBe('110.00');
  });

  it('previews numeric input minus fixed value', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'empty-base', type: 'input', inputColumnId: '' }],
          separator: '',
          steps: [
            {
              id: 'subtract',
              type: 'numericOperation',
              operation: 'subtract',
              leftOperand: { type: 'input', inputColumnId: 'input-price' },
              rightOperand: { type: 'fixedText', value: '10', numericFallback: 10 },
              rounding: 0,
            },
          ],
        },
        { 'input-price': '100' },
      ),
    ).toBe('90');
  });

  it('previews numeric previous result plus fixed value from a later step', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            { id: 'noop', type: 'noop' },
            {
              id: 'add',
              type: 'numericOperation',
              operation: 'add',
              leftOperand: { type: 'previousResult' },
              rightOperand: { type: 'fixedText', value: '10', numericFallback: 10 },
              rounding: 0,
            },
          ],
        },
        { 'input-price': '100' },
      ),
    ).toBe('110');
  });

  it('skips a conditioned step and applies the next step to the previous value', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            {
              id: 'skipped',
              type: 'numericOperation',
              operation: 'add',
              amount: 10,
              rounding: 2,
              condition: { target: 'input', columnId: 'input-code', operator: 'equals', value: 'APPLY' },
            },
            { id: 'percent', type: 'numericOperation', operation: 'addPercentage', amount: 20, rounding: 2 },
          ],
        },
        { 'input-price': '100', 'input-code': 'SKIP' },
      ),
    ).toBe('120.00');
  });

  it('previews extraction before numeric operation', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'code', type: 'input', inputColumnId: 'input-code' }],
          separator: '',
          steps: [
            { id: 'extract', type: 'extractNumber' },
            { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 0 },
          ],
        },
        { 'input-code': 'hay 25 personas' },
      ),
    ).toBe('35');
  });

  it('previews text after numeric operation when converting explicitly to text', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 0 },
            { id: 'text', type: 'toText' },
            { id: 'suffix', type: 'addSuffix', value: ' personas' },
          ],
        },
        { 'input-price': '25' },
      ),
    ).toBe('35 personas');
  });

  it('shows concat empty state when concat mode is selected without parts', () => {
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '' }, { 'input-price': '100' }, true, 'concat')).toBe('Agrega una parte para ver la vista previa.');
  });

  it('previews concat when parts are configured', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          parts: [
            { id: 'text', type: 'text', value: 'PC' },
            { id: 'code', type: 'input', inputColumnId: 'input-code' },
          ],
          separator: '',
        },
        { 'input-code': '3074' },
        true,
        'concat',
      ),
    ).toBe('PC3074');
  });

  it('previews concat step with input and fixed text parts', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'concat',
              mode: 'text',
              type: 'concat',
              parts: [
                { id: 'name', source: { type: 'input', inputColumnId: 'input-name' } },
                { id: 'separator', source: { type: 'fixedText', value: ' - ' } },
                { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' } },
              ],
            },
          ],
        },
        { 'input-name': 'Nombre', 'input-pack': 'Envase' },
      ),
    ).toBe('Nombre - Envase');
  });

  it('previews concat step using the reordered parts order and preserving part fields', () => {
    const namePart = {
      id: 'name',
      source: { type: 'input' as const, inputColumnId: 'input-name' },
      steps: [{ id: 'upper', type: 'uppercase' as const }],
    };
    const packPart = {
      id: 'pack',
      source: { type: 'input' as const, inputColumnId: 'input-pack' },
      separatorBefore: ' - ',
    };
    const reorderedParts = normalizeConcatPartsAfterReorder([packPart, namePart]);

    expect(reorderedParts[0]).toMatchObject({
      id: 'pack',
      source: { type: 'input', inputColumnId: 'input-pack' },
    });
    expect(reorderedParts[0]).not.toHaveProperty('separatorBefore');
    expect(reorderedParts[1]).toMatchObject({
      id: 'name',
      separatorBefore: ' - ',
      steps: [{ id: 'upper', type: 'uppercase' }],
    });
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'concat',
              mode: 'text',
              type: 'concat',
              parts: reorderedParts,
            },
          ],
        },
        { 'input-name': 'Nombre', 'input-pack': 'Envase' },
      ),
    ).toBe('Envase - NOMBRE');
  });

  it('passes concat step result to the next step', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'concat',
              mode: 'text',
              type: 'concat',
              parts: [
                { id: 'name', source: { type: 'input', inputColumnId: 'input-name' } },
                { id: 'fixed', source: { type: 'fixedText', value: ' mate' } },
              ],
            },
            { id: 'upper', type: 'uppercase', source: { type: 'previousResult' } },
          ],
        },
        { 'input-name': 'latex' },
      ),
    ).toBe('LATEX MATE');
  });

  it('previews concat step with previous result in later steps', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            { id: 'upper', type: 'uppercase', source: { type: 'input', inputColumnId: 'input-name' } },
            {
              id: 'concat',
              mode: 'text',
              type: 'concat',
              parts: [
                { id: 'previous', source: { type: 'previousResult' } },
                { id: 'separator', source: { type: 'fixedText', value: ' - ' } },
                { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' } },
              ],
            },
          ],
        },
        { 'input-name': 'nombre', 'input-pack': 'Envase' },
      ),
    ).toBe('NOMBRE - Envase');
  });

  it('keeps concat input and fixed text parts working without steps', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [
            { id: 'name', type: 'input', inputColumnId: 'input-name', separatorAfter: ' - ' },
            { id: 'fixed', type: 'text', value: 'OK' },
          ],
          separator: '',
        },
        { 'input-name': 'Latex' },
      ),
    ).toBe('Latex - OK');
  });

  it('applies concat part steps in order before joining parts', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [
            {
              id: 'name',
              type: 'input',
              inputColumnId: 'input-name',
              separatorAfter: ' ',
              steps: [
                { id: 'trim', type: 'trim' },
                { id: 'upper', type: 'uppercase' },
              ],
            },
            { id: 'pack', type: 'input', inputColumnId: 'input-pack' },
          ],
          separator: '',
        },
        { 'input-name': ' latex ', 'input-pack': '20L' },
      ),
    ).toBe('LATEX 20L');
  });

  it('previews concat part text transformations', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'concat',
              type: 'concat',
              mode: 'text',
              parts: [
                {
                  id: 'name',
                  source: { type: 'input', inputColumnId: 'input-name' },
                  steps: [{ id: 'upper', type: 'uppercase' }],
                },
                {
                  id: 'pack',
                  source: { type: 'input', inputColumnId: 'input-pack' },
                  separatorBefore: ' - ',
                  steps: [{ id: 'lower', type: 'lowercase' }],
                },
              ],
            },
          ],
        },
        { 'input-name': 'Nombre', 'input-pack': 'ENVASE' },
      ),
    ).toBe('NOMBRE - envase');
  });

  it('previews concat part conversion transformations', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'concat',
              type: 'concat',
              mode: 'text',
              parts: [
                {
                  id: 'code',
                  source: { type: 'input', inputColumnId: 'input-code' },
                  steps: [
                    { id: 'extract', type: 'extractNumber' },
                    { id: 'text', type: 'toText' },
                    { id: 'prefix', type: 'addPrefix', value: 'N-' },
                  ],
                },
              ],
            },
          ],
        },
        { 'input-code': 'ABC123' },
      ),
    ).toBe('N-123');
  });

  it('previews concat part numeric transformations', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'concat',
              type: 'concat',
              mode: 'text',
              parts: [
                { id: 'prefix', source: { type: 'fixedText', value: '$ ' } },
                {
                  id: 'price',
                  source: { type: 'input', inputColumnId: 'input-price' },
                  steps: [
                    { id: 'number', type: 'toNumber' },
                    { id: 'add', type: 'numericOperation', operation: 'addPercentage', amount: 10, rounding: 2 },
                    { id: 'text', type: 'toText' },
                  ],
                },
              ],
            },
          ],
        },
        { 'input-price': '100' },
      ),
    ).toBe('$ 110.00');
  });

  it('keeps noop concat part steps neutral', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name', steps: [{ id: 'noop', type: 'noop' }] }],
          separator: '',
        },
        { 'input-name': 'Latex' },
      ),
    ).toBe('Latex');
  });

  it('applies numeric concat part steps before joining', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [
            { id: 'prefix', type: 'text', value: '$ ' },
            {
              id: 'price',
              type: 'input',
              inputColumnId: 'input-price',
              steps: [
                { id: 'number', type: 'toNumber' },
                { id: 'add', type: 'numericOperation', operation: 'addPercentage', amount: 10, rounding: 2 },
                { id: 'text', type: 'toText' },
              ],
            },
          ],
          separator: '',
        },
        { 'input-price': '100' },
      ),
    ).toBe('$ 110.00');
  });

  it('shows specific empty states for simple number and text modes', () => {
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '', steps: [{ id: 'numeric', type: 'numericOperation' }] }, {}, true, 'number')).toBe('Selecciona una columna numérica.');
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '', steps: [{ id: 'suffix', type: 'addSuffix', value: 'lts' }] }, {}, true, 'text')).toBe('Selecciona una columna de texto.');
  });

  it('builds a readable summary for combine parts', () => {
    expect(
      describeCombineParts(
        {
          type: 'combine',
          parts: [
            { id: 'prefix', type: 'text', value: 'PC' },
            { id: 'code', type: 'input', inputColumnId: 'input-code' },
            { id: 'name', type: 'input', inputColumnId: 'input-name' },
            { id: 'pack', type: 'input', inputColumnId: 'input-pack' },
          ],
        },
        inputColumns,
      ),
    ).toBe('Texto: "PC" | Columna A | Columna D (Nombre) | Columna F (Presentacion)');
  });

  it('labels a single constructor part as base', () => {
    expect(
      getConstructorPartsSummary(
        {
          type: 'combine',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
        },
        inputColumns,
      ),
    ).toBe('Base: Columna AN (Precio)');
  });

  it('labels multiple constructor parts as parts', () => {
    expect(
      getConstructorPartsSummary(
        {
          type: 'combine',
          parts: [
            { id: 'name', type: 'input', inputColumnId: 'input-name' },
            { id: 'pack', type: 'input', inputColumnId: 'input-pack' },
          ],
        },
        inputColumns,
      ),
    ).toBe('Partes: Columna D (Nombre) | Columna F (Presentacion)');
  });

  it('builds display labels for custom value parts', () => {
    expect(getCustomValuePartsDisplayLabel({ type: 'combine', parts: [], separator: '' })).toBe('Partes configuradas');
    expect(getCustomValuePartsDisplaySummary({ type: 'combine', parts: [], separator: '' }, inputColumns)).toBe('Sin partes configuradas');

    expect(
      getCustomValuePartsDisplayLabel({
        type: 'combine',
        parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
      }),
    ).toBe('Origen/base');
    expect(
      getCustomValuePartsDisplaySummary({
        type: 'combine',
        parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
      }, inputColumns),
    ).toBe('Columna AN (Precio)');
  });

  it('summarizes numeric operation adjustments', () => {
    expect(
      getConstructorAdjustmentsSummary(
        {
          type: 'combine',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          steps: [{
            id: 'numeric',
            type: 'numericOperation',
            operation: 'addPercentage',
            amount: 10,
            rounding: 2,
          }],
        },
        inputColumns,
      ),
    ).toBe('sumar 10% · 2 decimales');
  });

  it('builds readable display labels for constructor adjustments', () => {
    expect(
      getConstructorAdjustmentLabels(
        {
          type: 'combine',
          parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name', steps: [{ id: 'upper', type: 'uppercase' }] }],
          steps: [{ id: 'trim', type: 'trim' }],
        },
        inputColumns,
      ),
    ).toEqual(['Mayúsculas en Columna D (Nombre)', 'Limpiar espacios']);
  });

  it('builds a preview using sample input values and part steps', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          parts: [
            { id: 'prefix', type: 'text', value: 'PC' },
            {
              id: 'code',
              type: 'input',
              inputColumnId: 'input-code',
              separatorAfter: ' - ',
              steps: [{ id: 'suffix', type: 'addSuffix', value: 'lts' }],
            },
            { id: 'units', type: 'text', value: '4 unidades' },
          ],
        },
        { 'input-code': '3074' },
      ),
    ).toBe('PC3074lts - 4 unidades');
  });

  it('applies prefix and suffix text adjustments to concat preview', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          parts: [
            {
              id: 'code',
              type: 'input',
              inputColumnId: 'input-code',
              steps: [
                { id: 'prefix', type: 'addPrefix', value: 'SKU-' },
                { id: 'suffix', type: 'addSuffix', value: '-OK' },
              ],
            },
          ],
        },
        { 'input-code': '3074' },
      ),
    ).toBe('SKU-3074-OK');
  });

  it('keeps one prefix and suffix adjustment when updating text steps', () => {
    const withPrefix = setSimpleStep([], 'addPrefix', 'PC');
    const updatedPrefix = setSimpleStep(withPrefix, 'addPrefix', 'SKU-');
    const withSuffix = setSimpleStep(updatedPrefix, 'addSuffix', 'lts');

    expect(getSimpleStepValue(withSuffix, 'addPrefix')).toBe('SKU-');
    expect(getSimpleStepValue(withSuffix, 'addSuffix')).toBe('lts');
    expect(withSuffix.filter((step) => step.type === 'addPrefix')).toHaveLength(1);
    expect(withSuffix.filter((step) => step.type === 'addSuffix')).toHaveLength(1);
  });
});
