import { describe, expect, it } from 'vitest';
import type { InputColumn, InputNormalizationRule, RangeGroupInputNormalizationRule, RangeValueInputNormalizationRule, RawRow } from '../../../types/import';
import { applyFillDownRule, applyInputNormalizationRules, countFillDownCompletedCells, getFillDownRanges, getInputNormalizationRuleImpacts, getInputNormalizationRuleRanges } from '../inputNormalization';

const inputColumns: InputColumn[] = [
  inputColumn('input-0', 0, 'A'),
  inputColumn('input-1', 1, 'B'),
];

describe('inputNormalization', () => {
  it('fills empty cells with the last non-empty value above', () => {
    expect(applyFillDownRule([
      ['REMOVEDOR EN GEL'],
      [''],
      [undefined],
      ['AGUARRAS PREMIUM'],
      ['   '],
    ], 0)).toEqual([
      ['REMOVEDOR EN GEL'],
      ['REMOVEDOR EN GEL'],
      ['REMOVEDOR EN GEL'],
      ['AGUARRAS PREMIUM'],
      ['AGUARRAS PREMIUM'],
    ]);
  });

  it('does not fill before the first non-empty value', () => {
    expect(applyFillDownRule([
      [''],
      ['   '],
      ['REMOVEDOR EN GEL'],
      [''],
    ], 0)).toEqual([
      [''],
      ['   '],
      ['REMOVEDOR EN GEL'],
      ['REMOVEDOR EN GEL'],
    ]);
  });

  it('does not mutate the original rows', () => {
    const rows: RawRow[] = [
      ['Grupo', 'A'],
      ['', 'B'],
    ];

    const result = applyInputNormalizationRules(rows, [fillDownRule('input-0')], inputColumns);

    expect(result).toEqual([
      ['Grupo', 'A'],
      ['Grupo', 'B'],
    ]);
    expect(rows).toEqual([
      ['Grupo', 'A'],
      ['', 'B'],
    ]);
  });

  it('ignores disabled rules', () => {
    expect(applyInputNormalizationRules([
      ['Grupo'],
      [''],
    ], [fillDownRule('input-0', false)], inputColumns)).toEqual([
      ['Grupo'],
      [''],
    ]);
  });

  it('applies multiple rules to different columns', () => {
    expect(applyInputNormalizationRules([
      ['Grupo A', 'Comentario A', 'SKU-1'],
      ['', '', 'SKU-2'],
      ['Grupo B', '', 'SKU-3'],
    ], [
      fillDownRule('input-0'),
      fillDownRule('input-1'),
    ], inputColumns)).toEqual([
      ['Grupo A', 'Comentario A', 'SKU-1'],
      ['Grupo A', 'Comentario A', 'SKU-2'],
      ['Grupo B', 'Comentario A', 'SKU-3'],
    ]);
  });

  it('counts cells completed by fill-down rules', () => {
    expect(countFillDownCompletedCells([
      ['REMOVEDOR EN GEL'],
      [''],
      ['   '],
      ['AGUARRAS PREMIUM'],
      [''],
    ], 0)).toBe(3);
  });

  it('counts zero completed cells when there is no value above', () => {
    expect(countFillDownCompletedCells([
      [''],
      ['   '],
    ], 0)).toBe(0);
  });

  it('reports zero impact for disabled rules', () => {
    expect(getInputNormalizationRuleImpacts([
      ['Grupo'],
      [''],
    ], [fillDownRule('input-0', false)], inputColumns)).toEqual([
      {
        ruleId: 'fill-input-0',
        columnId: 'input-0',
        enabled: false,
        completedCellCount: 0,
      },
    ]);
  });

  it('counts multiple rules and respects the row after the header as the start point', () => {
    expect(getInputNormalizationRuleImpacts([
      ['Grupo', 'Comentario'],
      ['REMOVEDOR EN GEL', 'Rápida acción'],
      ['', ''],
      ['', ''],
    ], [
      fillDownRule('input-0'),
      fillDownRule('input-1'),
    ], inputColumns, 0)).toEqual([
      {
        ruleId: 'fill-input-0',
        columnId: 'input-0',
        enabled: true,
        completedCellCount: 2,
      },
      {
        ruleId: 'fill-input-1',
        columnId: 'input-1',
        enabled: true,
        completedCellCount: 2,
      },
    ]);
  });

  it('detects simple fill-down ranges', () => {
    expect(getFillDownRanges([
      ['REMOVEDOR EN GEL'],
      [''],
      [''],
      ['AGUARRAS PREMIUM'],
      [''],
      [''],
    ], 0)).toEqual([
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
    ]);
  });

  it('does not create a range before the first value and treats trimmed blanks as empty', () => {
    expect(getFillDownRanges([
      [''],
      ['   '],
      ['REMOVEDOR EN GEL'],
      ['   '],
    ], 0)).toEqual([
      {
        value: 'REMOVEDOR EN GEL',
        startRowNumber: 3,
        endRowNumber: 4,
        filledCount: 1,
        sourceRowNumber: 3,
      },
    ]);
  });

  it('starts a new range when a new non-empty value appears', () => {
    expect(getFillDownRanges([
      ['Grupo A'],
      [''],
      ['Grupo B'],
      [''],
    ], 0).map((range) => ({
      value: range.value,
      startRowNumber: range.startRowNumber,
      endRowNumber: range.endRowNumber,
    }))).toEqual([
      { value: 'Grupo A', startRowNumber: 1, endRowNumber: 2 },
      { value: 'Grupo B', startRowNumber: 3, endRowNumber: 4 },
    ]);
  });

  it('respects headerRowIndex when detecting ranges', () => {
    expect(getFillDownRanges([
      ['Producto'],
      ['REMOVEDOR EN GEL'],
      [''],
    ], 0, 0)).toEqual([
      {
        value: 'REMOVEDOR EN GEL',
        startRowNumber: 2,
        endRowNumber: 3,
        filledCount: 1,
        sourceRowNumber: 2,
      },
    ]);
  });

  it('uses original row numbers when provided', () => {
    expect(getFillDownRanges([
      ['REMOVEDOR EN GEL'],
      [''],
      ['AGUARRAS PREMIUM'],
      [''],
    ], 0, null, [12, 13, 16, 17])).toEqual([
      {
        value: 'REMOVEDOR EN GEL',
        startRowNumber: 12,
        endRowNumber: 13,
        filledCount: 1,
        sourceRowNumber: 12,
      },
      {
        value: 'AGUARRAS PREMIUM',
        startRowNumber: 16,
        endRowNumber: 17,
        filledCount: 1,
        sourceRowNumber: 16,
      },
    ]);
  });

  it('returns no ranges for disabled rules', () => {
    expect(getInputNormalizationRuleRanges([
      ['Grupo'],
      [''],
    ], [fillDownRule('input-0', false)], inputColumns)).toEqual([
      {
        ruleId: 'fill-input-0',
        columnId: 'input-0',
        enabled: false,
        ranges: [],
      },
    ]);
  });

  it('applies rangeGroup to product rows without letting comments cut the group', () => {
    const rule = rangeGroupRule();
    const rows: RawRow[] = [
      ['REMOVEDOR EN GEL', ''],
      ['', '9280033'],
      ['Rápida acción', '9280034'],
      ['AGUARRAS PREMIUM', ''],
      ['', '9400013'],
      ['Disolvente para sintéticos', '9400014'],
    ];

    expect(applyInputNormalizationRules(rows, [rule], inputColumns)).toEqual([
      ['', ''],
      ['REMOVEDOR EN GEL', '9280033'],
      ['REMOVEDOR EN GEL', '9280034'],
      ['', ''],
      ['AGUARRAS PREMIUM', '9400013'],
      ['AGUARRAS PREMIUM', '9400014'],
    ]);
    expect(rows[2][0]).toBe('Rápida acción');
  });

  it('does not apply rangeGroup before the first valid group', () => {
    expect(applyInputNormalizationRules([
      ['Rápida acción', '9280034'],
      ['REMOVEDOR EN GEL', ''],
      ['', '9280035'],
    ], [rangeGroupRule()], inputColumns)).toEqual([
      ['', '9280034'],
      ['', ''],
      ['REMOVEDOR EN GEL', '9280035'],
    ]);
  });

  it('does not apply disabled rangeGroup rules', () => {
    expect(applyInputNormalizationRules([
      ['REMOVEDOR EN GEL', ''],
      ['', '9280033'],
    ], [{ ...rangeGroupRule(), enabled: false }], inputColumns)).toEqual([
      ['REMOVEDOR EN GEL', ''],
      ['', '9280033'],
    ]);
  });

  it('respects isEmpty and isNotEmpty operators for rangeGroup', () => {
    const rule: RangeGroupInputNormalizationRule = {
      ...rangeGroupRule(),
      groupStartCondition: { columnId: 'input-1', operator: 'isNotEmpty' },
      applyToRowCondition: { columnId: 'input-1', operator: 'isEmpty' },
    };

    expect(applyInputNormalizationRules([
      ['Grupo con codigo', 'X'],
      ['', ''],
      ['No inicia', ''],
    ], [rule], inputColumns)).toEqual([
      ['', 'X'],
      ['Grupo con codigo', ''],
      ['Grupo con codigo', ''],
    ]);
  });

  it('uses trim empty checks for rangeGroup conditions', () => {
    expect(applyInputNormalizationRules([
      ['REMOVEDOR EN GEL', '   '],
      ['', '9280033'],
    ], [rangeGroupRule()], inputColumns)).toEqual([
      ['', '   '],
      ['REMOVEDOR EN GEL', '9280033'],
    ]);
  });

  it('applies multiple normalization rules in order', () => {
    expect(applyInputNormalizationRules([
      ['REMOVEDOR EN GEL', '', 'Comentario A'],
      ['', '9280033', ''],
    ], [
      rangeGroupRule(),
      fillDownRule('input-2'),
    ], [
      ...inputColumns,
      inputColumn('input-2', 2, 'C'),
    ])).toEqual([
      ['', '', 'Comentario A'],
      ['REMOVEDOR EN GEL', '9280033', 'Comentario A'],
    ]);
  });

  it('reports rangeGroup impacts and ranges', () => {
    const rule = rangeGroupRule();
    const rows: RawRow[] = [
      ['REMOVEDOR EN GEL', ''],
      ['', '9280033'],
      ['Rápida acción', '9280034'],
    ];

    expect(getInputNormalizationRuleImpacts(rows, [rule], inputColumns)).toEqual([
      {
        ruleId: 'range-group',
        columnId: 'input-0',
        enabled: true,
        completedCellCount: 2,
      },
    ]);
    expect(getInputNormalizationRuleRanges(rows, [rule], inputColumns)).toEqual([
      {
        ruleId: 'range-group',
        columnId: 'input-0',
        enabled: true,
        ranges: [
          {
            value: 'REMOVEDOR EN GEL',
            startRowNumber: 1,
            endRowNumber: 3,
            appliedCount: 2,
            sourceRowNumber: 1,
          },
        ],
      },
    ]);
  });

  it('captures rangeValue data for matching rows and carries it inside the range', () => {
    const columns = [...inputColumns, inputColumn('input-2', 2, 'C')];

    expect(applyInputNormalizationRules([
      ['REMOVEDOR EN GEL', '', ''],
      ['', '9280033', ''],
      ['Rápida acción', '9280034', ''],
      ['', '9280035', ''],
      ['AGUARRAS PREMIUM', '', ''],
      ['', '9400013', ''],
      ['Disolvente para sintéticos', '9400014', ''],
    ], [rangeValueRule()], columns)).toEqual([
      ['REMOVEDOR EN GEL', '', ''],
      ['', '9280033', ''],
      ['Rápida acción', '9280034', 'Rápida acción'],
      ['', '9280035', 'Rápida acción'],
      ['AGUARRAS PREMIUM', '', ''],
      ['', '9400013', ''],
      ['Disolvente para sintéticos', '9400014', 'Disolvente para sintéticos'],
    ]);
  });

  it('applies rangeValue data to all matching rows in the same range when configured', () => {
    const columns = [...inputColumns, inputColumn('input-2', 2, 'C')];

    expect(applyInputNormalizationRules([
      ['REMOVEDOR EN GEL', '', ''],
      ['', '9280033', ''],
      ['RÃ¡pida acciÃ³n', '9280034', ''],
      ['AGUARRAS PREMIUM', '', ''],
      ['', '9400013', ''],
      ['Disolvente para sintÃ©ticos', '9400014', ''],
    ], [rangeValueRule('input-2', 'allRowsInRange')], columns)).toEqual([
      ['REMOVEDOR EN GEL', '', ''],
      ['', '9280033', 'RÃ¡pida acciÃ³n'],
      ['RÃ¡pida acciÃ³n', '9280034', 'RÃ¡pida acciÃ³n'],
      ['AGUARRAS PREMIUM', '', ''],
      ['', '9400013', 'Disolvente para sintÃ©ticos'],
      ['Disolvente para sintÃ©ticos', '9400014', 'Disolvente para sintÃ©ticos'],
    ]);
  });

  it('reports rangeValue allRowsInRange impacts and ranges', () => {
    const columns = [...inputColumns, inputColumn('input-2', 2, 'C')];
    const rule = rangeValueRule('input-2', 'allRowsInRange');

    expect(getInputNormalizationRuleImpacts([
      ['REMOVEDOR EN GEL', '', ''],
      ['', '9280033', ''],
      ['RÃ¡pida acciÃ³n', '9280034', ''],
    ], [rule], columns)).toEqual([
      {
        ruleId: 'range-value',
        columnId: 'input-2',
        enabled: true,
        completedCellCount: 2,
      },
    ]);
    expect(getInputNormalizationRuleRanges([
      ['REMOVEDOR EN GEL', '', ''],
      ['', '9280033', ''],
      ['RÃ¡pida acciÃ³n', '9280034', ''],
    ], [rule], columns)).toEqual([
      {
        ruleId: 'range-value',
        columnId: 'input-2',
        enabled: true,
        ranges: [
          {
            value: 'RÃ¡pida acciÃ³n',
            startRowNumber: 2,
            endRowNumber: 3,
            appliedCount: 2,
            sourceRowNumber: 3,
          },
        ],
      },
    ]);
  });

  it('does not let rangeValue leak across non-matching rows with values', () => {
    const columns = [...inputColumns, inputColumn('input-2', 2, 'C')];

    expect(applyInputNormalizationRules([
      ['Rápida acción', '9280034', ''],
      ['', '9280035', ''],
      ['AGUARRAS PREMIUM', '', ''],
      ['', '9400013', ''],
    ], [rangeValueRule()], columns)).toEqual([
      ['Rápida acción', '9280034', 'Rápida acción'],
      ['', '9280035', 'Rápida acción'],
      ['AGUARRAS PREMIUM', '', ''],
      ['', '9400013', ''],
    ]);
  });

  it('ignores disabled rangeValue rules', () => {
    const columns = [...inputColumns, inputColumn('input-2', 2, 'C')];

    expect(applyInputNormalizationRules([
      ['Rápida acción', '9280034', ''],
    ], [{ ...rangeValueRule(), enabled: false }], columns)).toEqual([
      ['Rápida acción', '9280034', ''],
    ]);
  });

  it('reports rangeValue impacts and ranges', () => {
    const columns = [...inputColumns, inputColumn('input-2', 2, 'C')];
    const rule = rangeValueRule();

    expect(getInputNormalizationRuleImpacts([
      ['Rápida acción', '9280034', ''],
      ['', '9280035', ''],
    ], [rule], columns)).toEqual([
      {
        ruleId: 'range-value',
        columnId: 'input-2',
        enabled: true,
        completedCellCount: 2,
      },
    ]);
    expect(getInputNormalizationRuleRanges([
      ['Rápida acción', '9280034', ''],
      ['', '9280035', ''],
    ], [rule], columns)).toEqual([
      {
        ruleId: 'range-value',
        columnId: 'input-2',
        enabled: true,
        ranges: [
          {
            value: 'Rápida acción',
            startRowNumber: 1,
            endRowNumber: 2,
            appliedCount: 2,
            sourceRowNumber: 1,
          },
        ],
      },
    ]);
  });

  it('keeps rangeGroup and rangeValue independent from rule order', () => {
    const columns = [...inputColumns, inputColumn('input-14', 14, 'O')];
    const rows: RawRow[] = [
      ['REMOVEDOR EN GEL', ''],
      ['', '9280033'],
      ['Rápida acción', '9280034'],
      ['AGUARRAS PREMIUM', ''],
      ['', '9400013'],
      ['Disolvente para sintéticos', '9400014'],
    ];
    const groupRule = rangeGroupRule();
    const valueRule = rangeValueRule('input-14');

    const groupThenValue = applyInputNormalizationRules(rows, [groupRule, valueRule], columns);
    const valueThenGroup = applyInputNormalizationRules(rows, [valueRule, groupRule], columns);
    const expected = [
      { group: '', code: '', extra: '' },
      { group: 'REMOVEDOR EN GEL', code: '9280033', extra: '' },
      { group: 'REMOVEDOR EN GEL', code: '9280034', extra: 'Rápida acción' },
      { group: '', code: '', extra: '' },
      { group: 'AGUARRAS PREMIUM', code: '9400013', extra: '' },
      { group: 'AGUARRAS PREMIUM', code: '9400014', extra: 'Disolvente para sintéticos' },
    ];

    expect(summarizeRows(groupThenValue)).toEqual(expected);
    expect(summarizeRows(valueThenGroup)).toEqual(expected);
    expect(rows[2][0]).toBe('Rápida acción');
  });
});

function fillDownRule(columnId: string, enabled = true): InputNormalizationRule {
  return {
    id: `fill-${columnId}`,
    type: 'fillDown',
    columnId,
    enabled,
  };
}

function inputColumn(id: string, columnIndex: number, columnLetter: string): InputColumn {
  return {
    id,
    columnIndex,
    columnLetter,
    label: columnLetter,
    active: true,
    sampleValues: [],
    nonEmptyCount: 0,
  };
}

function rangeGroupRule(): RangeGroupInputNormalizationRule {
  return {
    id: 'range-group',
    type: 'rangeGroup',
    enabled: true,
    groupColumnId: 'input-0',
    groupStartCondition: { columnId: 'input-1', operator: 'isEmpty' },
    applyToRowCondition: { columnId: 'input-1', operator: 'isNotEmpty' },
    targetColumnId: 'input-0',
  };
}

function rangeValueRule(targetColumnId = 'input-2', applyMode: RangeValueInputNormalizationRule['applyMode'] = 'matchingRowsOnly'): RangeValueInputNormalizationRule {
  return {
    id: 'range-value',
    type: 'rangeValue',
    enabled: true,
    valueColumnId: 'input-0',
    captureCondition: { columnId: 'input-1', operator: 'isNotEmpty' },
    applyMode,
    targetColumnId,
  };
}

function summarizeRows(rows: RawRow[]) {
  return rows.map((row) => ({
    group: String(row[0] ?? ''),
    code: String(row[1] ?? ''),
    extra: String(row[14] ?? ''),
  }));
}
