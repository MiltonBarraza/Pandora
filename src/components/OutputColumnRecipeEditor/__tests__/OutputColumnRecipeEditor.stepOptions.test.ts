import { describe, expect, it } from 'vitest';
import type { InputColumn, InputRow, TransformStep } from '../../../types/import';
import { createStepEditorContext } from '../OutputColumnRecipeEditor.stepPolicy';
import {
  getCompatibleStepValueInputColumns,
  getInputColumnOptions,
  getLegacyStepTypeSelectOptions,
  getRangeValueConcatPartSourceDropdownOptions,
  getRangeValueSourceDropdownOptions,
  getStepActionOptionsForContext,
  getStepModeOptionsForContext,
  getStepOperandTypeOptions,
  getStepSourceOptionsConfigForStep,
  getStepValueSourceOptions,
} from '../OutputColumnRecipeEditor.stepOptions';

const inputColumns: InputColumn[] = [
  { id: 'input-code', columnIndex: 0, columnLetter: 'A', label: 'A', active: true, sampleValues: ['A-1', 'A-2'], nonEmptyCount: 2 },
  { id: 'input-name', columnIndex: 3, columnLetter: 'D', label: 'D', header: 'Nombre', active: true, sampleValues: ['Pincel', 'Rodillo'], nonEmptyCount: 2 },
  { id: 'input-price', columnIndex: 39, columnLetter: 'AN', label: 'AN', header: 'Precio', active: true, sampleValues: ['10', '20'], nonEmptyCount: 2 },
  { id: 'input-date', columnIndex: 40, columnLetter: 'AO', label: 'AO', header: 'Fecha', active: true, sampleValues: ['10/01/2026'], nonEmptyCount: 1 },
];

const rangeRows: InputRow[] = [
  { rowNumber: 8, values: { 'input-code': 'ABC', 'input-name': 'Texto', 'input-price': '15', 'input-date': '11/01/2026' } },
  { rowNumber: 9, values: { 'input-code': 'DEF', 'input-name': 'Mas texto', 'input-price': '20', 'input-date': '12/01/2026' } },
];

describe('step options adapter', () => {
  it('keeps visible mode options by context', () => {
    expect(getStepModeOptionsForContext(createStepEditorContext({ kind: 'normal' })).map((option) => option.value)).toEqual([
      'text',
      'number',
      'conversion',
      'date',
      'manualRange',
    ]);
    expect(getStepModeOptionsForContext(createStepEditorContext({ kind: 'range' })).map((option) => option.value)).toEqual([
      'text',
      'number',
      'conversion',
      'date',
    ]);
  });

  it('keeps visible text actions by editor path and order', () => {
    expect(getStepActionOptionsForContext('text', createStepEditorContext({ kind: 'normal' }), 'unconfigured').map((option) => option.value)).toEqual([
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
    expect(getStepActionOptionsForContext('text', createStepEditorContext({ kind: 'normal', stepIndex: 1 }), 'unconfigured').map((option) => option.value)).toEqual([
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
    expect(getStepActionOptionsForContext('text', createStepEditorContext({ kind: 'concat' }), 'unconfigured').map((option) => option.value)).not.toContain('concat');
    expect(getStepActionOptionsForContext('text', createStepEditorContext({ kind: 'range' }), 'unconfigured').map((option) => option.value)).toEqual([
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
    expect(getStepActionOptionsForContext('text', createStepEditorContext({ kind: 'rangeConcat' }), 'unconfigured').map((option) => option.value)).toEqual([
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

  it('keeps number, date and conversion action order', () => {
    const numberOptions = getStepActionOptionsForContext('number', createStepEditorContext({ kind: 'normal' }), 'unconfigured');
    expect(numberOptions.map((option) => option.value)).toEqual([
      'useNumberInputColumn',
      'useFixedNumber',
      'pickNumberCell',
      'numericFormula',
      'add',
      'subtract',
      'multiply',
      'divide',
      'addPercentage',
      'subtractPercentage',
      'removeIncludedPercentage',
    ]);
    expect(numberOptions.find((option) => option.value === 'pickNumberCell')?.label).toBe('Elegir número desde celda');
    expect(getStepActionOptionsForContext('number', createStepEditorContext({ kind: 'normal', stepIndex: 1 }), 'unconfigured').map((option) => option.value)[0]).toBe('usePreviousResult');
    expect(getStepActionOptionsForContext('date', createStepEditorContext({ kind: 'normal' }), 'unconfigured').map((option) => option.value)).toEqual([
      'useDateInputColumn',
      'useFixedDate',
      'pickDateCell',
      'formatDate',
    ]);
    expect(getStepActionOptionsForContext('conversion', createStepEditorContext({ kind: 'normal' }), 'unconfigured').map((option) => option.value)).toEqual([
      'extractNumber',
      'toNumber',
      'toText',
    ]);
    expect(getStepActionOptionsForContext('conversion', createStepEditorContext({ kind: 'normal' }), 'unconfigured').map((option) => option.label)).not.toContain('Extraer numero del resultado...');
  });

  it('keeps current legacy actions visible when recipe contains them', () => {
    expect(getStepActionOptionsForContext('text', createStepEditorContext({ kind: 'rangeConcat' }), 'concat').map((option) => option.value)[0]).toBe('concat');
  });

  it('keeps source options and previous-result source policy', () => {
    const step: TransformStep = {
      id: 'upper',
      mode: 'text',
      type: 'uppercase',
      source: { type: 'input', inputColumnId: 'input-code' },
    };

    expect(getStepSourceOptionsConfigForStep(step, createStepEditorContext({ kind: 'normal', stepIndex: 1 }))).toEqual({
      allowedSources: ['previousResult', 'input'],
      fixedTextLabel: 'Texto fijo actual',
    });
    expect(getStepValueSourceOptions(inputColumns.slice(0, 2), 'text', true, false).map((option) => option.label)).toEqual([
      'Resultado del paso anterior',
      'Elegir texto desde celda',
      'A',
      'D - Nombre',
    ]);
    expect(getStepValueSourceOptions(inputColumns, 'number', false, false, {}, rangeRows).map((option) => option.value)).toEqual([
      'input:input-price',
      'fixedText',
      'columnTextPicker',
    ]);
  });

  it('keeps numeric operand and compatibility options stable', () => {
    expect(getStepOperandTypeOptions(true).map((option) => option.value)).toEqual([
      'previousResult',
      'input',
      'fixedText',
    ]);
    expect(getStepOperandTypeOptions(true, ['previousResult', 'fixedText']).map((option) => option.value)).toEqual([
      'previousResult',
      'fixedText',
    ]);
    expect(getCompatibleStepValueInputColumns(inputColumns, 'number', rangeRows).map((column) => column.id)).toEqual(['input-price']);
    expect(getCompatibleStepValueInputColumns(inputColumns, 'date', rangeRows).map((column) => column.id)).toEqual(['input-date']);
  });

  it('keeps legacy select options and range source options stable', () => {
    expect(getLegacyStepTypeSelectOptions({ mode: 'text', allowConcat: true, hasTextSourceAction: true }).map((option) => option.value)).toEqual([
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
    expect(getRangeValueSourceDropdownOptions(inputColumns).map((option) => option.label)).toEqual([
      'Texto encontrado en el rango',
      'Elegir texto desde celda',
      'A',
      'D - Nombre',
      'AN - Precio',
      'AO - Fecha',
    ]);
    expect(getRangeValueSourceDropdownOptions(inputColumns).map((option) => option.value)).toEqual([
      'rangeText',
      'columnTextPicker',
      'input:input-code',
      'input:input-name',
      'input:input-price',
      'input:input-date',
    ]);
    expect(getRangeValueSourceDropdownOptions(inputColumns).map((option) => option.label)).not.toContain('Texto fijo');
    expect(getRangeValueSourceDropdownOptions(inputColumns).map((option) => option.label)).not.toContain('Resultado anterior');
    expect(getRangeValueConcatPartSourceDropdownOptions(inputColumns).map((option) => option.label)).toEqual([
      'Resultado anterior',
      'Elegir texto desde celda',
      'Texto encontrado en el rango',
      'A',
      'D - Nombre',
      'AN - Precio',
      'AO - Fecha',
    ]);
    expect(getRangeValueConcatPartSourceDropdownOptions(inputColumns).map((option) => option.value)).toEqual([
      'previousResult',
      'columnTextPicker',
      'rangeText',
      'input:input-code',
      'input:input-name',
      'input:input-price',
      'input:input-date',
    ]);
    expect(getRangeValueConcatPartSourceDropdownOptions(inputColumns).map((option) => option.label)).not.toContain('Texto fijo');
  });

  it('keeps range text input-column option variants stable', () => {
    expect(getInputColumnOptions(inputColumns.slice(0, 2), 'Sin columnas activas', { includeBlankOption: true, blankLabel: 'Seleccionar' })).toEqual([
      { value: '', label: 'Seleccionar' },
      { value: 'input-code', label: 'A' },
      { value: 'input-name', label: 'D - Nombre' },
    ]);
    expect(getInputColumnOptions(inputColumns.slice(0, 2), 'Sin columnas activas')).toEqual([
      { value: 'input-code', label: 'A' },
      { value: 'input-name', label: 'D - Nombre' },
    ]);
    expect(getInputColumnOptions([], 'Sin columnas activas')).toEqual([
      { value: '', label: 'Sin columnas activas' },
    ]);
  });
});
