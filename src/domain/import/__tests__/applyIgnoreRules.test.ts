import { describe, expect, it } from 'vitest';
import type { IgnoreRule, InputColumn, OutputColumn, ProcessedRow } from '../../../types/import';
import { applyIgnoreRulesToProcessedRows, applyOutputIgnoreRulesToProcessedRows, applyRowOverridesToProcessedRows, evaluateIgnoreRule, isIgnoreRuleComplete } from '../applyIgnoreRules';

const inputColumns: InputColumn[] = [
  {
    id: 'input-code',
    columnIndex: 0,
    columnLetter: 'A',
    label: 'Codigo original',
    header: 'Codigo original',
    active: true,
    sampleValues: [],
    nonEmptyCount: 2,
  },
  {
    id: 'input-note',
    columnIndex: 1,
    columnLetter: 'B',
    label: 'Observacion',
    header: 'Observacion',
    active: true,
    sampleValues: [],
    nonEmptyCount: 2,
  },
];

const outputColumns: OutputColumn[] = [
  { id: 'code', label: 'Codigo', order: 0, enabled: true, recipe: { type: 'empty' } },
  { id: 'status', label: 'Estado', order: 1, enabled: true, recipe: { type: 'empty' } },
];

const rows: ProcessedRow[] = [
  {
    rowNumber: 1,
    inputValues: { 'input-code': '', 'input-note': 'OK' },
    outputValues: { code: 'A1', status: 'ACTIVO' },
    status: 'included',
  },
  {
    rowNumber: 2,
    inputValues: { 'input-code': 'KG123', 'input-note': 'SIN STOCK' },
    outputValues: { code: '', status: 'DISCONTINUADO' },
    status: 'included',
  },
];

describe('applyIgnoreRulesToProcessedRows', () => {
  it('does not match incomplete ignore rules', () => {
    const values = { code: 'ABC', empty: '' };
    const incompleteRules: IgnoreRule[] = [
      { id: 'missing-column', target: 'input', columnId: '', operator: 'contains', value: 'ABC' },
      { id: 'missing-operator', target: 'input', columnId: 'code', operator: '', value: 'ABC' },
      { id: 'missing-value', target: 'input', columnId: 'code', operator: 'contains', value: '' },
    ];

    incompleteRules.forEach((rule) => {
      expect(isIgnoreRuleComplete(rule)).toBe(false);
      expect(evaluateIgnoreRule(values, rule)).toBe(false);
    });
  });

  it('allows value-less ignore operators once column and operator are selected', () => {
    const rule: IgnoreRule = { id: 'empty-input', target: 'input', columnId: 'empty', operator: 'isEmpty' };

    expect(isIgnoreRuleComplete(rule)).toBe(true);
    expect(evaluateIgnoreRule({ empty: '' }, rule)).toBe(true);
  });

  it('ignores rows evaluating input and output columns', () => {
    const rules: IgnoreRule[] = [
      { id: 'empty-input', target: 'input', columnId: 'input-code', operator: 'isEmpty' },
      { id: 'empty-output', target: 'output', columnId: 'code', operator: 'isEmpty' },
    ];

    const result = applyIgnoreRulesToProcessedRows({
      rows,
      ignoreRules: rules,
      rowOverrides: {},
      inputColumns,
      outputColumns,
    });

    expect(result[0].status).toBe('ignored');
    expect(result[0].ignoredReason).toBe('Ignorada por regla: A - Codigo original esta vacia');
    expect(result[1].status).toBe('ignored');
    expect(result[1].ignoredReason).toBe('Ignorada por regla: Codigo esta vacia');
  });

  it('applies output rules over transformed output values', () => {
    const result = applyOutputIgnoreRulesToProcessedRows({
      rows: [
        {
          rowNumber: 3,
          inputValues: { 'input-code': 'abc' },
          outputValues: { code: 'ABC' },
          status: 'included',
        },
      ],
      outputIgnoreRules: [{ id: 'uppercase-code', target: 'output', columnId: 'code', operator: 'equals', value: 'ABC' }],
      outputColumns,
    });

    expect(result[0].status).toBe('ignored');
    expect(result[0].ignoredReason).toBe('Ignorada por regla: Codigo es igual a "ABC"');
  });

  it('keeps manual overrides after output rules', () => {
    const filtered = applyOutputIgnoreRulesToProcessedRows({
      rows: [
        {
          rowNumber: 4,
          inputValues: { 'input-code': 'abc' },
          outputValues: { code: '' },
          status: 'included',
        },
      ],
      outputIgnoreRules: [{ id: 'empty-code', target: 'output', columnId: 'code', operator: 'isEmpty' }],
      outputColumns,
    });

    const result = applyRowOverridesToProcessedRows(filtered, {
      4: { status: 'included', reason: 'Incluida manualmente' },
    });

    expect(result[0].status).toBe('included');
    expect(result[0].ignoredReason).toBeUndefined();
  });

  it('ignores rows by contains and startsWith and describes the matched rule', () => {
    const result = applyIgnoreRulesToProcessedRows({
      rows,
      ignoreRules: [
        { id: 'contains', target: 'output', columnId: 'status', operator: 'contains', value: 'DISCONTINUADO' },
        { id: 'starts', target: 'input', columnId: 'input-code', operator: 'startsWith', value: 'KG' },
      ],
      rowOverrides: {},
      inputColumns,
      outputColumns,
    });

    expect(result[0].status).toBe('included');
    expect(result[1].status).toBe('ignored');
    expect(result[1].ignoredReason).toBe('Ignorada por regla: Estado contiene "DISCONTINUADO"');
  });

  it('manual overrides can include or ignore rows', () => {
    const result = applyIgnoreRulesToProcessedRows({
      rows,
      ignoreRules: [{ id: 'empty-output', target: 'output', columnId: 'code', operator: 'isEmpty' }],
      rowOverrides: {
        1: { status: 'ignored', reason: 'Ignorada manualmente' },
        2: { status: 'included' },
      },
      inputColumns,
      outputColumns,
    });

    expect(result[0].status).toBe('ignored');
    expect(result[0].ignoredReason).toBe('Ignorada manualmente');
    expect(result[1].status).toBe('included');
  });
});
