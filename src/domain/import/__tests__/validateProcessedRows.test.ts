import { describe, expect, it } from 'vitest';
import type { OutputColumn, ProcessedRow } from '../../../types/import';
import { validateProcessedRows } from '../validateProcessedRows';

const outputColumns: OutputColumn[] = [
  { id: 'code', label: 'Codigo', order: 0, enabled: true, recipe: { type: 'empty' } },
  { id: 'name', label: 'Nombre', order: 1, enabled: true, recipe: { type: 'empty' } },
];

function row(partial: Partial<ProcessedRow>): ProcessedRow {
  return {
    rowNumber: partial.rowNumber ?? 1,
    inputValues: partial.inputValues ?? {},
    outputValues: partial.outputValues ?? {},
    status: partial.status ?? 'included',
    ignoredReason: partial.ignoredReason,
    warnings: partial.warnings,
    error: partial.error,
  };
}

describe('validateProcessedRows', () => {
  it('ignores rows without useful output values', () => {
    const [result] = validateProcessedRows([
      row({ outputValues: { code: '', name: '' } }),
    ], outputColumns);

    expect(result.status).toBe('ignored');
    expect(result.ignoredReason).toBe('Fila sin valores de salida');
  });

  it('does not overwrite previous errors or ignored rows', () => {
    const result = validateProcessedRows([
      row({ rowNumber: 1, outputValues: { code: '', name: '' }, status: 'error', error: 'Error previo' }),
      row({ rowNumber: 2, outputValues: { code: '', name: '' }, status: 'ignored', ignoredReason: 'Ignorada manualmente' }),
    ], outputColumns);

    expect(result[0].status).toBe('error');
    expect(result[0].error).toBe('Error previo');
    expect(result[1].status).toBe('ignored');
    expect(result[1].ignoredReason).toBe('Ignorada manualmente');
  });

  it('preserves warnings and can add partial empty warnings when enabled', () => {
    const [result] = validateProcessedRows([
      row({ outputValues: { code: 'A1', name: '' }, warnings: ['Warning previo'] }),
    ], outputColumns, { warnPartialEmptyRows: true });

    expect(result.status).toBe('included');
    expect(result.warnings).toEqual(['Warning previo', 'Algunas columnas de salida estan vacias']);
  });
});
