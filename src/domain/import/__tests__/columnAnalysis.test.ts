import { describe, expect, it } from 'vitest';
import type * as XLSX from 'xlsx';
import { analyzeSheetColumns } from '../columnAnalysis';

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
});
