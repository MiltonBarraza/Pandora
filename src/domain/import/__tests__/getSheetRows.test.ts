import { describe, expect, it } from 'vitest';
import type * as XLSX from 'xlsx';
import { getSheetRows } from '../getSheetRows';

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
});

function workbookWithSheet(sheet: XLSX.WorkSheet): XLSX.WorkBook {
  return {
    SheetNames: ['Hoja 1'],
    Sheets: {
      'Hoja 1': sheet,
    },
  };
}
