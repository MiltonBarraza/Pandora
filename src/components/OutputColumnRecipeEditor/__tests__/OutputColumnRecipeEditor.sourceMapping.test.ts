import { describe, expect, it } from 'vitest';
import type { InputColumn, StepSource } from '../../../types/import';
import {
  getRangeValueConcatPartRangeTextSource,
  getRangeValueConcatPartSourceDropdownValue,
  getRangeValueConcatPartSourceFromDropdownValue,
  getRangeValueSourceSelection,
  getStepSourceDropdownValue,
  getStepSourceFromDropdownValue,
  shouldShowPreviousResultSourceHelp,
} from '../OutputColumnRecipeEditor.sourceMapping';

const inputColumns: InputColumn[] = [
  { id: 'input-code', columnIndex: 0, columnLetter: 'A', label: 'A', active: true, sampleValues: ['A-1'], nonEmptyCount: 1 },
  { id: 'input-name', columnIndex: 3, columnLetter: 'D', label: 'D', header: 'Nombre', active: true, sampleValues: ['Pincel'], nonEmptyCount: 1 },
];

describe('source mapping adapter', () => {
  it('maps normal step sources to dropdown values and back', () => {
    expect(getStepSourceDropdownValue({ type: 'previousResult' })).toBe('previousResult');
    expect(getStepSourceDropdownValue({ type: 'fixedText', value: 'Manual' })).toBe('fixedText');
    expect(getStepSourceDropdownValue({ type: 'input', inputColumnId: 'input-code' })).toBe('input:input-code');
    expect(getStepSourceDropdownValue({ type: 'input', inputColumnId: '' })).toBe('');

    expect(getStepSourceFromDropdownValue('previousResult', { type: 'input', inputColumnId: 'input-code' })).toEqual({ type: 'previousResult' });
    expect(getStepSourceFromDropdownValue('fixedText', { type: 'fixedText', value: 'Manual' })).toEqual({ type: 'fixedText', value: 'Manual' });
    expect(getStepSourceFromDropdownValue('fixedText', { type: 'input', inputColumnId: 'input-code' })).toEqual({ type: 'fixedText', value: '' });
    expect(getStepSourceFromDropdownValue('input:input-name', { type: 'previousResult' })).toEqual({ type: 'input', inputColumnId: 'input-name' });
    expect(getStepSourceFromDropdownValue('', { type: 'input', inputColumnId: 'input-code' })).toEqual({ type: 'input', inputColumnId: 'input-code' });
  });

  it('keeps previous-result help policy pure', () => {
    expect(shouldShowPreviousResultSourceHelp({ type: 'previousResult' })).toBe(true);
    expect(shouldShowPreviousResultSourceHelp({ type: 'input', inputColumnId: 'input-code' })).toBe(false);
    expect(shouldShowPreviousResultSourceHelp({ type: 'fixedText', value: 'AS4350' })).toBe(false);
  });

  it('maps primary range source dropdown values to source selections', () => {
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
    expect(getRangeValueSourceSelection('input')).toEqual({
      type: 'valueSourceType',
      value: 'input',
    });
  });

  it('maps range concat part sources to dropdown values and back', () => {
    expect(getRangeValueConcatPartSourceDropdownValue({ type: 'previousResult' })).toBe('previousResult');
    expect(getRangeValueConcatPartSourceDropdownValue({ type: 'fixedText', value: 'Manual' })).toBe('fixedText');
    expect(getRangeValueConcatPartSourceDropdownValue({ type: 'rangeText', inputColumnId: 'input-code', selectedText: 'Found' })).toBe('rangeText');
    expect(getRangeValueConcatPartSourceDropdownValue({ type: 'input', inputColumnId: 'input-name' })).toBe('input:input-name');
    expect(getRangeValueConcatPartSourceDropdownValue({ type: 'input', inputColumnId: '' })).toBe('');

    expect(getRangeValueConcatPartSourceFromDropdownValue('previousResult', { type: 'input', inputColumnId: 'input-code' })).toEqual({ type: 'previousResult' });
    expect(getRangeValueConcatPartSourceFromDropdownValue('fixedText', { type: 'fixedText', value: 'Manual' })).toEqual({ type: 'fixedText', value: 'Manual' });
    expect(getRangeValueConcatPartSourceFromDropdownValue('fixedText', { type: 'input', inputColumnId: 'input-code' })).toEqual({ type: 'fixedText', value: '' });
    expect(getRangeValueConcatPartSourceFromDropdownValue('rangeText', { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'Found' })).toEqual({
      type: 'rangeText',
      inputColumnId: 'input-code',
      selectedText: 'Found',
    });
    expect(getRangeValueConcatPartSourceFromDropdownValue('rangeText', { type: 'input', inputColumnId: 'input-code' })).toEqual({
      type: 'rangeText',
      inputColumnId: '',
      selectedText: '',
    });
    expect(getRangeValueConcatPartSourceFromDropdownValue('input:input-name', { type: 'previousResult' })).toEqual({ type: 'input', inputColumnId: 'input-name' });
    expect(getRangeValueConcatPartSourceFromDropdownValue('', { type: 'input', inputColumnId: 'input-code' })).toEqual({ type: 'input', inputColumnId: 'input-code' });
  });

  it('keeps range concat roundtrips stable for persisted source kinds', () => {
    const sources: StepSource[] = [
      { type: 'previousResult' },
      { type: 'fixedText', value: 'Manual' },
      { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'Found' },
      { type: 'input', inputColumnId: 'input-name' },
    ];

    expect(sources.map((source) => getRangeValueConcatPartSourceFromDropdownValue(
      getRangeValueConcatPartSourceDropdownValue(source),
      source,
    ))).toEqual(sources);
  });

  it('normalizes range concat rangeText detail source without mutating current source', () => {
    expect(getRangeValueConcatPartRangeTextSource(
      { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'Found' },
      inputColumns,
    )).toEqual({ type: 'rangeText', inputColumnId: 'input-code', selectedText: 'Found' });

    expect(getRangeValueConcatPartRangeTextSource(
      { type: 'input', inputColumnId: 'input-name' },
      inputColumns,
    )).toEqual({ type: 'rangeText', inputColumnId: 'input-code', selectedText: '' });

    expect(getRangeValueConcatPartRangeTextSource(
      { type: 'input', inputColumnId: 'input-name' },
      [],
    )).toEqual({ type: 'rangeText', inputColumnId: '', selectedText: '' });
  });
});
