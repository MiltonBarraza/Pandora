import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { buildCombineSourceFromRows, readCombineSource } from '../readCombineSource';

describe('buildCombineSourceFromRows', () => {
  it('detects headers from the first non-empty row and converts later rows', () => {
    const source = buildCombineSourceFromRows({
      id: 'source:0',
      fileName: 'datos.csv',
      rows: [[], ['', ''], ['Producto', 'Precio'], ['Pincel', '1200'], [], ['Rodillo', '3400']],
    });

    expect(source.columns.map((column) => column.name)).toEqual(['Producto', 'Precio']);
    expect(source.rows).toEqual([
      { id: 'row:0', values: { 'col:0': 'Pincel', 'col:1': '1200' } },
      { id: 'row:1', values: { 'col:0': 'Rodillo', 'col:1': '3400' } },
    ]);
  });

  it('uses column ids based on index', () => {
    const source = buildCombineSourceFromRows({
      id: 'source:0',
      fileName: 'datos.csv',
      rows: [['A', 'B', 'C'], ['1', '2', '3']],
    });

    expect(source.columns.map((column) => column.id)).toEqual(['col:0', 'col:1', 'col:2']);
    expect(source.columns.map((column) => column.index)).toEqual([0, 1, 2]);
  });

  it('uses fallback names for empty headers, including columns found only in data', () => {
    const source = buildCombineSourceFromRows({
      id: 'source:0',
      fileName: 'datos.csv',
      rows: [['Nombre', ''], ['Pincel', '1200', 'Extra']],
    });

    expect(source.columns.map((column) => column.name)).toEqual(['Nombre', 'Columna B', 'Columna C']);
  });

  it('keeps duplicate header names with different identities', () => {
    const source = buildCombineSourceFromRows({
      id: 'source:0',
      fileName: 'datos.csv',
      rows: [['Precio', 'Precio'], ['100', '200']],
    });

    expect(source.columns.map((column) => column.name)).toEqual(['Precio', 'Precio']);
    expect(source.columns.map((column) => column.id)).toEqual(['col:0', 'col:1']);
  });
});

describe('readCombineSource', () => {
  it('uses the first Excel sheet', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Producto', 'Precio'],
      ['Pincel', '1200'],
    ]), 'Primera');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Ignorada'],
      ['Otra fila'],
    ]), 'Segunda');
    const data = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const source = await readCombineSource(fileLike('ventas.xlsx', { data }), 4);

    expect(source.id).toBe('source:4');
    expect(source.sheetName).toBe('Primera');
    expect(source.columns.map((column) => column.name)).toEqual(['Producto', 'Precio']);
    expect(source.rows[0].values).toEqual({ 'col:0': 'Pincel', 'col:1': '1200' });
  });

  it('creates a valid CSV source', async () => {
    const source = await readCombineSource(fileLike('ventas.csv', {
      text: 'Producto,Precio\nPincel,1200\nRodillo,3400',
    }), 2);

    expect(source).toMatchObject({
      id: 'source:2',
      fileName: 'ventas.csv',
      sheetName: undefined,
    });
    expect(source.columns).toHaveLength(2);
    expect(source.rows).toHaveLength(2);
  });
});

function fileLike(name: string, contents: { text?: string; data?: ArrayBuffer }) {
  return {
    name,
    text: async () => contents.text ?? '',
    arrayBuffer: async () => contents.data ?? new ArrayBuffer(0),
  } as File;
}
