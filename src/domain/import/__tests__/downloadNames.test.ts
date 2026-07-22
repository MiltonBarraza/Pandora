import { describe, expect, it } from 'vitest';
import type { FileNameSettings } from '../../../types/import';
import { buildAuditFileBaseName, buildOutputFileBaseName, formatLocalDatePart, sanitizeNamePart } from '../downloadNames';

const baseSettings: FileNameSettings = {
  mode: 'default',
  customName: '',
  baseText: 'Archivo preparado',
  includeBaseText: true,
  includeOriginalName: false,
  includeSheetName: false,
  includeDate: false,
};

describe('downloadNames', () => {
  it('formats local date and local date-time for file names', () => {
    const date = new Date(2026, 5, 8, 15, 30);

    expect(formatLocalDatePart(date)).toBe('2026-06-08');
    expect(formatLocalDatePart(date, true)).toBe('2026-06-08_15-30');
  });

  it('builds an output name with local date only', () => {
    expect(
      buildOutputFileBaseName({
        settings: { ...baseSettings, includeDate: true },
        sourceFileName: 'lista.xlsx',
        sheetName: 'Hoja 1',
        now: new Date(2026, 5, 8, 15, 30),
      }),
    ).toBe('Archivo preparado - 2026-06-08');
  });

  it('builds an output name with local date and time without Windows-invalid separators', () => {
    const name = buildOutputFileBaseName({
      settings: { ...baseSettings, includeDate: true, includeTime: true },
      sourceFileName: 'lista.xlsx',
      sheetName: 'Hoja 1',
      now: new Date(2026, 5, 8, 15, 30),
    });

    expect(name).toBe('Archivo preparado - 2026-06-08_15-30');
    expect(name).not.toContain(':');
  });

  it('keeps custom names independent from date and time options', () => {
    expect(
      buildOutputFileBaseName({
        settings: {
          ...baseSettings,
          mode: 'custom',
          customName: 'Lista final.xlsx',
          includeDate: true,
          includeTime: true,
        },
        sourceFileName: 'origen.xlsx',
        sheetName: 'Hoja 1',
        now: new Date(2026, 5, 8, 15, 30),
      }),
    ).toBe('Lista final');
  });

  it('derives the audit name from the output base name', () => {
    expect(buildAuditFileBaseName('Lista final.csv')).toBe('Auditoría - Lista final');
  });

  it('sanitizes invalid file name characters', () => {
    expect(sanitizeNamePart(' Lista: final / junio* ')).toBe('Lista- final - junio');
  });
});
