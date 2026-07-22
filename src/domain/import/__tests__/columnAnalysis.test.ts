import { describe, expect, it } from 'vitest';
import type * as XLSX from 'xlsx';
import { analyzeSheetColumns, getColumnSampleValues } from '../columnAnalysis';

describe('analyzeSheetColumns', () => {
  it('keeps multiple automatic ignored reasons for hidden empty columns', () => {
    const sheet = {
      '!ref': 'A1:A3',
      '!cols': [{ hidden: true }],
    } as XLSX.WorkSheet;

    const [column] = analyzeSheetColumns(sheet, [['Codigo'], [''], ['']], undefined, 0, 1);

    expect(column).toMatchObject({
      isHidden: true,
      isEmpty: true,
      ignored: true,
      ignoredReason: 'hidden',
      ignoredReasons: ['hidden', 'empty'],
      autoIgnoredReason: 'hidden',
      autoIgnoredReasons: ['hidden', 'empty'],
    });
  });

  it('collects up to ten sample values for column examples', () => {
    const rows = Array.from({ length: 12 }, (_, index) => [`Valor ${index + 1}`]);

    expect(getColumnSampleValues(rows, 0)).toEqual([
      'Valor 1',
      'Valor 2',
      'Valor 3',
      'Valor 4',
      'Valor 5',
      'Valor 6',
      'Valor 7',
      'Valor 8',
      'Valor 9',
      'Valor 10',
    ]);
  });

  it('uses shared cell data semantics for empty detection and samples', () => {
    const [column] = analyzeSheetColumns(undefined, [
      [null],
      [undefined],
      ['   '],
      [0],
      [false],
      [new Date('2026-06-12')],
      [' dato '],
    ]);

    expect(column.nonEmptyCount).toBe(4);
    expect(column.isEmpty).toBe(false);
    expect(column.sampleValues).toEqual([
      '0',
      'false',
      String(new Date('2026-06-12')),
      'dato',
    ]);
  });

  it('uses effective row width instead of an inflated worksheet ref', () => {
    const sheet = { '!ref': 'A1:XET109' } as XLSX.WorkSheet;

    const columns = analyzeSheetColumns(sheet, [['A', '', 'C']]);

    expect(columns).toHaveLength(3);
  });
});
