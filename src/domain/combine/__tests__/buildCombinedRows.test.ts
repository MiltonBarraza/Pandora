import { describe, expect, it } from 'vitest';
import type { CombineColumnMapping, CombineOutputColumn, CombineSource } from '../../../types/combine';
import { buildCombinedRows } from '../buildCombinedRows';

const outputColumns: CombineOutputColumn[] = [
  { id: 'product', name: 'Producto' },
  { id: 'price', name: 'Precio' },
  { id: 'notes', name: 'Notas' },
];

const sources: CombineSource[] = [
  {
    id: 'source-a',
    fileName: 'enero.xlsx',
    sheetName: 'Ventas',
    columns: [
      { id: 'a-description', name: 'Descripción', index: 0 },
      { id: 'a-amount', name: 'Importe', index: 1 },
    ],
    rows: [
      { id: 'a-row-1', values: { 'a-description': 'Pincel', 'a-amount': '1200' } },
      { id: 'a-row-2', values: { 'a-description': 'Rodillo', 'a-amount': '3400' } },
    ],
  },
  {
    id: 'source-b',
    fileName: 'febrero.csv',
    columns: [
      { id: 'b-name', name: 'Nombre', index: 0 },
      { id: 'b-price', name: 'Precio final', index: 1 },
    ],
    rows: [
      { id: 'b-row-1', values: { 'b-name': 'Lija', 'b-price': '500' } },
    ],
  },
];

const mappings: CombineColumnMapping[] = [
  { sourceId: 'source-a', outputColumnId: 'product', sourceColumnId: 'a-description' },
  { sourceId: 'source-a', outputColumnId: 'price', sourceColumnId: 'a-amount' },
  { sourceId: 'source-a', outputColumnId: 'notes', sourceColumnId: null },
  { sourceId: 'source-b', outputColumnId: 'product', sourceColumnId: 'b-name' },
  { sourceId: 'source-b', outputColumnId: 'price', sourceColumnId: 'b-price' },
];

describe('buildCombinedRows', () => {
  it('combines sources and preserves source and row order', () => {
    const result = buildCombinedRows({ sources, outputColumns, mappings });

    expect(result.map((row) => row.id)).toEqual([
      'source-a:a-row-1',
      'source-a:a-row-2',
      'source-b:b-row-1',
    ]);
    expect(result.map((row) => row.values)).toEqual([
      { product: 'Pincel', price: '1200', notes: '' },
      { product: 'Rodillo', price: '3400', notes: '' },
      { product: 'Lija', price: '500', notes: '' },
    ]);
  });

  it('copies source provenance into each combined row', () => {
    const result = buildCombinedRows({ sources, outputColumns, mappings });

    expect(result[0]).toMatchObject({
      sourceId: 'source-a',
      sourceFileName: 'enero.xlsx',
      sourceSheetName: 'Ventas',
    });
    expect(result[2]).toMatchObject({
      sourceId: 'source-b',
      sourceFileName: 'febrero.csv',
      sourceSheetName: undefined,
    });
  });

  it('uses empty values for null, missing or foreign mappings', () => {
    const result = buildCombinedRows({
      sources: [sources[0]],
      outputColumns,
      mappings: [
        { sourceId: 'source-a', outputColumnId: 'product', sourceColumnId: 'b-name' },
        { sourceId: 'source-a', outputColumnId: 'price', sourceColumnId: null },
      ],
    });

    expect(result[0].values).toEqual({ product: '', price: '', notes: '' });
  });

  it('returns no rows when sources are empty', () => {
    expect(buildCombinedRows({ sources: [], outputColumns, mappings })).toEqual([]);
  });

  it('does not mutate input models', () => {
    const sourcesSnapshot = structuredClone(sources);
    const mappingsSnapshot = structuredClone(mappings);

    buildCombinedRows({ sources, outputColumns, mappings });

    expect(sources).toEqual(sourcesSnapshot);
    expect(mappings).toEqual(mappingsSnapshot);
  });
});
