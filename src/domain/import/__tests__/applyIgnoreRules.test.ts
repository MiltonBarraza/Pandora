import { describe, expect, it } from 'vitest';
import type { IgnoreRule, InputColumn, OutputColumn, ProcessedRow } from '../../../types/import';
import { applyIgnoreRulesToProcessedRows } from '../applyIgnoreRules';

const inputColumns: InputColumn[] = [
  {
    id: 'input-code',
    columnIndex: 0,
    columnLetter: 'A',
    label: 'Codigo original',
    active: true,
    sampleValues: [],
    nonEmptyCount: 2,
  },
  {
    id: 'input-note',
    columnIndex: 1,
    columnLetter: 'B',
    label: 'Observacion',
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
    expect(result[0].ignoredReason).toBe('Ignorada por regla: Codigo original esta vacia');
    expect(result[1].status).toBe('ignored');
    expect(result[1].ignoredReason).toBe('Ignorada por regla: Codigo esta vacia');
  });

  it('ignores rows by contains and startsWith and preserves custom reason', () => {
    const result = applyIgnoreRulesToProcessedRows({
      rows,
      ignoreRules: [
        { id: 'contains', target: 'output', columnId: 'status', operator: 'contains', value: 'DISCONTINUADO', reason: 'No exportar discontinuados' },
        { id: 'starts', target: 'input', columnId: 'input-code', operator: 'startsWith', value: 'KG' },
      ],
      rowOverrides: {},
      inputColumns,
      outputColumns,
    });

    expect(result[0].status).toBe('included');
    expect(result[1].status).toBe('ignored');
    expect(result[1].ignoredReason).toBe('No exportar discontinuados');
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
