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
});
