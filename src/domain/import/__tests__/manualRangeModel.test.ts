import { describe, expect, it } from 'vitest';
import type { InputColumn, InputRow, ManualRangeValue, OutputRecipe } from '../../../types/import';
import {
  findOverlappingManualRange,
  generateManualRangesFromTexts,
  getManualRangeFixedTextValue,
  getManualRangeInputSource,
  getManualRangeRangeTextSource,
  getManualRangeValueRecipeSource,
  getManualRangeValueSourceType,
  hasOverlappingManualRanges,
  manualRangesOverlap,
  updateManualRangeFixedTextValue,
  updateManualRangeInputValue,
  updateManualRangePrimarySource,
  updateManualRangePrimarySourceAndSteps,
  updateManualRangeRangeTextValue,
  updateManualRangeValueSourceType,
} from '../manualRangeModel';

function range(id: string, startRowNumber: number, endRowNumber: number): ManualRangeValue {
  return {
    id,
    startRowNumber,
    endRowNumber,
    valueRecipe: { source: { type: 'fixedText', value: '' }, steps: [] },
  };
}

describe('manualRangeModel overlaps', () => {
  it('detects inclusive overlaps', () => {
    expect(manualRangesOverlap(range('a', 2, 5), range('b', 5, 8))).toBe(true);
    expect(manualRangesOverlap(range('a', 10, 10), range('b', 10, 12))).toBe(true);
    expect(manualRangesOverlap(range('a', 3, 7), range('b', 1, 3))).toBe(true);
  });

  it('does not detect contiguous non-overlapping ranges', () => {
    expect(manualRangesOverlap(range('a', 2, 5), range('b', 6, 8))).toBe(false);
    expect(manualRangesOverlap(range('a', 3, 7), range('b', 1, 2))).toBe(false);
  });

  it('ignores the edited range while searching overlaps', () => {
    const ranges = [
      range('current', 2, 5),
      range('other', 6, 8),
    ];

    expect(findOverlappingManualRange(range('current', 4, 7), ranges, 'current')).toEqual(expect.objectContaining({ id: 'other' }));
    expect(findOverlappingManualRange(range('current', 2, 5), ranges, 'current')).toBeNull();
  });
});

describe('manualRangeModel text-start generation', () => {
  it('extends each detected text range until the row before the next detected text', () => {
    const ranges = generateManualRangesFromTexts(rowsWithTexts([3, 9, 12], 20), {
      inputColumnId: 'input-code',
      startRowNumber: 1,
      endRowNumber: 20,
      idFactory: createIdFactory(),
    });

    expect(ranges.map(({ startRowNumber, endRowNumber }) => ({ startRowNumber, endRowNumber }))).toEqual([
      { startRowNumber: 3, endRowNumber: 8 },
      { startRowNumber: 9, endRowNumber: 11 },
      { startRowNumber: 12, endRowNumber: 20 },
    ]);
    expect(hasOverlappingManualRanges(ranges)).toBe(false);
  });

  it('creates valid ranges for consecutive detected texts', () => {
    const ranges = generateManualRangesFromTexts(rowsWithTexts([3, 4], 10), {
      inputColumnId: 'input-code',
      startRowNumber: 1,
      endRowNumber: 10,
      idFactory: createIdFactory(),
    });

    expect(ranges.map(({ startRowNumber, endRowNumber }) => ({ startRowNumber, endRowNumber }))).toEqual([
      { startRowNumber: 3, endRowNumber: 3 },
      { startRowNumber: 4, endRowNumber: 10 },
    ]);
    expect(hasOverlappingManualRanges(ranges)).toBe(false);
  });

  it('extends a single detected text to the final available row', () => {
    const ranges = generateManualRangesFromTexts(rowsWithTexts([3], 10), {
      inputColumnId: 'input-code',
      startRowNumber: 1,
      endRowNumber: 10,
      idFactory: createIdFactory(),
    });

    expect(ranges.map(({ startRowNumber, endRowNumber }) => ({ startRowNumber, endRowNumber }))).toEqual([
      { startRowNumber: 3, endRowNumber: 10 },
    ]);
  });
});

describe('manualRangeModel range value source compatibility', () => {
  const inputColumns: InputColumn[] = [
    {
      id: 'input-name',
      columnIndex: 0,
      columnLetter: 'A',
      label: 'A',
      active: true,
      sampleValues: [],
      nonEmptyCount: 1,
    },
  ];

  it('reads valueRecipe source before legacy valueSource and value fallbacks', () => {
    expect(getManualRangeValueSourceType({
      id: 'recipe-wins',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [] },
      valueSource: { type: 'rangeText', inputColumnId: 'legacy-column', selectedText: 'Legacy' },
      value: 'Legacy value',
    })).toBe('input');
    expect(getManualRangeValueRecipeSource({
      id: 'recipe-wins',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Recipe' }, steps: [] },
      valueSource: { type: 'fixedText', value: 'Legacy' },
    })).toEqual({ type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Recipe' });
    expect(getManualRangeValueRecipeSource({
      id: 'legacy-range-text',
      startRowNumber: 1,
      endRowNumber: 2,
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Legacy range' },
    })).toEqual({ type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Legacy range' });
    expect(getManualRangeValueRecipeSource({
      id: 'legacy-fixed',
      startRowNumber: 1,
      endRowNumber: 2,
      valueSource: { type: 'fixedText', value: 'Legacy fixed' },
    })).toEqual({ type: 'fixedText', value: 'Legacy fixed' });
    expect(getManualRangeValueRecipeSource({
      id: 'legacy-value',
      startRowNumber: 1,
      endRowNumber: 2,
      value: 'Legacy value',
    })).toEqual({ type: 'fixedText', value: 'Legacy value' });
  });

  it('reads specific input and range-text sources with legacy fallbacks', () => {
    expect(getManualRangeInputSource({
      id: 'input',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [] },
      valueSource: { type: 'rangeText', inputColumnId: 'legacy', selectedText: 'Legacy' },
    })).toEqual({ type: 'input', inputColumnId: 'input-name' });
    expect(getManualRangeInputSource({
      id: 'no-input',
      startRowNumber: 1,
      endRowNumber: 2,
      valueSource: { type: 'rangeText', inputColumnId: 'legacy', selectedText: 'Legacy' },
    })).toEqual({ type: 'input', inputColumnId: '' });
    expect(getManualRangeRangeTextSource({
      id: 'range-text',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Recipe' }, steps: [] },
      valueSource: { type: 'rangeText', inputColumnId: 'legacy', selectedText: 'Legacy' },
    })).toEqual({ type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Recipe' });
    expect(getManualRangeRangeTextSource({
      id: 'legacy-range-text',
      startRowNumber: 1,
      endRowNumber: 2,
      valueSource: { type: 'rangeText', inputColumnId: 'legacy', selectedText: 'Legacy' },
    })).toEqual({ type: 'rangeText', inputColumnId: 'legacy', selectedText: 'Legacy' });
    expect(getManualRangeFixedTextValue({
      id: 'fixed',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'fixedText', value: 'Recipe fixed' }, steps: [] },
      valueSource: { type: 'fixedText', value: 'Legacy fixed' },
      value: 'Legacy value',
    })).toBe('Recipe fixed');
  });

  it('writes primary source changes while preserving current legacy cleanup behavior', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range',
        startRowNumber: 1,
        endRowNumber: 2,
        valueRecipe: { source: { type: 'fixedText', value: 'Current' }, steps: [{ id: 'trim', type: 'trim' }] },
        valueSource: { type: 'fixedText', value: 'Current' },
        value: 'Legacy value',
      }],
    };

    const inputRecipe = updateManualRangeInputValue(recipe, 'range', 'input-name');
    expect(inputRecipe.ranges[0]).toEqual({
      id: 'range',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [{ id: 'trim', type: 'trim' }] },
    });

    const fixedRecipe = updateManualRangeFixedTextValue(inputRecipe, 'range', 'Fixed');
    expect(fixedRecipe.ranges[0]).toMatchObject({
      valueRecipe: { source: { type: 'fixedText', value: 'Fixed' }, steps: [{ id: 'trim', type: 'trim' }] },
      valueSource: { type: 'fixedText', value: 'Fixed' },
    });

    const rangeTextRecipe = updateManualRangeRangeTextValue(fixedRecipe, 'range', {
      inputColumnId: 'input-name',
      selectedText: 'Found',
    });
    expect(rangeTextRecipe.ranges[0]).toMatchObject({
      valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Found' }, steps: [{ id: 'trim', type: 'trim' }] },
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Found' },
    });
  });

  it('changes source type while preserving current valueSource compatibility rules', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range',
        startRowNumber: 1,
        endRowNumber: 2,
        valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Found' }, steps: [{ id: 'trim', type: 'trim' }] },
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Found' },
      }],
    };

    const inputRecipe = updateManualRangeValueSourceType(recipe, 'range', 'input', inputColumns);
    expect(inputRecipe.ranges[0]).toEqual({
      id: 'range',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [{ id: 'trim', type: 'trim' }] },
    });

    const rangeTextRecipe = updateManualRangeValueSourceType(inputRecipe, 'range', 'rangeText', inputColumns);
    expect(rangeTextRecipe.ranges[0]).toMatchObject({
      valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: '' }, steps: [{ id: 'trim', type: 'trim' }] },
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: '' },
    });

    const fixedTextRecipe = updateManualRangeValueSourceType(rangeTextRecipe, 'range', 'fixedText', inputColumns);
    expect(fixedTextRecipe.ranges[0]).toMatchObject({
      valueRecipe: { source: { type: 'fixedText', value: '' }, steps: [{ id: 'trim', type: 'trim' }] },
      valueSource: { type: 'fixedText', value: '' },
    });
  });

  it('applies primary range input sources with current valueSource cleanup behavior', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      condition: { inputColumnId: 'input-name', operator: 'isNotEmpty' },
      ranges: [{
        id: 'range',
        startRowNumber: 1,
        endRowNumber: 2,
        valueRecipe: { source: { type: 'fixedText', value: 'Current' }, steps: [{ id: 'trim', type: 'trim' }] },
        valueSource: { type: 'fixedText', value: 'Current' },
        value: 'Legacy value',
      }],
    };

    const updated = updateManualRangePrimarySource(recipe, 'range', { type: 'input', inputColumnId: 'input-name' });

    expect(updated.condition).toEqual(recipe.condition);
    expect(updated.ranges[0]).toEqual({
      id: 'range',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [{ id: 'trim', type: 'trim' }] },
    });
  });

  it('applies primary rangeText sources with current legacy valueSource behavior and reconciliation', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range',
        startRowNumber: 1,
        endRowNumber: 2,
        valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [{ id: 'trim', type: 'trim' }] },
      }],
    };
    const manualRangeRows: InputRow[] = [
      { rowNumber: 1, values: { 'input-name': 'Found' } },
      { rowNumber: 2, values: { 'input-name': 'Other' } },
    ];

    const updated = updateManualRangePrimarySource(recipe, 'range', {
      type: 'rangeText',
      inputColumnId: 'input-name',
      selectedText: 'Missing',
    }, manualRangeRows);

    expect(updated.ranges[0]).toMatchObject({
      valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: '' }, steps: [{ id: 'trim', type: 'trim' }] },
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: '' },
    });
  });

  it('applies primary fixed text sources used by column text picker with current legacy valueSource behavior', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range',
        startRowNumber: 1,
        endRowNumber: 2,
        valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [{ id: 'trim', type: 'trim' }] },
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Found' },
      }],
    };

    const updated = updateManualRangePrimarySource(recipe, 'range', { type: 'fixedText', value: 'Picked cell text' });

    expect(updated.ranges[0]).toMatchObject({
      valueRecipe: { source: { type: 'fixedText', value: 'Picked cell text' }, steps: [{ id: 'trim', type: 'trim' }] },
      valueSource: { type: 'fixedText', value: 'Picked cell text' },
    });
  });

  it('applies primary range source and steps together without changing legacy rules', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range',
        startRowNumber: 1,
        endRowNumber: 2,
        valueRecipe: { source: { type: 'fixedText', value: 'Current' }, steps: [] },
        valueSource: { type: 'fixedText', value: 'Current' },
      }],
    };

    const updated = updateManualRangePrimarySourceAndSteps(
      recipe,
      'range',
      { type: 'input', inputColumnId: 'input-name' },
      [{ id: 'upper', type: 'uppercase' }],
    );

    expect(updated.ranges[0]).toEqual({
      id: 'range',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [{ id: 'upper', type: 'uppercase' }] },
    });
  });
});

function rowsWithTexts(textRows: number[], finalRowNumber: number): InputRow[] {
  const textRowSet = new Set(textRows);
  return Array.from({ length: finalRowNumber }, (_, index) => {
    const rowNumber = index + 1;
    return {
      rowNumber,
      values: { 'input-code': textRowSet.has(rowNumber) ? `Dato ${rowNumber}` : '' },
    };
  });
}

function createIdFactory() {
  let nextId = 1;
  return () => `range-${nextId++}`;
}
