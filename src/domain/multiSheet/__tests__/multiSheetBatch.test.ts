import { describe, expect, it } from 'vitest';
import type { ProcessedExportResult } from '../../../types/processedExport';
import {
  addProcessedResultToMultiSheetBatch,
  createCombinePayloadFromMultiSheetBatch,
  createEmptyMultiSheetBatch,
  createMultiSheetOutputSchema,
  removeSheetFromMultiSheetBatch,
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

describe('multi-sheet batch management', () => {
  it('creates an empty batch', () => {
    expect(createEmptyMultiSheetBatch('batch:1', 'Libro')).toEqual({
      id: 'batch:1',
      fileName: 'Libro',
      outputSchema: null,
      sheets: [],
    });
  });

  it('uses the first sheet to define the schema', () => {
    const batch = createEmptyMultiSheetBatch('batch:1');
    const added = addProcessedResultToMultiSheetBatch(batch, standardResult('sheet:1', 'Hoja 1'));

    expect(added.ok).toBe(true);
    expect(added.batch.outputSchema?.columns.map((item) => item.name)).toEqual(['Código', 'Nombre']);
    expect(added.batch.sheets).toHaveLength(1);
    expect(added.batch.sheets[0]).toMatchObject({
      id: 'sheet:1',
      sheetName: 'Hoja 1',
      rowCount: 1,
      status: 'configured',
    });
    expect(batch).toEqual(createEmptyMultiSheetBatch('batch:1'));
  });

  it('adds a compatible normalized sheet without mutating inputs', () => {
    const first = addProcessedResultToMultiSheetBatch(
      createEmptyMultiSheetBatch('batch:1'),
      standardResult('sheet:1', 'Hoja 1'),
    ).batch;
    const secondResult = result([
      column('other-code', ' CÓDIGO ', 0),
      column('other-name', '  nombre ', 1),
    ], 'sheet:2', 'Hoja 2');
    const batchBefore = structuredClone(first);
    const resultBefore = structuredClone(secondResult);

    const added = addProcessedResultToMultiSheetBatch(first, secondResult);

    expect(added.ok).toBe(true);
    expect(added.batch.sheets.map((sheet) => sheet.id)).toEqual(['sheet:1', 'sheet:2']);
    expect(first).toEqual(batchBefore);
    expect(secondResult).toEqual(resultBefore);
  });

  it.each([
    {
      name: 'different count',
      columns: [column('code', 'Código', 0)],
      error: 'Cantidad de columnas distinta',
    },
    {
      name: 'different order',
      columns: [column('name', 'Nombre', 0), column('code', 'Código', 1)],
      error: 'Columna 1 distinta',
    },
    {
      name: 'different name',
      columns: [column('code', 'Código', 0), column('product', 'Producto', 1)],
      error: 'Columna 2 distinta',
    },
  ])('rejects a sheet with $name and keeps the original batch', ({ columns, error }) => {
    const batch = addProcessedResultToMultiSheetBatch(
      createEmptyMultiSheetBatch('batch:1'),
      standardResult('sheet:1', 'Hoja 1'),
    ).batch;

    const rejected = addProcessedResultToMultiSheetBatch(
      batch,
      result(columns, 'sheet:2', 'Hoja 2'),
    );

    expect(rejected.ok).toBe(false);
    expect(rejected.errors.some((item) => item.includes(error))).toBe(true);
    expect(rejected.batch).toBe(batch);
    expect(rejected.batch.sheets).toHaveLength(1);
  });

  it('resolves duplicate sheet and source ids', () => {
    const first = addProcessedResultToMultiSheetBatch(
      createEmptyMultiSheetBatch('batch:1'),
      standardResult('sheet:1', 'Hoja 1'),
    ).batch;

    const second = addProcessedResultToMultiSheetBatch(
      first,
      standardResult('sheet:1', 'Hoja 2'),
    ).batch;

    expect(second.sheets.map((sheet) => sheet.id)).toEqual(['sheet:1', 'sheet:1:2']);
    expect(second.sheets[1].source.id).toBe('sheet:1:2');
  });

  it('uses the first source file name and rejects a different source file', () => {
    const firstResult = standardResult('sheet:1', 'Hoja 1');
    firstResult.sourceFileName = 'ventas.xlsx';
    const batch = addProcessedResultToMultiSheetBatch(
      createEmptyMultiSheetBatch('batch:1'),
      firstResult,
    ).batch;
    const otherResult = standardResult('sheet:2', 'Hoja 2');
    otherResult.sourceFileName = 'compras.xlsx';

    const rejected = addProcessedResultToMultiSheetBatch(batch, otherResult);

    expect(batch.fileName).toBe('ventas.xlsx');
    expect(rejected.ok).toBe(false);
    expect(rejected.batch).toBe(batch);
    expect(rejected.errors).toEqual([
      'Archivo fuente distinto: el lote corresponde a "ventas.xlsx" y la hoja pertenece a "compras.xlsx".',
    ]);
  });

  it('does not block file compatibility when the new result has no source file name', () => {
    const firstResult = standardResult('sheet:1', 'Hoja 1');
    firstResult.sourceFileName = 'ventas.xlsx';
    const batch = addProcessedResultToMultiSheetBatch(
      createEmptyMultiSheetBatch('batch:1'),
      firstResult,
    ).batch;

    const added = addProcessedResultToMultiSheetBatch(
      batch,
      standardResult('sheet:2', 'Hoja 2'),
    );

    expect(added.ok).toBe(true);
    expect(added.batch.sheets).toHaveLength(2);
  });

  it('removes an existing sheet and preserves the schema while sheets remain', () => {
    const batch = batchWithTwoSheets();
    const schema = batch.outputSchema;

    const updated = removeSheetFromMultiSheetBatch(batch, 'sheet:1');

    expect(updated.sheets.map((sheet) => sheet.id)).toEqual(['sheet:2']);
    expect(updated.outputSchema).toBe(schema);
    expect(batch.sheets).toHaveLength(2);
  });

  it('clears the schema after removing the last sheet', () => {
    const batch = addProcessedResultToMultiSheetBatch(
      createEmptyMultiSheetBatch('batch:1'),
      standardResult('sheet:1', 'Hoja 1'),
    ).batch;

    expect(removeSheetFromMultiSheetBatch(batch, 'sheet:1')).toEqual({
      id: 'batch:1',
      outputSchema: null,
      sheets: [],
    });
  });

  it('derives ordered combine sources, output columns and positional mappings', () => {
    const batch = batchWithTwoSheets();

    const payload = createCombinePayloadFromMultiSheetBatch(batch);

    expect(payload.sources.map((source) => source.id)).toEqual(['sheet:1', 'sheet:2']);
    expect(payload.outputColumns).toEqual([
      { id: 'output:0', name: 'Código' },
      { id: 'output:1', name: 'Nombre' },
    ]);
    expect(payload.mappings).toEqual([
      { sourceId: 'sheet:1', outputColumnId: 'output:0', sourceColumnId: 'col:0' },
      { sourceId: 'sheet:1', outputColumnId: 'output:1', sourceColumnId: 'col:1' },
      { sourceId: 'sheet:2', outputColumnId: 'output:0', sourceColumnId: 'col:0' },
      { sourceId: 'sheet:2', outputColumnId: 'output:1', sourceColumnId: 'col:1' },
    ]);
  });

  it('uses null when an expected source column is unexpectedly missing', () => {
    const batch = batchWithTwoSheets();
    batch.sheets[1].source.columns.splice(1, 1);

    const payload = createCombinePayloadFromMultiSheetBatch(batch);

    expect(payload.mappings[3].sourceColumnId).toBeNull();
  });

  it('stores a combine source, not the processed result', () => {
    const added = addProcessedResultToMultiSheetBatch(
      createEmptyMultiSheetBatch('batch:1'),
      standardResult('sheet:1', 'Hoja 1'),
    );
    const stored = JSON.stringify(added.batch.sheets[0]);

    expect(stored).toContain('source');
    expect(stored).not.toContain('outputValues');
    expect(stored).not.toContain('fileBaseName');
    expect(stored).not.toContain('status":"included');
  });
});

function column(id: string, label: string, order: number, enabled = true) {
  return { id, label, order, enabled };
}

function result(
  columns: ProcessedExportResult['columns'],
  id = 'processed:1',
  sheetName = 'Hoja 1',
): ProcessedExportResult {
  return {
    id,
    fileBaseName: 'Libro',
    sheetName,
    columns,
    rows: [
      {
        status: 'included',
        outputValues: { code: 'SECRET' },
      },
    ],
  };
}

function standardResult(id: string, sheetName: string) {
  return result([
    column('code', 'Código', 0),
    column('name', 'Nombre', 1),
  ], id, sheetName);
}

function batchWithTwoSheets() {
  const first = addProcessedResultToMultiSheetBatch(
    createEmptyMultiSheetBatch('batch:1'),
    standardResult('sheet:1', 'Hoja 1'),
  ).batch;
  return addProcessedResultToMultiSheetBatch(
    first,
    standardResult('sheet:2', 'Hoja 2'),
  ).batch;
}
