import type { DateInputFormat, DateInvalidFallback, DateOutputFormat, TransformStep } from '../../types/import';

export type KnownDateOutputFormat =
  | 'DD/MM/YYYY'
  | 'YYYY-MM-DD'
  | 'MM/DD/YYYY'
  | 'DD-MM-YYYY'
  | 'YYYY/MM/DD';

export type DateOutputFormatPart = 'DD' | 'MM' | 'AAAA';
export type DateOutputFormatSeparator = '/' | '-' | '.' | ' ';

export type DateOutputFormatPattern = {
  parts: [DateOutputFormatPart, DateOutputFormatPart, DateOutputFormatPart];
  separators: [DateOutputFormatSeparator, DateOutputFormatSeparator];
};

export type DateParts = {
  year: number;
  month: number;
  day: number;
};

export const defaultDateInputFormat: DateInputFormat = 'DD/MM/YYYY';
export const defaultDateOutputFormat: DateOutputFormat = 'YYYY-MM-DD';
export const defaultDateInvalidFallback: DateInvalidFallback = 'original';

export const supportedDateInputFormats: DateInputFormat[] = [
  'DD/MM/YYYY',
  'D/M/YYYY',
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'M/D/YYYY',
  'DD-MM-YYYY',
  'YYYY/MM/DD',
  'DD/MM/YY',
  'D/M/YY',
  'MM/DD/YY',
  'M/D/YY',
];

export const supportedDateOutputFormats: KnownDateOutputFormat[] = [
  'DD/MM/YYYY',
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'DD-MM-YYYY',
  'YYYY/MM/DD',
];

export function parseDateValue(value: unknown, inputFormat: DateInputFormat = defaultDateInputFormat): DateParts | null {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }

  const match = raw.match(getDateFormatPattern(inputFormat));
  if (!match?.groups) {
    return null;
  }

  const dateParts = {
    year: normalizeYear(match.groups.year),
    month: Number(match.groups.month),
    day: Number(match.groups.day),
  };

  return isValidDateParts(dateParts) ? dateParts : null;
}

export function formatDateValue(dateParts: DateParts, outputFormat: DateOutputFormat = defaultDateOutputFormat) {
  const year = String(dateParts.year).padStart(4, '0');
  const shortYear = year.slice(-2);
  const month = String(dateParts.month).padStart(2, '0');
  const day = String(dateParts.day).padStart(2, '0');
  const safeOutputFormat = isValidDateOutputFormat(outputFormat) ? outputFormat : defaultDateOutputFormat;

  return safeOutputFormat.replace(/AAAA|YYYY|YY|MM|DD/g, (token) => {
    if (token === 'AAAA' || token === 'YYYY') return year;
    if (token === 'YY') return shortYear;
    if (token === 'MM') return month;
    return day;
  });
}

export function isKnownDateOutputFormat(format: string): format is KnownDateOutputFormat {
  return supportedDateOutputFormats.includes(format as KnownDateOutputFormat);
}

export function isValidDateOutputFormat(format: string): format is DateOutputFormat {
  return getDateOutputFormatError(format) === '';
}

export function getDateOutputFormatError(format: string) {
  const raw = String(format ?? '');
  const value = raw.trim();

  if (!value) {
    return 'Usá DD para día, MM para mes y AAAA para año.';
  }

  if (/[dmy]/.test(value)) {
    return value.includes('m')
      ? 'Usá MM en mayúscula para mes.'
      : 'Usá DD, MM y AAAA en mayúsculas.';
  }

  if (!/^[ADMyY/\-. ]+$/.test(value)) {
    return 'Usá sólo DD, MM, AAAA y separadores /, -, . o espacio.';
  }

  const parsedPattern = parseDateOutputFormatPattern(value);
  if (!parsedPattern) {
    return 'Usá sólo tokens completos: DD, MM y AAAA.';
  }

  if (new Set(parsedPattern.parts).size !== 3) {
    return 'Usá DD, MM y AAAA una sola vez cada uno.';
  }

  return '';
}

export function parseDateOutputFormatPattern(format: string): DateOutputFormatPattern | null {
  const match = String(format ?? '').trim().match(/^(DD|MM|AAAA|YYYY)([\/\-. ])(DD|MM|AAAA|YYYY)([\/\-. ])(DD|MM|AAAA|YYYY)$/);
  if (!match) {
    return null;
  }

  return {
    parts: [
      normalizeDateOutputFormatPart(match[1]),
      normalizeDateOutputFormatPart(match[3]),
      normalizeDateOutputFormatPart(match[5]),
    ],
    separators: [match[2] as DateOutputFormatSeparator, match[4] as DateOutputFormatSeparator],
  };
}

export function buildDateOutputFormatFromPattern(pattern: DateOutputFormatPattern): DateOutputFormat {
  return `${pattern.parts[0]}${pattern.separators[0]}${pattern.parts[1]}${pattern.separators[1]}${pattern.parts[2]}`;
}

export function applyFormatDateStep(value: string, step: TransformStep) {
  const inputFormat = step.dateInputFormat ?? defaultDateInputFormat;
  const outputFormat = step.dateOutputFormat ?? defaultDateOutputFormat;
  const dateParts = parseDateValue(value, inputFormat)
    ?? (shouldParseFixedIsoDate(value, step) ? parseDateValue(value, 'YYYY-MM-DD') : null);

  if (dateParts) {
    return formatDateValue(dateParts, outputFormat);
  }

  return applyInvalidDateFallback(value, step);
}

function shouldParseFixedIsoDate(value: string, step: TransformStep) {
  return step.source?.type === 'fixedText' && Boolean(parseDateValue(value, 'YYYY-MM-DD'));
}

function applyInvalidDateFallback(value: string, step: TransformStep) {
  const fallback = step.dateInvalidFallback ?? defaultDateInvalidFallback;

  if (fallback === 'empty') {
    return '';
  }

  if (fallback === 'fixedText') {
    return step.dateInvalidFallbackText ?? '';
  }

  return value;
}

function getDateFormatPattern(format: DateInputFormat) {
  if (format === 'DD/MM/YYYY' || format === 'D/M/YYYY') {
    return /^(?<day>\d{1,2})\/(?<month>\d{1,2})\/(?<year>\d{4})$/;
  }

  if (format === 'MM/DD/YYYY' || format === 'M/D/YYYY') {
    return /^(?<month>\d{1,2})\/(?<day>\d{1,2})\/(?<year>\d{4})$/;
  }

  if (format === 'DD/MM/YY' || format === 'D/M/YY') {
    return /^(?<day>\d{1,2})\/(?<month>\d{1,2})\/(?<year>\d{2})$/;
  }

  if (format === 'MM/DD/YY' || format === 'M/D/YY') {
    return /^(?<month>\d{1,2})\/(?<day>\d{1,2})\/(?<year>\d{2})$/;
  }

  if (format === 'DD-MM-YYYY') {
    return /^(?<day>\d{2})-(?<month>\d{2})-(?<year>\d{4})$/;
  }

  if (format === 'YYYY/MM/DD') {
    return /^(?<year>\d{4})\/(?<month>\d{2})\/(?<day>\d{2})$/;
  }

  return /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/;
}

function normalizeYear(value: string) {
  if (value.length !== 2) {
    return Number(value);
  }

  const year = Number(value);
  return year <= 68 ? 2000 + year : 1900 + year;
}

function isValidDateParts({ year, month, day }: DateParts) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (year < 1 || month < 1 || month > 12) {
    return false;
  }

  return day >= 1 && day <= getDaysInMonth(year, month);
}

function getDaysInMonth(year: number, month: number) {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function normalizeDateOutputFormatPart(part: string): DateOutputFormatPart {
  return part === 'YYYY' || part === 'AAAA' ? 'AAAA' : part as DateOutputFormatPart;
}

function isLeapYear(year: number) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}
