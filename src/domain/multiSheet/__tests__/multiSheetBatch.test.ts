import { describe, expect, it } from 'vitest';
import type { ProcessedExportResult } from '../../../types/processedExport';
import {
  createMultiSheetOutputSchema,
  validateProcessedResultAgainstMultiSheetSchema,
} from '../multiSheetBatch';

describe('createMultiSheetOutputSchema', () => {
  it('creates a schema from enabled columns ordered by order', () => {
    const input = result([
      column('name', 'Nombre', 5),
      column('ignored', 'Interno', 1, false),
      column('code', 'Código', 2),
    ]);

    expect(createMultiSheetOutputSchema(input)).toEqual({
      columns: [
        { index: 0, name: 'Código', normalizedName: 'codigo' },
        { index: 1, name: 'Nombre', normalizedName: 'nombre' },
      ],
    });
  });

  it('uses a positional fallback for empty labels', () => {
    const schema = createMultiSheetOutputSchema(result([
      column('empty', '   ', 0),
      column('also-empty', '', 1),
    ]));

    expect(schema.columns).toEqual([
      { index: 0, name: 'Columna 1', normalizedName: 'columna 1' },
      { index: 1, name: 'Columna 2', normalizedName: 'columna 2' },
    ]);
  });

  it('does not retain rows or output values', () => {
    const schema = createMultiSheetOutputSchema(result([
      column('code', 'Código', 0),
    ]));

    expect(JSON.stringify(schema)).not.toContain('rows');
    expect(JSON.stringify(schema)).not.toContain('outputValues');
    expect(JSON.stringify(schema)).not.toContain('SECRET');
  });
});

describe('validateProcessedResultAgainstMultiSheetSchema', () => {
  const schema = createMultiSheetOutputSchema(result([
    column('code', 'Código', 0),
    column('name', 'Nombre', 1),
  ]));

  it('accepts names equal after case, whitespace and diacritic normalization', () => {
    const validation = validateProcessedResultAgainstMultiSheetSchema(result([
      column('other-code', ' CÓDIGO ', 0),
      column('other-name', '  nombre  ', 1),
    ]), schema);

    expect(validation).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('rejects a different column count with a clear error', () => {
    const validation = validateProcessedResultAgainstMultiSheetSchema(result([
      column('code', 'Código', 0),
    ]), schema);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      'Cantidad de columnas distinta: se esperaban 2 y se encontraron 1.',
    );
  });

  it('rejects columns in a different order with positional errors', () => {
    const validation = validateProcessedResultAgainstMultiSheetSchema(result([
      column('name', 'Nombre', 0),
      column('code', 'Código', 1),
    ]), schema);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual([
      'Columna 1 distinta: se esperaba "Código" y se encontró "Nombre".',
      'Columna 2 distinta: se esperaba "Nombre" y se encontró "Código".',
    ]);
  });

  it('rejects a different name with a clear positional error', () => {
    const validation = validateProcessedResultAgainstMultiSheetSchema(result([
      column('code', 'Código', 0),
      column('product', 'Producto', 1),
    ]), schema);

    expect(validation.errors).toEqual([
      'Columna 2 distinta: se esperaba "Nombre" y se encontró "Producto".',
    ]);
  });

  it('does not treat aliases or abbreviations as matches', () => {
    const validation = validateProcessedResultAgainstMultiSheetSchema(result([
      column('code', 'Cod.', 0),
      column('name', 'Nombre', 1),
    ]), schema);

    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain('"Código"');
    expect(validation.errors[0]).toContain('"Cod."');
  });

  it('uses only enabled columns during validation', () => {
    const validation = validateProcessedResultAgainstMultiSheetSchema(result([
      column('disabled-extra', 'Extra', -1, false),
      column('code', 'codigo', 0),
      column('disabled-middle', 'Otra', 1, false),
      column('name', 'NOMBRE', 2),
    ]), schema);

    expect(validation).toEqual({ valid: true, errors: [], warnings: [] });
  });
});

function column(id: string, label: string, order: number, enabled = true) {
  return { id, label, order, enabled };
}

function result(columns: ProcessedExportResult['columns']): ProcessedExportResult {
  return {
    id: 'processed:1',
    fileBaseName: 'Libro',
    sheetName: 'Hoja 1',
    columns,
    rows: [
      {
        status: 'included',
        outputValues: { code: 'SECRET' },
      },
    ],
  };
}
