import { describe, expect, it } from 'vitest';
import type { InputColumn } from '../../../types/import';
import {
  cellValuePickerActionLabels,
  numericOperationLabels,
  previousResultActionLabel,
  previousResultFieldLabel,
  previousResultSourceLabel,
  recipeStepActionLabels,
  recipeStepModeLabels,
  recipeStepTypeLabels,
} from '../OutputColumnRecipeEditor.actionDefinitions';
import { getRecipeStepTitle } from '../OutputColumnRecipeEditor.displayHelpers';
import {
  getStepModeOptions,
  getStepSourceDropdownOptions,
  getStepTextSourceActionOptions,
  getStepTypesForMode,
  numericOperationOptions,
} from '../OutputColumnRecipeEditor.optionHelpers';
import {
  getConversionStepActionOptions,
  getStepValueSourceOptions,
} from '../OutputColumnRecipeEditor.StepFields';
import {
  getRangeValueConcatPartSourceDropdownOptions,
  getRangeValueSourceDropdownOptions,
} from '../RangeValueEditor';

const inputColumns: InputColumn[] = [
  inputColumn('input-code', 'A', 'Codigo'),
  inputColumn('input-name', 'D', 'Nombre'),
];

describe('recipe editor action label contracts', () => {
  it('keeps step mode labels centralized without changing visible order', () => {
    expect(getStepModeOptions().map((option) => [option.value, option.label])).toEqual([
      ['text', recipeStepModeLabels.text],
      ['number', recipeStepModeLabels.number],
      ['conversion', recipeStepModeLabels.conversion],
      ['date', recipeStepModeLabels.date],
      ['manualRange', recipeStepModeLabels.manualRange],
    ]);
  });

  it('keeps text action labels centralized without changing visible order', () => {
    expect(getStepTypesForMode('text').map((option) => [option.value, option.label])).toEqual([
      ['noop', recipeStepTypeLabels.noop],
      ['trim', recipeStepTypeLabels.trim],
      ['uppercase', recipeStepTypeLabels.uppercase],
      ['lowercase', recipeStepTypeLabels.lowercase],
      ['addPrefix', recipeStepTypeLabels.addPrefix],
      ['addSuffix', recipeStepTypeLabels.addSuffix],
      ['removeText', recipeStepTypeLabels.removeText],
      ['replaceText', recipeStepTypeLabels.replaceText],
      ['concat', recipeStepTypeLabels.concat],
    ]);

    expect(getStepTextSourceActionOptions(true).map((option) => [option.value, option.label])).toEqual([
      ['useInputColumn', recipeStepActionLabels.useInputColumn],
      ['useFixedText', recipeStepActionLabels.useFixedText],
      ['pickColumnText', recipeStepActionLabels.pickColumnText],
      ['usePreviousResult', previousResultActionLabel],
    ]);
  });

  it('keeps number, date, and conversion labels centralized', () => {
    expect(numericOperationOptions).toEqual(Object.entries(numericOperationLabels).map(([value, label]) => ({ value, label })));
    expect(getStepTypesForMode('number').map((option) => [option.value, option.label])).toEqual([
      ['noop', recipeStepTypeLabels.noop],
      ['numericFormula', recipeStepTypeLabels.numericFormula],
      ['numericOperation', recipeStepTypeLabels.numericOperation],
    ]);
    expect(getStepTypesForMode('date').map((option) => [option.value, option.label])).toEqual([
      ['noop', recipeStepTypeLabels.noop],
      ['formatDate', recipeStepTypeLabels.formatDate],
    ]);
    expect(getConversionStepActionOptions().map((option) => [option.value, option.label])).toEqual([
      ['extractNumber', recipeStepActionLabels.extractNumber],
      ['toNumber', recipeStepActionLabels.toNumber],
      ['toText', recipeStepActionLabels.toText],
    ]);
  });

  it('keeps previous result copy consistent by context', () => {
    expect(getStepSourceDropdownOptions(inputColumns, true)[0]).toEqual({
      value: 'previousResult',
      label: previousResultSourceLabel,
    });
    expect(getStepValueSourceOptions(inputColumns, 'text', true, true)[0]).toEqual({
      value: 'previousResult',
      label: previousResultActionLabel,
    });
    expect(getRangeValueConcatPartSourceDropdownOptions(inputColumns)[0]).toEqual({
      value: 'previousResult',
      label: previousResultFieldLabel,
    });
    expect(getRecipeStepTitle({ id: 'step', mode: 'text', type: 'noop', source: { type: 'previousResult' } })).toBe(previousResultActionLabel);
  });

  it('keeps cell picker copy and source option order stable', () => {
    expect(cellValuePickerActionLabels).toEqual({
      text: 'Elegir texto desde celda',
      number: 'Elegir valor desde celda',
      date: 'Elegir fecha desde celda',
    });
    expect(getStepValueSourceOptions(inputColumns, 'number', false).map((option) => option.label)).toEqual([
      'A - Codigo',
      'D - Nombre',
      'Valor fijo',
      cellValuePickerActionLabels.number,
    ]);
    expect(getStepValueSourceOptions(inputColumns, 'date', false).map((option) => option.label)).toEqual([
      'A - Codigo',
      'D - Nombre',
      'Fecha fija',
      cellValuePickerActionLabels.date,
    ]);
    expect(getRangeValueSourceDropdownOptions(inputColumns).map((option) => option.label)).toEqual([
      recipeStepActionLabels.useRangeText,
      recipeStepActionLabels.pickColumnText,
      'A - Codigo',
      'D - Nombre',
    ]);
    expect(getRangeValueConcatPartSourceDropdownOptions(inputColumns).map((option) => option.label)).toEqual([
      previousResultFieldLabel,
      recipeStepActionLabels.pickColumnText,
      recipeStepActionLabels.useRangeText,
      'A - Codigo',
      'D - Nombre',
    ]);
  });

  it('does not reintroduce removed old conversion copy', () => {
    const allSharedLabels = [
      ...Object.values(recipeStepActionLabels),
      ...getConversionStepActionOptions().map((option) => option.label),
      getRecipeStepTitle({ id: 'step', type: 'extractNumber', source: { type: 'previousResult' } }),
    ];

    expect(allSharedLabels.join('\n')).not.toMatch(/Extraer número del resultado/i);
  });
});

function inputColumn(id: string, columnLetter: string, header: string): InputColumn {
  return {
    id,
    columnLetter,
    columnIndex: columnLetter === 'A' ? 0 : 3,
    header,
    label: header,
    sampleValues: [],
    nonEmptyCount: 0,
    active: true,
  };
}
