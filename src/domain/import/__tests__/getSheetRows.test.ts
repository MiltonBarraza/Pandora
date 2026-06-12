import { describe, expect, it } from 'vitest';
import type * as XLSX from 'xlsx';
import { analyzeSheetColumns } from '../columnAnalysis';
import { getSheetReadMetadata, getSheetRows } from '../getSheetRows';

describe('getSheetRows', () => {
  it('keeps the compatible row output unchanged for sheets without merges', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'Codigo' },
      B1: { t: 's', v: 'Producto' },
      A2: { t: 's', v: 'A-1' },
      B2: { t: 's', v: 'Removedor' },
      '!ref': 'A1:B2',
    });

    expect(getSheetRows(workbook, 'Hoja 1')).toEqual([
      ['Codigo', 'Producto'],
      ['A-1', 'Removedor'],
    ]);

    expect(getSheetReadMetadata(workbook, 'Hoja 1').merges).toEqual([]);
  });

  it('formats date cells as local day/month/year instead of SheetJS default m/d/yy text', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'Fecha' },
      A2: {
        t: 'd',
        v: new Date(Date.UTC(2024, 5, 1)),
        z: 'm/d/yy',
        w: '6/1/24',
      },
      '!ref': 'A1:A2',
    });

    expect(getSheetRows(workbook, 'Hoja 1')).toEqual([
      ['Fecha'],
      ['1/6/2024'],
    ]);

    expect(getSheetReadMetadata(workbook, 'Hoja 1').rows[1].cells[0]).toMatchObject({
      address: 'A2',
      formattedValue: '1/6/2024',
      value: '1/6/2024',
      cellType: 'd',
      numberFormat: 'm/d/yy',
      isMerged: false,
    });
  });

  it('formats numeric date cells as local day/month/year when cell format is a date format', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'Fecha' },
      A2: {
        t: 'n',
        v: 45444,
        z: 'm/d/yy',
        w: '6/1/24',
      },
      '!ref': 'A1:A2',
    });

    expect(getSheetRows(workbook, 'Hoja 1')[1][0]).toBe('1/6/2024');
  });

  it('preserves normal strings without trying to reinterpret date-looking text', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'Texto' },
      A2: { t: 's', v: '6/1/24', w: '6/1/24' },
      '!ref': 'A1:A2',
    });

    expect(getSheetRows(workbook, 'Hoja 1')).toEqual([
      ['Texto'],
      ['6/1/24'],
    ]);
  });

  it('preserves vertical merge metadata without filling compatible row values', () => {
    const workbook = workbookWithSheet({
      A13: { t: 's', v: 'REMOVEDOR EN GEL' },
      B13: { t: 's', v: 'COD-1' },
      B14: { t: 's', v: 'COD-2' },
      '!ref': 'A13:B14',
      '!merges': [
        {
          s: { r: 12, c: 0 },
          e: { r: 13, c: 0 },
        },
      ],
    });

    expect(getSheetRows(workbook, 'Hoja 1')).toEqual([
      ['REMOVEDOR EN GEL', 'COD-1'],
      ['', 'COD-2'],
    ]);

    const metadata = getSheetReadMetadata(workbook, 'Hoja 1');
    const mergedCell = metadata.rows[1].cells[0];

    expect(metadata.merges).toEqual([
      {
        startRow: 12,
        startColumn: 0,
        endRow: 13,
        endColumn: 0,
        originAddress: 'A13',
        originValue: 'REMOVEDOR EN GEL',
      },
    ]);
    expect(mergedCell).toMatchObject({
      address: 'A14',
      rowIndex: 13,
      columnIndex: 0,
      value: '',
      formattedValue: '',
      isMerged: true,
      mergeOriginAddress: 'A13',
      mergeOriginValue: 'REMOVEDOR EN GEL',
      mergeRange: metadata.merges[0],
    });
  });

  it('preserves horizontal merge metadata without treating it as vertical inheritance', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'Grupo' },
      A2: { t: 's', v: 'Producto' },
      '!ref': 'A1:C2',
      '!merges': [
        {
          s: { r: 0, c: 0 },
          e: { r: 0, c: 2 },
        },
      ],
    });

    const metadata = getSheetReadMetadata(workbook, 'Hoja 1');

    expect(metadata.rows[0].cells[2]).toMatchObject({
      address: 'C1',
      isMerged: true,
      mergeOriginAddress: 'A1',
      mergeOriginValue: 'Grupo',
      mergeRange: {
        startRow: 0,
        startColumn: 0,
        endRow: 0,
        endColumn: 2,
      },
    });
    expect(metadata.rows[1].cells[0]).toMatchObject({
      address: 'A2',
      isMerged: false,
      mergeOriginAddress: undefined,
    });
  });

  it('keeps empty rows in metadata while compatible rows continue to discard them', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'Codigo' },
      A3: { t: 's', v: 'A-1' },
      '!ref': 'A1:A3',
    });

    expect(getSheetRows(workbook, 'Hoja 1')).toEqual([['Codigo'], ['A-1']]);

    const metadata = getSheetReadMetadata(workbook, 'Hoja 1');
    expect(metadata.rows.map((row) => ({ originalRowIndex: row.originalRowIndex, isEmpty: row.isEmpty }))).toEqual([
      { originalRowIndex: 0, isEmpty: false },
      { originalRowIndex: 1, isEmpty: true },
      { originalRowIndex: 2, isEmpty: false },
    ]);
    expect(metadata.rows[1].cells[0]).toMatchObject({
      address: 'A2',
      rowIndex: 1,
      columnIndex: 0,
      formattedValue: '',
      isMerged: false,
    });
  });

  it('does not change column analysis for hidden or narrow columns', () => {
    const sheet: XLSX.WorkSheet = {
      A1: { t: 's', v: 'Codigo' },
      B1: { t: 's', v: 'Interna' },
      C1: { t: 's', v: 'Precio' },
      A2: { t: 's', v: 'A-1' },
      C2: { t: 'n', v: 10 },
      '!ref': 'A1:C2',
      '!cols': [{}, { hidden: true }, { wpx: 4 }],
    };
    const workbook = workbookWithSheet(sheet);
    const rows = getSheetRows(workbook, 'Hoja 1');

    expect(analyzeSheetColumns(sheet, rows, undefined, 0, 1).map((column) => column.ignoredReason)).toEqual([
      undefined,
      'hidden',
      'narrow',
    ]);
  });
});

function workbookWithSheet(sheet: XLSX.WorkSheet): XLSX.WorkBook {
  return {
    SheetNames: ['Hoja 1'],
    Sheets: {
      'Hoja 1': sheet,
    },
  };
}
