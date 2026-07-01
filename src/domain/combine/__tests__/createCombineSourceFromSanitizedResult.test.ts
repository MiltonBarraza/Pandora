import { describe, expect, it } from 'vitest';
import type { ProcessedExportResult } from '../../../types/processedExport';
import { createCombineSourceFromSanitizedResult } from '../createCombineSourceFromSanitizedResult';

describe('createCombineSourceFromSanitizedResult', () => {
  it('converts enabled columns to independently identified source columns', () => {
    const source = createCombineSourceFromSanitizedResult(result());

    expect(source.columns).toEqual([
      { id: 'col:0', name: 'Código', index: 0 },
      { id: 'col:1', name: 'Nombre', index: 1 },
    ]);
  });

  it('respects output column order', () => {
    const input = result();
    input.columns = [
      { id: 'name', label: 'Nombre', order: 8, enabled: true },
      { id: 'code', label: 'Código', order: 2, enabled: true },
    ];

    expect(createCombineSourceFromSanitizedResult(input).columns.map((column) => column.name)).toEqual([
      'Código',
      'Nombre',
    ]);
  });

  it('excludes disabled columns and their values', () => {
    const source = createCombineSourceFromSanitizedResult(result());

    expect(source.columns.some((column) => column.name === 'Interno')).toBe(false);
    expect(source.rows[0].values).toEqual({ 'col:0': 'A1', 'col:1': 'Producto A' });
  });

  it('uses included rows', () => {
    const source = createCombineSourceFromSanitizedResult(result());

    expect(source.rows).toContainEqual({
      id: 'row:0',
      values: { 'col:0': 'A1', 'col:1': 'Producto A' },
    });
  });

  it('ignores excluded rows', () => {
    const source = createCombineSourceFromSanitizedResult(result());

    expect(source.rows).toHaveLength(1);
    expect(JSON.stringify(source.rows)).not.toContain('EXCLUDED');
  });

  it('uses an empty string when an output value is missing', () => {
    const input = result();
    delete input.rows[0].outputValues.name;

    expect(createCombineSourceFromSanitizedResult(input).rows[0].values).toEqual({
      'col:0': 'A1',
      'col:1': '',
    });
  });

  it('uses a positional fallback for empty column labels', () => {
    const input = result();
    input.columns[0].label = '   ';

    expect(createCombineSourceFromSanitizedResult(input).columns[0].name).toBe('Columna 1');
  });

  it('adds one xlsx extension without duplicating it', () => {
    expect(createCombineSourceFromSanitizedResult(result('salida')).fileName).toBe('salida.xlsx');
    expect(createCombineSourceFromSanitizedResult(result('salida.xlsx')).fileName).toBe('salida.xlsx');
    expect(createCombineSourceFromSanitizedResult(result('salida.xlsx.xlsx')).fileName).toBe('salida.xlsx');
  });

  it('preserves source id and sheet name', () => {
    const source = createCombineSourceFromSanitizedResult(result());

    expect(source.id).toBe('basket:1');
    expect(source.sheetName).toBe('Productos');
  });

  it('does not mutate or retain mutable references from input', () => {
    const input = result();
    const before = structuredClone(input);
    const source = createCombineSourceFromSanitizedResult(input);

    source.columns[0].name = 'Modificado';
    source.rows[0].values['col:0'] = 'OTRO';

    expect(input).toEqual(before);
  });
});

function result(fileBaseName = 'Archivo sanitizado'): ProcessedExportResult {
  return {
    id: 'basket:1',
    fileBaseName,
    sheetName: 'Productos',
    columns: [
      { id: 'code', label: 'Código', order: 0, enabled: true },
      { id: 'name', label: 'Nombre', order: 1, enabled: true },
      { id: 'internal', label: 'Interno', order: 2, enabled: false },
    ],
    rows: [
      {
        id: 'included-row',
        status: 'included',
        outputValues: { code: 'A1', name: 'Producto A', internal: 'X' },
      },
      {
        id: 'excluded-row',
        status: 'excluded',
        outputValues: { code: 'EXCLUDED', name: 'No guardar', internal: 'Y' },
      },
    ],
  };
}
