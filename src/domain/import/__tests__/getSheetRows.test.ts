import { describe, expect, it } from 'vitest';
import type * as XLSX from 'xlsx';
import { getSheetRows, getSheetRowsWithMetadata } from '../getSheetRows';

describe('getSheetRows', () => {
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

  it('keeps metadata aligned with rows when there are no empty rows', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'Codigo' },
      A2: { t: 's', v: 'A-1' },
      A3: { t: 's', v: 'A-2' },
      '!ref': 'A1:A3',
    });

    expect(getSheetRowsWithMetadata(workbook, 'Hoja 1')).toEqual({
      rows: [
        ['Codigo'],
        ['A-1'],
        ['A-2'],
      ],
      rowMetadata: [
        { internalRowIndex: 0, excelRowNumber: 1 },
        { internalRowIndex: 1, excelRowNumber: 2 },
        { internalRowIndex: 2, excelRowNumber: 3 },
      ],
    });
  });

  it('keeps real Excel row numbers when empty rows are discarded', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'Codigo' },
      A3: { t: 's', v: 'A-1' },
      A5: { t: 's', v: 'A-2' },
      '!ref': 'A1:A5',
    });

    expect(getSheetRowsWithMetadata(workbook, 'Hoja 1')).toEqual({
      rows: [
        ['Codigo'],
        ['A-1'],
        ['A-2'],
      ],
      rowMetadata: [
        { internalRowIndex: 0, excelRowNumber: 1 },
        { internalRowIndex: 1, excelRowNumber: 3 },
        { internalRowIndex: 2, excelRowNumber: 5 },
      ],
    });
  });

  it('keeps getSheetRows compatible by returning rows only', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'Codigo' },
      A3: { t: 's', v: 'A-1' },
      '!ref': 'A1:A3',
    });

    expect(getSheetRows(workbook, 'Hoja 1')).toEqual([
      ['Codigo'],
      ['A-1'],
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
