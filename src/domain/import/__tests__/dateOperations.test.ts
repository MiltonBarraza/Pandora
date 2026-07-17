import { describe, expect, it } from 'vitest';
import { applyFormatDateStep, formatDateValue, getDateOutputFormatDisplayValue, getDateOutputFormatError, isValidDateOutputFormat, parseDateValue } from '../dateOperations';

describe('dateOperations', () => {
  it('parses supported input formats without guessing ambiguous dates', () => {
    expect(parseDateValue('01/06/2024', 'DD/MM/YYYY')).toEqual({ year: 2024, month: 6, day: 1 });
    expect(parseDateValue('1/6/2024', 'DD/MM/YYYY')).toEqual({ year: 2024, month: 6, day: 1 });
    expect(parseDateValue('1/6/2024', 'D/M/YYYY')).toEqual({ year: 2024, month: 6, day: 1 });
    expect(parseDateValue('2024-06-01', 'YYYY-MM-DD')).toEqual({ year: 2024, month: 6, day: 1 });
    expect(parseDateValue('06/01/2024', 'MM/DD/YYYY')).toEqual({ year: 2024, month: 6, day: 1 });
    expect(parseDateValue('6/1/2024', 'MM/DD/YYYY')).toEqual({ year: 2024, month: 6, day: 1 });
    expect(parseDateValue('6/1/2024', 'M/D/YYYY')).toEqual({ year: 2024, month: 6, day: 1 });
    expect(parseDateValue('01-06-2024', 'DD-MM-YYYY')).toEqual({ year: 2024, month: 6, day: 1 });
    expect(parseDateValue('2024/06/01', 'YYYY/MM/DD')).toEqual({ year: 2024, month: 6, day: 1 });
    expect(parseDateValue('01/06/2024', 'YYYY-MM-DD')).toBeNull();
  });

  it('parses two digit years using a spreadsheet-like pivot year', () => {
    expect(parseDateValue('6/1/24', 'MM/DD/YY')).toEqual({ year: 2024, month: 6, day: 1 });
    expect(parseDateValue('6/2/24', 'M/D/YY')).toEqual({ year: 2024, month: 6, day: 2 });
    expect(parseDateValue('29/02/24', 'DD/MM/YY')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseDateValue('1/6/69', 'D/M/YY')).toEqual({ year: 1969, month: 6, day: 1 });
  });

  it('rejects invalid calendar dates', () => {
    expect(parseDateValue('31/02/2024', 'DD/MM/YYYY')).toBeNull();
    expect(parseDateValue('13/13/2024', 'DD/MM/YYYY')).toBeNull();
    expect(parseDateValue('texto cualquiera', 'DD/MM/YYYY')).toBeNull();
    expect(parseDateValue('00/01/2024', 'DD/MM/YYYY')).toBeNull();
    expect(parseDateValue('01/13/2024', 'DD/MM/YYYY')).toBeNull();
  });

  it('validates leap years', () => {
    expect(parseDateValue('29/02/2024', 'DD/MM/YYYY')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseDateValue('29/02/24', 'DD/MM/YY')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseDateValue('29/02/2023', 'DD/MM/YYYY')).toBeNull();
  });

  it('formats date parts to every supported output format', () => {
    const dateParts = { year: 2024, month: 6, day: 1 };

    expect(formatDateValue(dateParts, 'DD/MM/YYYY')).toBe('01/06/2024');
    expect(formatDateValue(dateParts, 'YYYY-MM-DD')).toBe('2024-06-01');
    expect(formatDateValue(dateParts, 'MM/DD/YYYY')).toBe('06/01/2024');
    expect(formatDateValue(dateParts, 'DD-MM-YYYY')).toBe('01-06-2024');
    expect(formatDateValue(dateParts, 'YYYY/MM/DD')).toBe('2024/06/01');
  });

  it('formats date parts with custom output parts and separators', () => {
    const dateParts = { year: 2025, month: 12, day: 31 };

    expect(formatDateValue(dateParts, 'MM-DD-YYYY')).toBe('12-31-2025');
    expect(formatDateValue(dateParts, 'MM-DD-AAAA')).toBe('12-31-2025');
    expect(formatDateValue({ year: 2026, month: 7, day: 5 }, 'D/M/AA')).toBe('5/7/26');
    expect(formatDateValue(dateParts, 'DD.MM.YYYY')).toBe('31.12.2025');
    expect(formatDateValue(dateParts, 'YYYY/MM/DD')).toBe('2025/12/31');
    expect(formatDateValue(dateParts, 'DD MM YYYY')).toBe('31 12 2025');
    expect(formatDateValue({ year: 2026, month: 7, day: 5 }, 'MMMM DD AAAA')).toBe('julio 05 2026');
    expect(formatDateValue({ year: 2026, month: 7, day: 5 }, 'MMM DD AAAA')).toBe('jul 05 2026');
    expect(formatDateValue({ year: 2026, month: 7, day: 5 }, 'dddd DD/MM/AAAA')).toBe('domingo 05/07/2026');
  });

  it('validates custom output formats without accepting unknown parts', () => {
    expect(isValidDateOutputFormat('MM-DD-YYYY')).toBe(true);
    expect(isValidDateOutputFormat('MM-DD-AAAA')).toBe(true);
    expect(isValidDateOutputFormat('D/M/AA')).toBe(true);
    expect(isValidDateOutputFormat('AAAA')).toBe(true);
    expect(isValidDateOutputFormat('DD.MM.YYYY')).toBe(true);
    expect(isValidDateOutputFormat('DD MM YYYY')).toBe(true);
    expect(isValidDateOutputFormat('mm-dd-yyyy')).toBe(false);
    expect(isValidDateOutputFormat('MMMM DD AAAA')).toBe(true);
    expect(isValidDateOutputFormat('MMM DD AAAA')).toBe(true);
    expect(isValidDateOutputFormat('dddd DD/MM/AAAA')).toBe(true);
    expect(isValidDateOutputFormat('HH:mm:ss')).toBe(false);
    expect(isValidDateOutputFormat('hola')).toBe(false);
    expect(isValidDateOutputFormat('YYYYY-MM-DD')).toBe(false);
    expect(isValidDateOutputFormat('DD_MM_YYYY')).toBe(false);
    expect(getDateOutputFormatError('mm-dd-yyyy')).toBe('Usá MM o M en mayúscula para mes.');
    expect(getDateOutputFormatError('MMMMM DD AAAA')).toBe('El formato tiene partes que la app no reconoce. Revisá los formatos disponibles.');
  });

  it('converts legacy year tokens to Spanish display tokens', () => {
    expect(getDateOutputFormatDisplayValue('YYYY-MM-DD')).toBe('AAAA-MM-DD');
    expect(getDateOutputFormatDisplayValue('D/M/YY')).toBe('D/M/AA');
  });

  it('falls back to the safe output format for invalid output formats', () => {
    expect(formatDateValue({ year: 2025, month: 12, day: 31 }, 'mm-dd-yyyy')).toBe('2025-12-31');
  });

  it('applies empty fallback for invalid dates', () => {
    expect(applyFormatDateStep('31/02/2024', {
      id: 'date',
      type: 'formatDate',
      dateInputFormat: 'DD/MM/YYYY',
      dateOutputFormat: 'YYYY-MM-DD',
      dateInvalidFallback: 'empty',
    })).toBe('');
  });

  it('applies original fallback for invalid dates by default', () => {
    expect(applyFormatDateStep('31/02/2024', {
      id: 'date',
      type: 'formatDate',
      dateInputFormat: 'DD/MM/YYYY',
      dateOutputFormat: 'YYYY-MM-DD',
    })).toBe('31/02/2024');
  });

  it('applies fixed text fallback for invalid dates', () => {
    expect(applyFormatDateStep('31/02/2024', {
      id: 'date',
      type: 'formatDate',
      dateInputFormat: 'DD/MM/YYYY',
      dateOutputFormat: 'YYYY-MM-DD',
      dateInvalidFallback: 'fixedText',
      dateInvalidFallbackText: 'SIN FECHA',
    })).toBe('SIN FECHA');
  });

  it('formats an ISO fixed date source with a custom output format', () => {
    expect(applyFormatDateStep('2025-12-31', {
      id: 'date',
      type: 'formatDate',
      source: { type: 'fixedText', value: '2025-12-31' },
      dateInputFormat: 'DD/MM/YYYY',
      dateOutputFormat: 'DD.MM.YYYY',
    })).toBe('31.12.2025');
  });
});
