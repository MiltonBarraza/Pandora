import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import {
  buildCombineSourceFromRows,
  createCombineSourceFromWorkbookSheet,
  readCombineSource,
  readLoadedCombineSource,
} from '../readCombineSource';

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

  it('keeps all Excel sheet names and the workbook in memory', async () => {
    const { workbook, data } = workbookWithTwoSheets();

    const loaded = await readLoadedCombineSource(fileLike('ventas.xlsx', { data }), 7);

    expect(loaded.kind).toBe('excel');
    if (loaded.kind !== 'excel') {
      throw new Error('Se esperaba un archivo Excel.');
    }
    expect(loaded.sheetNames).toEqual(['Primera', 'Segunda']);
    expect(loaded.workbook.SheetNames).toEqual(workbook.SheetNames);
    expect(loaded.source.sheetName).toBe('Primera');
    expect(loaded.source.columns.map((column) => column.name)).toEqual(['Producto', 'Precio']);
  });

  it('builds a source from a specific workbook sheet', () => {
    const { workbook } = workbookWithTwoSheets();

    const source = createCombineSourceFromWorkbookSheet({
      workbook,
      fileName: 'ventas.xlsx',
      sourceId: 'source:3',
      sheetName: 'Segunda',
    });

    expect(source).toMatchObject({
      id: 'source:3',
      fileName: 'ventas.xlsx',
      sheetName: 'Segunda',
    });
    expect(source.columns.map((column) => column.name)).toEqual(['Cliente', 'Ciudad']);
    expect(source.rows).toEqual([
      { id: 'row:0', values: { 'col:0': 'Ana', 'col:1': 'Córdoba' } },
    ]);
  });

  it('changes columns and rows when building from another sheet', () => {
    const { workbook } = workbookWithTwoSheets();
    const first = createCombineSourceFromWorkbookSheet({
      workbook,
      fileName: 'ventas.xlsx',
      sourceId: 'source:0',
      sheetName: 'Primera',
    });
    const second = createCombineSourceFromWorkbookSheet({
      workbook,
      fileName: 'ventas.xlsx',
      sourceId: 'source:0',
      sheetName: 'Segunda',
    });

    expect(second.columns).not.toEqual(first.columns);
    expect(second.rows).not.toEqual(first.rows);
  });

  it('uses fallback column names for empty headers in a workbook sheet', () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['', 'Precio', ''],
      ['Pincel', '1200', 'Activo'],
    ]), 'Datos');

    const source = createCombineSourceFromWorkbookSheet({
      workbook,
      fileName: 'ventas.xlsx',
      sourceId: 'source:0',
      sheetName: 'Datos',
    });

    expect(source.columns.map((column) => column.name)).toEqual(['Columna A', 'Precio', 'Columna C']);
  });

  it('loads CSV without sheet names or workbook', async () => {
    const loaded = await readLoadedCombineSource(fileLike('ventas.csv', {
      text: 'Producto,Precio\nPincel,1200',
    }), 2);

    expect(loaded.kind).toBe('csv');
    expect('sheetNames' in loaded).toBe(false);
    expect('workbook' in loaded).toBe(false);
    expect(loaded.source.sheetName).toBeUndefined();
  });
});

function workbookWithTwoSheets() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Producto', 'Precio'],
    ['Pincel', '1200'],
  ]), 'Primera');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Cliente', 'Ciudad'],
    ['Ana', 'Córdoba'],
  ]), 'Segunda');
  const data = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return { workbook, data };
}

function fileLike(name: string, contents: { text?: string; data?: ArrayBuffer }) {
  return {
    name,
    text: async () => contents.text ?? '',
    arrayBuffer: async () => contents.data ?? new ArrayBuffer(0),
  } as File;
}
