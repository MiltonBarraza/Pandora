import { describe, expect, it } from 'vitest';
import type { InputColumn, InputNormalizationRule } from '../../../types/import';
import {
  createFillDownNormalizationRule,
  createRangeGroupNormalizationRule,
  createRangeValueNormalizationRule,
  getInputNormalizationRangeText,
  getInputNormalizationRangesCountText,
  getInputNormalizationRuleSummary,
  getVisibleInputNormalizationRanges,
  inputNormalizationEmptyMessage,
  inputNormalizationRuleHelpText,
  inputNormalizationRuleTypeOptions,
  inputNormalizationSectionTitle,
} from '../InputNormalizationRules';

describe('InputNormalizationRules copy and helpers', () => {
  it('uses range/group oriented copy', () => {
    expect(inputNormalizationSectionTitle).toBe('Completar datos por rangos');
    expect(inputNormalizationEmptyMessage).toBe('No hay reglas de rangos configuradas.');
    expect(inputNormalizationRuleTypeOptions).toContainEqual({
      value: 'fillDown',
      label: 'Completar vacíos con el valor superior',
    });
    expect(inputNormalizationRuleTypeOptions).toContainEqual({
      value: 'rangeGroup',
      label: 'Usar títulos de grupo',
    });
    expect(inputNormalizationRuleTypeOptions).toContainEqual({
      value: 'rangeValue',
      label: 'Capturar dato del rango',
    });
    expect(inputNormalizationRuleHelpText.fillDown).toBe(
      'Usala cuando una columna tiene un valor arriba y celdas vacías debajo que pertenecen a ese mismo valor.',
    );
    expect(inputNormalizationRuleHelpText.rangeGroup).toBe(
      'Usala cuando una columna contiene títulos de grupo, pero también puede tener otros textos que no deberían iniciar un nuevo grupo.',
    );
    expect(inputNormalizationRuleHelpText.rangeValue).toBe(
      'Usala para tomar un dato adicional que aparece dentro de una fila del rango y guardarlo en otra columna.',
    );
  });

  it('keeps fillDown as the internal rule type when creating a rule', () => {
    expect(createFillDownNormalizationRule('rule-1')).toEqual({
      id: 'rule-1',
      type: 'fillDown',
      columnId: '',
      enabled: true,
    });
  });

  it('creates rangeGroup rules with manual conditions', () => {
    expect(createRangeGroupNormalizationRule('rule-2')).toEqual({
      id: 'rule-2',
      type: 'rangeGroup',
      enabled: true,
      groupColumnId: '',
      groupStartCondition: {
        columnId: '',
        operator: 'isEmpty',
      },
      applyToRowCondition: {
        columnId: '',
        operator: 'isNotEmpty',
      },
      targetColumnId: '',
    });
  });

  it('creates rangeValue rules with a manual capture condition', () => {
    expect(createRangeValueNormalizationRule('rule-3')).toEqual({
      id: 'rule-3',
      type: 'rangeValue',
      enabled: true,
      valueColumnId: '',
      captureCondition: {
        columnId: '',
        operator: 'isNotEmpty',
      },
      applyMode: 'matchingRowsOnly',
      targetColumnId: '',
    });
  });

  it('builds a concise active rule summary using the selected column letter', () => {
    const rule: InputNormalizationRule = {
      id: 'rule-1',
      type: 'fillDown',
      columnId: 'input-0',
      enabled: true,
    };

    expect(getInputNormalizationRuleSummary(rule, [inputColumn('input-0', 'A')], 4)).toBe(
      'Columna A: se completaron 4 celdas usando el valor superior.',
    );
  });

  it('builds a no-impact summary when no cells are completed', () => {
    expect(getInputNormalizationRuleSummary({
      id: 'rule-1',
      type: 'fillDown',
      columnId: 'input-0',
      enabled: true,
    }, [inputColumn('input-0', 'A')], 0)).toBe(
      'Columna A: no se completaron celdas.',
    );
  });

  it('builds a disabled summary when the rule is off', () => {
    expect(getInputNormalizationRuleSummary({
      id: 'rule-1',
      type: 'fillDown',
      columnId: 'input-0',
      enabled: false,
    }, [inputColumn('input-0', 'A')], 4)).toBe(
      'Columna A: regla deshabilitada.',
    );
  });

  it('builds a rangeGroup impact summary', () => {
    expect(getInputNormalizationRuleSummary({
      id: 'rule-1',
      type: 'rangeGroup',
      enabled: true,
      groupColumnId: 'input-0',
      groupStartCondition: { columnId: 'input-1', operator: 'isEmpty' },
      applyToRowCondition: { columnId: 'input-1', operator: 'isNotEmpty' },
      targetColumnId: 'input-0',
    }, [inputColumn('input-0', 'A'), inputColumn('input-1', 'B')], 18)).toBe(
      'Columna A: se aplicaron grupos a 18 filas.',
    );
  });

  it('builds rangeValue impact summaries', () => {
    const rule: InputNormalizationRule = {
      id: 'rule-1',
      type: 'rangeValue',
      enabled: true,
      valueColumnId: 'input-0',
      captureCondition: { columnId: 'input-1', operator: 'isNotEmpty' },
      targetColumnId: 'input-2',
    };

    expect(getInputNormalizationRuleSummary(rule, [
      inputColumn('input-0', 'A'),
      inputColumn('input-1', 'B'),
      inputColumn('input-2', 'C'),
    ], 3)).toBe('Columna C: se capturaron datos para 3 filas.');
    expect(getInputNormalizationRuleSummary(rule, [inputColumn('input-2', 'C')], 0)).toBe(
      'No se capturaron datos con esta configuración.',
    );
  });

  it('builds range count and row span text', () => {
    const ranges = [
      {
        value: 'REMOVEDOR EN GEL',
        startRowNumber: 1,
        endRowNumber: 3,
        filledCount: 2,
        sourceRowNumber: 1,
      },
      {
        value: 'AGUARRAS PREMIUM',
        startRowNumber: 4,
        endRowNumber: 6,
        filledCount: 2,
        sourceRowNumber: 4,
      },
    ];

    expect(getInputNormalizationRangesCountText(ranges)).toBe('Rangos encontrados: 2');
    expect(getInputNormalizationRangeText(ranges[0])).toBe('REMOVEDOR EN GEL: filas 1 a 3');
    expect(getInputNormalizationRangeText(ranges[1])).toBe('AGUARRAS PREMIUM: filas 4 a 6');
  });

  it('builds rangeGroup row text using applied product count', () => {
    expect(getInputNormalizationRangeText({
      value: 'REMOVEDOR EN GEL',
      startRowNumber: 12,
      endRowNumber: 14,
      appliedCount: 2,
      sourceRowNumber: 12,
    })).toBe('REMOVEDOR EN GEL: aplicado a 2 filas producto');
  });

  it('uses singular row text for one-row ranges', () => {
    expect(getInputNormalizationRangeText({
      value: 'REMOVEDOR EN GEL',
      startRowNumber: 1,
      endRowNumber: 1,
      filledCount: 0,
      sourceRowNumber: 1,
    })).toBe('REMOVEDOR EN GEL: fila 1');
  });

  it('limits visible ranges and reports hidden count', () => {
    const ranges = Array.from({ length: 7 }, (_, index) => ({
      value: `Grupo ${index + 1}`,
      startRowNumber: index + 1,
      endRowNumber: index + 1,
      filledCount: 0,
      sourceRowNumber: index + 1,
    }));

    expect(getVisibleInputNormalizationRanges(ranges)).toMatchObject({
      visibleRanges: ranges.slice(0, 5),
      hiddenCount: 2,
    });
  });
});

function inputColumn(id: string, columnLetter: string): InputColumn {
  return {
    id,
    columnIndex: 0,
    columnLetter,
    label: columnLetter,
    active: true,
    sampleValues: [],
    nonEmptyCount: 0,
  };
}
