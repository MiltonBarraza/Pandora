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
      rangeMetadata: expectedRangeMetadata('A1:A3'),
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
      rangeMetadata: expectedRangeMetadata('A1:A5'),
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

  it('trims an inflated trailing range based on useful cells', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'Codigo' },
      M2: { t: 's', v: 'M-1' },
      XET109: { t: 'z', s: { fill: { fgColor: { rgb: 'FFFFFF' } } } },
      '!ref': 'A1:XET109',
    });

    const result = getSheetRowsWithMetadata(workbook, 'Hoja 1');

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toHaveLength(13);
    expect(result.rows[1][12]).toBe('M-1');
    expect(result.rangeMetadata).toEqual({
      originalRef: 'A1:XET109',
      effectiveRef: 'A1:M2',
      wasTrimmed: true,
      shouldShowTrimWarning: true,
      ignoredTrailingColumns: 16361,
      ignoredTrailingRows: 107,
    });
  });

  it('preserves empty columns between useful cells', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'A' },
      B1: { t: 's', v: 'B' },
      F1: { t: 's', v: 'F' },
      XET1: { t: 'z' },
      '!ref': 'A1:XET1',
    });

    const result = getSheetRowsWithMetadata(workbook, 'Hoja 1');

    expect(result.rows[0]).toEqual(['A', 'B', '', '', '', 'F']);
    expect(result.rangeMetadata?.effectiveRef).toBe('A1:F1');
  });

  it('keeps a real value in a distant column', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'A' },
      XET1: { t: 'n', v: 42 },
      '!ref': 'A1:XET1',
    });

    const result = getSheetRowsWithMetadata(workbook, 'Hoja 1');

    expect(result.rows[0][16373]).toBe('42');
    expect(result.rangeMetadata).toEqual(expectedRangeMetadata('A1:XET1'));
  });

  it('treats formulas without cached values as useful cells', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'A' },
      F2: { t: 'n', f: 'SUM(A1:A1)' },
      XET10: { t: 'z' },
      '!ref': 'A1:XET10',
    });

    const result = getSheetRowsWithMetadata(workbook, 'Hoja 1');

    expect(result.rangeMetadata?.effectiveRef).toBe('A1:F2');
    expect(result.rowMetadata[result.rowMetadata.length - 1]?.excelRowNumber).toBe(2);
  });

  it('collapses a range containing only formatted empty cells', () => {
    const workbook = workbookWithSheet({
      XET109: { t: 'z', s: { font: { bold: true } } },
      '!ref': 'XET109:XET109',
    });

    const result = getSheetRowsWithMetadata(workbook, 'Hoja 1');

    expect(result.rows).toEqual([]);
    expect(result.rangeMetadata).toMatchObject({
      effectiveRef: 'A1',
      wasTrimmed: true,
      shouldShowTrimWarning: true,
    });
  });

  it('keeps minor trimming silent while preserving technical metadata', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'A' },
      M100: { t: 's', v: 'M' },
      P100: { t: 'z' },
      '!ref': 'A1:P100',
    });

    const metadata = getSheetRowsWithMetadata(workbook, 'Hoja 1').rangeMetadata;

    expect(metadata).toMatchObject({
      effectiveRef: 'A1:M100',
      wasTrimmed: true,
      shouldShowTrimWarning: false,
      ignoredTrailingColumns: 3,
      ignoredTrailingRows: 0,
    });
  });

  it('shows the warning for a large vertical trim', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'A' },
      M100: { t: 's', v: 'M' },
      M600: { t: 'z' },
      '!ref': 'A1:M600',
    });

    expect(getSheetRowsWithMetadata(workbook, 'Hoja 1').rangeMetadata).toMatchObject({
      effectiveRef: 'A1:M100',
      wasTrimmed: true,
      shouldShowTrimWarning: true,
      ignoredTrailingRows: 500,
    });
  });

  it('shows the warning when original area is five times larger after a relevant trim', () => {
    const workbook = workbookWithSheet({
      A1: { t: 's', v: 'A' },
      M100: { t: 's', v: 'M' },
      W500: { t: 'z' },
      '!ref': 'A1:W500',
    });

    expect(getSheetRowsWithMetadata(workbook, 'Hoja 1').rangeMetadata).toMatchObject({
      effectiveRef: 'A1:M100',
      wasTrimmed: true,
      shouldShowTrimWarning: true,
      ignoredTrailingColumns: 10,
      ignoredTrailingRows: 400,
    });
  });
});

function expectedRangeMetadata(ref: string) {
  return {
    originalRef: ref,
    effectiveRef: ref,
    wasTrimmed: false,
    shouldShowTrimWarning: false,
    ignoredTrailingColumns: 0,
    ignoredTrailingRows: 0,
  };
}

function workbookWithSheet(sheet: XLSX.WorkSheet): XLSX.WorkBook {
  return {
    SheetNames: ['Hoja 1'],
    Sheets: {
      'Hoja 1': sheet,
    },
  };
}
